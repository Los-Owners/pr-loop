import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Ownership Gate",
  description: "Un examen de comprensión antes de mergear un PR escrito por IA.",
};

/**
 * Convex Auth necesita las dos mitades: la del servidor lee la cookie de sesión y
 * se la pasa al cliente. Con solo la del cliente, `useConvexAuth` recibe undefined
 * y la página revienta al renderizar.
 */
const authEnabled = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <body className={`${sans.variable} ${mono.variable}`}>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </body>
  );

  return (
    <html lang="es">
      {authEnabled ? (
        <ConvexAuthNextjsServerProvider>{body}</ConvexAuthNextjsServerProvider>
      ) : (
        body
      )}
    </html>
  );
}
