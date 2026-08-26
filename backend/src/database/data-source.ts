import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

/**
 * Used ONLY by the TypeORM CLI (migration:generate/run/revert — see package.json scripts).
 * The running Nest app uses `config/typeorm.config.ts` instead, which goes through
 * ConfigService/autoLoadEntities. Keep both in sync when connection settings change.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "dineflow",
  // Mirrors config/typeorm.config.ts's SSL handling — this file was missing it entirely, which
  // meant the migration CLI could never actually connect to any SSL-requiring managed Postgres
  // (Render, RDS, etc.), only ever tested against local dev's plaintext connection.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } : false,
  entities: [__dirname + "/../modules/**/entities/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
});
