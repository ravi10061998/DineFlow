import "reflect-metadata";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";
import { AppDataSource } from "./data-source";

dotenv.config();

/**
 * One-off bootstrap: creates the first ADMIN user if none exists yet.
 * Not a migration — it needs bcrypt hashing, which raw SQL migrations can't do.
 * Run with: npm run seed:admin -w backend
 */
async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@dineflow.local";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const fullName = process.env.ADMIN_FULL_NAME || "Platform Admin";

  await AppDataSource.initialize();

  const existing = await AppDataSource.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.length > 0) {
    console.log(`Admin user already exists: ${email}`);
    await AppDataSource.destroy();
    return;
  }

  const adminRole = await AppDataSource.query(`SELECT id FROM roles WHERE name = 'ADMIN'`);
  if (adminRole.length === 0) {
    throw new Error("ADMIN role not found — run migrations first (npm run migration:run -w backend)");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AppDataSource.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, status, email_verified_at)
     VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
    [email, passwordHash, fullName, adminRole[0].id],
  );

  console.log(`Admin user created: ${email} / ${password}`);
  console.log("Change this password immediately after first login.");
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
