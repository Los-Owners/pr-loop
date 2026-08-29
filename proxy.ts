import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

/**
 * No protege rutas: el muro está en el botón Analizar, no en la navegación. Esto
 * solo mantiene la sesión fresca entre peticiones.
 *
 * Va en proxy.ts, no en middleware.ts: Next 16 deprecó ese nombre.
 */
export default convexAuthNextjsMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
