// drizzle-kit quotes custom PostGIS type names ("geography(Point,4326)"), which
// PostgreSQL then treats as an identifier. Unquote them after generation.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "src/db/migrations";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
  const path = join(dir, file);
  const before = readFileSync(path, "utf8");
  const after = before.replace(/"(geography\([A-Za-z]+,\d+\)|geometry\([A-Za-z]+,\d+\)|tsvector)"/g, "$1");
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`fixed types in ${file}`);
  }
}
