import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";

/** Por ahora solo las tablas de auth. Las sesiones guardadas vienen después. */
export default defineSchema({
  ...authTables,
});
