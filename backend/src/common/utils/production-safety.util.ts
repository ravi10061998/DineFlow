/** Secrets that must be real, sufficiently long, and not a checked-in dev placeholder before this app boots in production. */
const REQUIRED_PRODUCTION_SECRETS = ["JWT_ACCESS_SECRET", "PAYMENT_GATEWAY_SECRET", "PAYMENT_WEBHOOK_SECRET"];
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_MARKERS = ["dev-only", "change-me", "changeme"];

/**
 * Fails loudly and immediately rather than silently booting with insecure
 * config — every secret in `.env.example` is a dev-only placeholder by
 * design (so the app runs out of the box locally), which is exactly what
 * must never reach a real deployment unnoticed. Only runs when
 * `NODE_ENV=production`; local/dev/test boot is completely unaffected.
 *
 * Takes a plain env record (`process.env`), not `ConfigService` — this is
 * deliberately called BEFORE `NestFactory.create()` in `main.ts`, so a
 * misconfigured production deploy is refused before Nest even builds the
 * module graph (and, notably, before `TypeOrmModule.forRootAsync` gets a
 * chance to open a database connection). A real deployment sets these as
 * actual process environment variables — it should never be reading from a
 * checked-in `.env` file at all — so `process.env` is the correct source of
 * truth here, independent of whether `ConfigModule` has initialized yet.
 */
export function assertProductionConfigIsSafe(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== "production") return;

  const problems: string[] = [];

  for (const key of REQUIRED_PRODUCTION_SECRETS) {
    const value = env[key];
    if (!value || value.length < MIN_SECRET_LENGTH) {
      problems.push(`${key} is missing or shorter than ${MIN_SECRET_LENGTH} characters — generate a real secret (e.g. \`openssl rand -hex 64\`).`);
      continue;
    }
    if (PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker))) {
      problems.push(`${key} still looks like the checked-in local-dev placeholder value.`);
    }
  }

  if (!env.CORS_ORIGIN) {
    problems.push("CORS_ORIGIN is not set — refusing to fall back to a permissive default in production.");
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start in production with insecure configuration:\n- ${problems.join("\n- ")}`);
  }
}
