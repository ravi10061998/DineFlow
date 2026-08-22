import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
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
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*", credentials: true });
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
