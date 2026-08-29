import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  /**
   * Una sesión terminada. Se guardan el análisis y las respuestas, no el reporte:
   * todo lo demás se re-deriva con código puro al abrirla, igual que en vivo. Así una
   * mejora en el reporte alcanza también a las sesiones viejas.
   *
   * `verdict` y `title` van desnormalizados porque el panel lateral los pinta sin
   * abrir la sesión, y no vale la pena leer el análisis entero para eso.
   */
  sessions: defineTable({
    userId: v.id("users"),
    /** `acme/checkout #418`, o «PR de ejemplo». Lo que se lee en el panel. */
    label: v.string(),
    title: v.string(),
    prUrl: v.optional(v.string()),
    /** El peor color de la sesión: el punto del panel. */
    verdict: v.union(
      v.literal("green"),
      v.literal("blue"),
      v.literal("red"),
      v.literal("yellow"),
      v.literal("grey"),
    ),
    /** El JSON del analizador y las respuestas, tal cual. */
    analysis: v.any(),
    answers: v.any(),
  }).index("by_userId", ["userId"]),
});
