"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Sin deployment configurado la app sigue corriendo contra el fixture, solo que sin
 * login. Es lo que mantiene vivo el demo mientras Convex no está levantado: un
 * `ConvexReactClient` sin URL revienta al construirse.
 */
const client = url ? new ConvexReactClient(url) : null;

export const authEnabled = client !== null;

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!client) return <>{children}</>;
  return <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>;
}
