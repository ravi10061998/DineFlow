import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const buildTypeOrmOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: "postgres",
  host: configService.get<string>("DB_HOST", "localhost"),
  port: configService.get<number>("DB_PORT", 5432),
  username: configService.get<string>("DB_USERNAME", "postgres"),
  password: configService.get<string>("DB_PASSWORD", "postgres"),
  database: configService.get<string>("DB_DATABASE", "dineflow"),
  autoLoadEntities: true,
  // Schema is owned by migrations from Module 2 onward — never rely on synchronize.
  synchronize: false,
  logging: configService.get<string>("NODE_ENV") === "development" ? ["error", "warn"] : ["error"],
  migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],
  migrationsRun: false,
});
