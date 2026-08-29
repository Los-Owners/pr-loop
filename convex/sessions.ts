import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const VERDICT = v.union(
  v.literal("green"),
  v.literal("blue"),
  v.literal("red"),
  v.literal("yellow"),
  v.literal("grey"),
);

/** Lo que el panel lateral necesita para pintar una fila, sin cargar el análisis. */
const SUMMARY = v.object({
  _id: v.id("sessions"),
  _creationTime: v.number(),
  label: v.string(),
  title: v.string(),
  prUrl: v.optional(v.string()),
  verdict: VERDICT,
});

/** Guarda una sesión terminada. La identidad sale del token, nunca de un argumento. */
export const save = mutation({
  args: {
    label: v.string(),
    title: v.string(),
    prUrl: v.optional(v.string()),
    verdict: VERDICT,
    analysis: v.any(),
    answers: v.any(),
  },
  returns: v.union(v.id("sessions"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    // Sin sesión no se guarda y no se rompe: el flujo sigue siendo utilizable sin login.
    if (userId === null) return null;
    return await ctx.db.insert("sessions", { userId, ...args });
  },
});

/** El historial del panel, de la más reciente a la más vieja. */
export const list = query({
  args: {},
  returns: v.array(SUMMARY),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return rows.map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      label: r.label,
      title: r.title,
      prUrl: r.prUrl,
      verdict: r.verdict,
    }));
  },
});

/** Una sesión completa, para volver a pintar su reporte. */
export const get = query({
  args: { id: v.id("sessions") },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      _creationTime: v.number(),
      label: v.string(),
      title: v.string(),
      prUrl: v.optional(v.string()),
      verdict: VERDICT,
      analysis: v.any(),
      answers: v.any(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const row = await ctx.db.get(args.id);
    // Una sesión de otra persona se responde como inexistente: no se confirma que exista.
    if (row === null || row.userId !== userId) return null;

    // El userId no sale: quien pregunta ya sabe que es suyo.
    return {
      _id: row._id,
      _creationTime: row._creationTime,
      label: row.label,
      title: row.title,
      prUrl: row.prUrl,
      verdict: row.verdict,
      analysis: row.analysis,
      answers: row.answers,
    };
  },
});
