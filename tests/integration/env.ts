// Point every module at the disposable test database before anything imports the db client.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://gsi:gsi@localhost:5432/gsi_test";
process.env.SESSION_SECRET ??= "test-secret-0123456789abcdef0123456789";
process.env.ANTHROPIC_API_KEY = "";
process.env.NI_POSTCODES_ENABLED = "false";
