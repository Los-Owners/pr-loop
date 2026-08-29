import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * GitHub como único proveedor: quien usa esto ya tiene cuenta, y el mismo token
 * sirve después para leer los PRs privados que el analizador necesita.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
});
