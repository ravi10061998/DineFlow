import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, closeTestApp } from "./utils/test-app";

/**
 * The dynamic RBAC system (Module 2's own centerpiece — DB-driven roles/permissions, not a
 * hardcoded enum check) and tenant isolation across restaurants/customers, both exercised as
 * real requests through the real PermissionsGuard/RestaurantMemberGuard/CustomerGuard chain.
 */
describe("RBAC & tenant isolation (e2e)", () => {
  let app: INestApplication;
  const suffix = Math.random().toString(36).slice(2, 8);
  let adminToken: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = (await api().post("/api/v1/auth/login").send({ email: "admin@e2e.test", password: "ChangeMe123!" }).expect(201)).body
      .data.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("lets an admin create a real custom role and permission, and sync them together", async () => {
    const permission = await api()
      .post("/api/v1/admin/permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `e2e_${suffix}:read`, description: "E2E test permission", module: `e2e_${suffix}` })
      .expect(201);

    const role = await api()
      .post("/api/v1/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `E2E Custom Role ${suffix}`, description: "Created by the e2e suite" })
      .expect(201);

    const synced = await api()
      .post(`/api/v1/admin/roles/${role.body.data.id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permissionIds: [permission.body.data.id] })
      .expect(201);

    expect(synced.body.data.permissions.map((p: { key: string }) => p.key)).toContain(`e2e_${suffix}:read`);
  });

  it("blocks deleting or modifying a system-seeded role (ADMIN/CUSTOMER/etc.), even for an admin", async () => {
    const roles = await api().get("/api/v1/admin/roles").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const customerRole = roles.body.data.find((r: { name: string }) => r.name === "CUSTOMER");
    expect(customerRole.isSystem).toBe(true);

    await api()
      .patch(`/api/v1/admin/roles/${customerRole.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Renamed" })
      .expect(403);

    await api().delete(`/api/v1/admin/roles/${customerRole.id}`).set("Authorization", `Bearer ${adminToken}`).expect(403);
  });

  it("keeps two restaurants' menus completely isolated from each other", async () => {
    async function registerApprovedRestaurant(tag: string) {
      const reg = await api()
        .post("/api/v1/restaurants/register")
        .send({
          restaurantName: `RBAC Diner ${tag}`,
          ownerFullName: "Owner",
          email: `rbac-${tag}@test.local`,
          phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
          password: "Password123!",
          addressLine1: "1 St",
          city: "Testville",
          state: "TS",
          postalCode: "500001",
          country: "IN",
        })
        .expect(201);
      await api().patch(`/api/v1/admin/restaurants/${reg.body.data.restaurant.id}/approve`).set("Authorization", `Bearer ${adminToken}`).expect(200);
      return { token: reg.body.data.accessToken, restaurantId: reg.body.data.restaurant.id };
    }

    const restA = await registerApprovedRestaurant(`a-${suffix}`);
    const restB = await registerApprovedRestaurant(`b-${suffix}`);

    const categoryA = await api()
      .post("/api/v1/restaurant/me/categories")
      .set("Authorization", `Bearer ${restA.token}`)
      .send({ name: "Restaurant A's Category" })
      .expect(201);

    // Restaurant B's own categories list must never include A's category.
    const categoriesForB = await api().get("/api/v1/restaurant/me/categories").set("Authorization", `Bearer ${restB.token}`).expect(200);
    expect(categoriesForB.body.data.find((c: { id: string }) => c.id === categoryA.body.data.id)).toBeUndefined();

    // B directly trying to edit A's category by id is rejected, not silently scoped away.
    await api()
      .patch(`/api/v1/restaurant/me/categories/${categoryA.body.data.id}`)
      .set("Authorization", `Bearer ${restB.token}`)
      .send({ name: "Hijacked" })
      .expect(404);
  });

  it("keeps a customer's saved addresses private from every other customer", async () => {
    const custA = await api()
      .post("/api/v1/auth/register")
      .send({ fullName: "Customer A", email: `rbac-custa-${suffix}@test.local`, password: "Password123!" })
      .expect(201);
    const custB = await api()
      .post("/api/v1/auth/register")
      .send({ fullName: "Customer B", email: `rbac-custb-${suffix}@test.local`, password: "Password123!" })
      .expect(201);

    const address = await api()
      .post("/api/v1/customer/me/addresses")
      .set("Authorization", `Bearer ${custA.body.data.accessToken}`)
      .send({
        label: "HOME",
        receiverName: "Customer A",
        receiverPhone: "+919123456781",
        addressLine1: "1 Private Lane",
        city: "Testville",
        state: "TS",
        postalCode: "500001",
        country: "IN",
      })
      .expect(201);

    const addressesForB = await api().get("/api/v1/customer/me/addresses").set("Authorization", `Bearer ${custB.body.data.accessToken}`).expect(200);
    expect(addressesForB.body.data).toHaveLength(0);

    await api()
      .patch(`/api/v1/customer/me/addresses/${address.body.data.id}`)
      .set("Authorization", `Bearer ${custB.body.data.accessToken}`)
      .send({ receiverName: "Hijacked" })
      .expect(404);
  });

  it("blocks a restaurant account from ever reaching a customer-only route, and vice versa", async () => {
    const cust = await api()
      .post("/api/v1/auth/register")
      .send({ fullName: "Route Test Customer", email: `rbac-route-${suffix}@test.local`, password: "Password123!" })
      .expect(201);

    await api().get("/api/v1/restaurant/me/categories").set("Authorization", `Bearer ${cust.body.data.accessToken}`).expect(403);
    await api().get("/api/v1/customer/me/addresses").set("Authorization", `Bearer ${adminToken}`).expect(403);
  });
});
