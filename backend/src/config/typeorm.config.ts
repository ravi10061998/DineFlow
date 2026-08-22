import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const buildTypeOrmOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: "postgres",
  host: configService.get<string>("DB_HOST", "localhost"),
  port: configService.get<number>("DB_PORT", 5432),
  username: configService.get<string>("DB_USERNAME", "postgres"),
  password: configService.get<string>("DB_PASSWORD", "postgres"),
  database: configService.get<string>("DB_DATABASE", "dineflow"),
  // Opt-in, off by default — local dev Postgres has no TLS listener at all. Most managed
  // production Postgres (RDS, Heroku, etc.) requires TLS but issues a certificate this app has
  // no independent way to pin ahead of time, so `rejectUnauthorized` defaults to true (verify
  // like a normal TLS client) but is escape-hatchable per-provider via env var if needed.
  ssl: configService.get<string>("DB_SSL") === "true" ? { rejectUnauthorized: configService.get<string>("DB_SSL_REJECT_UNAUTHORIZED") !== "false" } : false,
  autoLoadEntities: true,
  // Schema is owned by migrations from Module 2 onward — never rely on synchronize.
  synchronize: false,
  logging: configService.get<string>("NODE_ENV") === "development" ? ["error", "warn"] : ["error"],
  migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],
  migrationsRun: false,
});
