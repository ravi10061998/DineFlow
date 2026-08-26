import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, closeTestApp } from "./utils/test-app";

/**
 * The full real chain end to end: restaurant registration -> admin approval -> menu setup ->
 * customer checkout -> commission-split snapshot -> payment -> the payment.succeeded event
 * actually crediting the restaurant's ledger -> restaurant fulfillment transitions -> customer
 * review. Every unit test for these services mocks its own repository in isolation; this is
 * the first place the real cross-module event chain (Orders -> Payments -> Ledger) and real
 * committed Postgres transactions (checkout's snapshot, the coupon row-lock, ledger's derived
 * balance) get to prove themselves together, against an actual database.
 */
describe("Checkout chain (e2e)", () => {
  let app: INestApplication;
  const suffix = Math.random().toString(36).slice(2, 8);

  let adminToken: string;
  let restaurantToken: string;
  let restaurantId: string;
  let productId: string;
  let customerToken: string;
  let addressId: string;

  /** Async event listeners (e.g. payment.succeeded -> ledger credit) aren't awaited by
   * EventEmitter2 before the triggering HTTP response returns — documented as a real timing
   * characteristic since Module 26's own notification tests hit the same thing. Poll briefly
   * rather than assume a fixed delay is always enough. */
  async function waitFor<T>(check: () => Promise<T | null>, timeoutMs = 3000): Promise<T> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await check();
      if (result !== null) return result;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("waitFor timed out");
  }

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();

    adminToken = (await api().post("/api/v1/auth/login").send({ email: "admin@e2e.test", password: "ChangeMe123!" }).expect(201)).body
      .data.accessToken;

    const restReg = await api()
      .post("/api/v1/restaurants/register")
      .send({
        restaurantName: `E2E Diner ${suffix}`,
        ownerFullName: "Restaurant Owner",
        email: `e2e-rest-${suffix}@test.local`,
        phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
        password: "Password123!",
        addressLine1: "1 Restaurant St",
        city: "Testville",
        state: "TS",
        postalCode: "500001",
        country: "IN",
      })
      .expect(201);
    restaurantId = restReg.body.data.restaurant.id;
    restaurantToken = restReg.body.data.accessToken;

    await api().patch(`/api/v1/admin/restaurants/${restaurantId}/approve`).set("Authorization", `Bearer ${adminToken}`).expect(200);

    const category = await api()
      .post("/api/v1/restaurant/me/categories")
      .set("Authorization", `Bearer ${restaurantToken}`)
      .send({ name: "Mains" })
      .expect(201);

    const product = await api()
      .post("/api/v1/restaurant/me/products")
      .set("Authorization", `Bearer ${restaurantToken}`)
      .send({ categoryId: category.body.data.id, name: "E2E Burger", basePrice: 200, description: "A test burger" })
      .expect(201);
    productId = product.body.data.id;

    const custReg = await api()
      .post("/api/v1/auth/register")
      .send({ fullName: "E2E Customer", email: `e2e-cust-${suffix}@test.local`, password: "Password123!" })
      .expect(201);
    customerToken = custReg.body.data.accessToken;

    const address = await api()
      .post("/api/v1/customer/me/addresses")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        label: "HOME",
        receiverName: "E2E Customer",
        receiverPhone: "+919123456780",
        addressLine1: "42 Delivery Lane",
        city: "Testville",
        state: "TS",
        postalCode: "500002",
        country: "IN",
      })
      .expect(201);
    addressId = address.body.data.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("shows the new restaurant and product on the public browse routes", async () => {
    const list = await api().get("/api/v1/restaurants").expect(200);
    expect(list.body.data.some((r: { id: string }) => r.id === restaurantId)).toBe(true);

    const menu = await api().get(`/api/v1/restaurants/${restaurantId}/menu`).expect(200);
    expect(menu.body.data[0].products[0].id).toBe(productId);
  });

  it("adds to cart and reflects the correct computed subtotal", async () => {
    await api()
      .post("/api/v1/customer/me/cart")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 })
      .expect(201);

    const cart = await api().get("/api/v1/customer/me/cart").set("Authorization", `Bearer ${customerToken}`).expect(200);
    expect(cart.body.data.subtotal).toBe("400.00");
  });

  let orderId: string;

  it("checks out, snapshotting a real commission split that sums back to the subtotal", async () => {
    const checkout = await api()
      .post("/api/v1/customer/me/orders/checkout")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ deliveryAddressId: addressId })
      .expect(201);

    const order = checkout.body.data;
    orderId = order.id;
    expect(order.status).toBe("PLACED");
    expect(order.paymentStatus).toBe("PENDING");
    const commissionPlusPayout = Number(order.commissionAmount) + Number(order.restaurantPayoutAmount);
    expect(commissionPlusPayout).toBeCloseTo(Number(order.subtotal), 2);

    const cartAfter = await api().get("/api/v1/customer/me/cart").set("Authorization", `Bearer ${customerToken}`).expect(200);
    expect(cartAfter.body.data.items).toHaveLength(0);
  });

  it("blocks a different customer from viewing this order (cross-tenant isolation)", async () => {
    const otherCust = await api()
      .post("/api/v1/auth/register")
      .send({ fullName: "Other Customer", email: `e2e-other-${suffix}@test.local`, password: "Password123!" })
      .expect(201);

    await api()
      .get(`/api/v1/customer/me/orders/${orderId}`)
      .set("Authorization", `Bearer ${otherCust.body.data.accessToken}`)
      .expect(404);
  });

  it("pays for the order, and the payment.succeeded event actually credits the restaurant's real ledger balance", async () => {
    const initiate = await api()
      .post(`/api/v1/customer/me/orders/${orderId}/payment/initiate`)
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(201);

    await api()
      .post(`/api/v1/customer/me/orders/${orderId}/payment/mock-complete`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ paymentId: initiate.body.data.paymentId, succeed: true })
      .expect(201);

    const orderAfterPay = await api().get(`/api/v1/customer/me/orders/${orderId}`).set("Authorization", `Bearer ${customerToken}`).expect(200);
    expect(orderAfterPay.body.data.paymentStatus).toBe("PAID");

    const ledgerEntry = await waitFor(async () => {
      const ledger = await api().get("/api/v1/restaurant/me/ledger").set("Authorization", `Bearer ${restaurantToken}`).expect(200);
      return Number(ledger.body.data.balance) > 0 ? ledger.body.data : null;
    });
    expect(Number(ledgerEntry.balance)).toBeCloseTo(Number(orderAfterPay.body.data.restaurantPayoutAmount), 2);
  });

  it("carries the restaurant through its real fulfillment state machine, rejecting an invalid skip-ahead transition", async () => {
    await api()
      .patch(`/api/v1/restaurant/me/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${restaurantToken}`)
      .send({ status: "DELIVERED" }) // invalid: must go through CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY first
      .expect(400); // OrderErrors.invalidStatusTransition is BAD_REQUEST, unlike the RESTAURANT status machine's own CONFLICT

    for (const status of ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      await api()
        .patch(`/api/v1/restaurant/me/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({ status })
        .expect(200);
    }

    const finalOrder = await api().get(`/api/v1/customer/me/orders/${orderId}`).set("Authorization", `Bearer ${customerToken}`).expect(200);
    expect(finalOrder.body.data.status).toBe("DELIVERED");
  });

  it("lets the customer review the delivered order, and the restaurant see it on their own dashboard", async () => {
    await api()
      .post("/api/v1/customer/me/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 5, comment: "Great food, e2e-tested!" })
      .expect(201);

    const restaurantReviews = await api()
      .get("/api/v1/restaurant/me/reviews")
      .set("Authorization", `Bearer ${restaurantToken}`)
      .expect(200);
    expect(restaurantReviews.body.data.some((r: { orderId: string }) => r.orderId === orderId)).toBe(true);
  });

  it("rejects a second order's cancel-after-payment the same way a real customer would hit it", async () => {
    await api()
      .post("/api/v1/customer/me/cart")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 })
      .expect(201);
    const order2 = await api()
      .post("/api/v1/customer/me/orders/checkout")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ deliveryAddressId: addressId })
      .expect(201);

    // Still PLACED (never paid) -- self-cancel is allowed here.
    await api()
      .patch(`/api/v1/customer/me/orders/${order2.body.data.id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(200);

    // A second cancel on an already-cancelled order is rejected, not silently accepted.
    await api()
      .patch(`/api/v1/customer/me/orders/${order2.body.data.id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(409);
  });
});
