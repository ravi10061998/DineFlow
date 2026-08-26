import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, closeTestApp } from "./utils/test-app";

/**
 * A real HTTP round trip through the full guard/interceptor/pipe chain against a real Postgres
 * database — the auth flow's unit tests (auth.service.spec.ts) mock every repository and never
 * exercise a genuine JWT issue/verify cycle or the actual JwtAuthGuard/PermissionsGuard chain a
 * real request goes through. This is what actually proves those wire up correctly together.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `e2e-auth-${suffix}@test.local`;
  const password = "Password123!";

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("registers a new customer and returns a working token pair", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ fullName: "E2E Tester", email, password })
      .expect(201);

    expect(res.body).toMatchObject({
      success: true,
      data: { user: { email, role: "CUSTOMER" }, accessToken: expect.any(String), refreshToken: expect.any(String) },
    });
  });

  it("rejects a duplicate email on register", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ fullName: "Someone Else", email, password })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it("rejects login with the wrong password", async () => {
    await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password: "WrongPassword1!" }).expect(401);
  });

  it("logs in with the correct password and fetches /auth/me with the resulting access token", async () => {
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password }).expect(201);
    const { accessToken } = login.body.data;

    const me = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);

    expect(me.body.data).toMatchObject({ email, role: "CUSTOMER" });
  });

  it("rejects a protected route with no token at all", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
  });

  it("rejects a protected route with a garbage token", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-real-token").expect(401);
  });

  it("blocks a customer from an admin-only route (real PermissionsGuard enforcement, not a mocked req.user)", async () => {
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password }).expect(201);

    await request(app.getHttpServer())
      .get("/api/v1/admin/restaurants")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .expect(403);
  });

  it("rotates the refresh token on use, and rejects the old one afterward (reuse detection)", async () => {
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password }).expect(201);
    const originalRefreshToken = login.body.data.refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefreshToken })
      .expect(201);
    expect(refreshed.body.data.refreshToken).not.toBe(originalRefreshToken);

    // The now-rotated-away original token must be rejected, not silently accepted again.
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: originalRefreshToken }).expect(401);
  });

  it("logs out and invalidates that refresh token", async () => {
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password }).expect(201);
    const { refreshToken, accessToken } = login.body.data;

    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(201);

    await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken }).expect(401);
  });

  it("logs in as the seeded e2e admin and reaches an admin-only route for real", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@e2e.test", password: "ChangeMe123!" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/restaurants")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("rejects a request body with an unknown field (whitelist: true / forbidNonWhitelisted: true on the real ValidationPipe)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password, notARealField: "x" })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
