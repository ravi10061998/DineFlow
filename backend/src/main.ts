import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { assertProductionConfigIsSafe } from "./common/utils/production-safety.util";

async function bootstrap() {
  // Checked against raw process.env, deliberately BEFORE NestFactory.create() below — fails
  // loudly and immediately rather than silently serving traffic with a dev-placeholder JWT
  // secret or a wildcard CORS origin, and before Nest even builds the module graph (notably,
  // before TypeOrmModule.forRootAsync gets a chance to open a database connection). No-op
  // outside production — see the util's own doc comment.
  assertProductionConfigIsSafe(process.env);

  // rawBody: true — webhook signature verification (Module 13) must HMAC the exact raw request
  // bytes; Nest still parses req.body as JSON normally, this just additionally keeps req.rawBody.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Helmet's default Cross-Origin-Resource-Policy is "same-origin", which silently blocks
  // the frontend (a different origin in dev, and typically a different subdomain in prod)
  // from loading anything served here via a plain <img src> — including every public
  // image route (product photos, restaurant logos). This is a deliberately public API
  // for a separate frontend, so those assets need to be loadable cross-origin; every
  // other Helmet protection (CSP, HSTS, frame-options, etc.) stays at its default.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  // Never fall back to a wildcard origin: "*" combined with `credentials: true` is both invalid
  // per the CORS spec (browsers reject a credentialed request against a literal "*") and, more
  // importantly, exactly the kind of "silently permissive" default this app should never ship
  // with. Local dev without CORS_ORIGIN set falls back to the frontend's own default port;
  // production without it set is refused at boot above by `assertProductionConfigIsSafe`.
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("DineFlow API")
    .setDescription("Multi-restaurant ordering, payment & delivery management platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`DineFlow API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
