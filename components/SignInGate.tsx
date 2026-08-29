"use client";

import { useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

/**
 * El muro antes de analizar. Solo se monta cuando hay deployment de Convex, así que
 * puede usar los hooks de auth sin guardas: sin backend, App nunca llega hasta acá.
 */
export default function SignInGate({
  repo,
  onSignedIn,
  onCancel,
}: {
  repo: string;
  onSignedIn: () => void;
  onCancel: () => void;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  // Quien ya tiene sesión no ve el muro: pasa de largo.
  useEffect(() => {
    if (isAuthenticated) onSignedIn();
  }, [isAuthenticated, onSignedIn]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="center">
        <p style={{ fontSize: 14, color: "var(--faint)" }}>Comprobando tu sesión…</p>
      </div>
    );
  }

  return (
    <div className="center">
      <div className="gate">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Antes de analizar</p>
        <h2 className="gateTitle">Entra para guardar lo que descubras</h2>
        <p className="gateLede">
          El reporte queda en tu historial y puedes volver a él cuando el PR ya esté mergeado.
          Usamos tu cuenta de GitHub porque es la que da acceso al código que vamos a leer.
        </p>

        <p className="gateRepo mono">{repo}</p>

        <button type="button" className="ghBtn" onClick={() => void signIn("github")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.24-.02-2.25-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.834 2.81 1.3 3.5.995.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22 0 1.6-.02 2.9-.02 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
          </svg>
          Entrar con GitHub
        </button>

        <button type="button" className="gateBack" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
}
