import "./_env";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/db";
import { hashPassword } from "@/server/passwords";

/**
 * Usage: npm run admin:create -- editor@example.org [admin|editor]
 * The password is read from ADMIN_PASSWORD (min 12 characters), never from argv.
 */
async function main() {
  const [email, role = "admin"] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !["admin", "editor"].includes(role)) throw new Error("Usage: npm run admin:create -- <email> [admin|editor]");
  if (password.length < 12) throw new Error("Set ADMIN_PASSWORD (at least 12 characters)");
  const passwordHash = await hashPassword(password);
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
  if (existing) await db().update(schema.users).set({ passwordHash, role: role as "admin" | "editor" }).where(eq(schema.users.id, existing.id));
  else await db().insert(schema.users).values({ email: email.toLowerCase(), passwordHash, role: role as "admin" | "editor", emailVerifiedAt: new Date() });
  console.log(`${existing ? "Updated" : "Created"} ${role} ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closeDb);
