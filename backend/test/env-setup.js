// Runs once per Jest worker process, before any test file (or its imports, including
// AppModule -> ConfigModule) is loaded — the guaranteed-early hook, unlike relying on import
// statement ordering inside a spec file. Jest's `globalSetup` (global-setup.js) runs in its
// OWN separate process before workers even spawn, so anything it does to process.env there
// never reaches the worker processes that actually run the tests — this is the real mechanism
// that gets DB_DATABASE etc. into the process that boots AppModule for each test file.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.test") });
