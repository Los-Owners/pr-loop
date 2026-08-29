import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Quién está en sesión. La identidad se deriva del token en el servidor, nunca de un
 * argumento del cliente.
 *
 * Devuelve solo lo que pinta el drawer: el resto del documento (teléfono, tiempos de
 * verificación) no tiene por qué salir en una query pública.
 */
export const current = query({
  args: {},
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (user === null) return null;

    return { name: user.name, email: user.email, image: user.image };
  },
});
