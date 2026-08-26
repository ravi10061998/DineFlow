import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppModule } from "../../src/app.module";

/**
 * Boots the REAL AppModule — not a hand-picked subset of providers — through Nest's own
 * testing module, so every e2e request goes through the identical guard/interceptor/pipe
 * chain a real request does (JwtAuthGuard, PermissionsGuard, ResponseInterceptor,
 * HttpExceptionFilter, AuditLogInterceptor — all registered as APP_GUARD/APP_INTERCEPTOR/
 * APP_FILTER providers in app.module.ts itself, so they come along automatically).
 *
 * Two things main.ts sets up imperatively (not via a provider) have to be replicated here to
 * match: the global route prefix and the ValidationPipe. Everything else in main.ts (helmet,
 * cookieParser, CORS, Swagger) is browser/network concerned and irrelevant to supertest hitting
 * the in-process HTTP server directly.
 *
 * ThrottlerGuard is overridden to a no-op: the global 100/min (and tighter per-route
 * @Throttle limits on /auth/*) are correct, deliberate production behavior — but every e2e
 * request appears to come from the same "IP" in a test run, so leaving it active would make a
 * thorough auth test suite flaky/order-dependent rather than actually testing the auth flow.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

/**
 * `app.close()` alone can tear down the DB connection pool while a fire-and-forget event
 * listener from the LAST test is still mid-flight — order.status_changed's notification
 * dispatch and the audit-log write both fire via EventEmitter2.emit(), which (as documented
 * since Module 26) does not await async listener completion before the triggering HTTP
 * response returns. That's correct, deliberate production behavior; in a test it just means
 * closing too early logs a spurious "Connection terminated" after Jest already considers the
 * file done. A short grace period, not closing on a fixed timer, is what mirrors the app's own
 * behavior of never blocking the response on these — it just gives them a moment to finish.
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  await app.close();
}
