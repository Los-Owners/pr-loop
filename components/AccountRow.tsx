"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authEnabled } from "./ConvexClientProvider";

/** «Jhair Guzmán» → «JG»; «jhairguz» → «JH». Nunca más de dos letras. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.24-.02-2.25-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.834 2.81 1.3 3.5.995.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22 0 1.6-.02 2.9-.02 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H10" />
    </svg>
  );
}

/** El estado de carga: mismo alto que la fila real, para que el drawer no salte. */
function Loading() {
  return (
    <div className="account">
      <div className="accountRow">
        <span className="avatar">··</span>
        <span className="accountName" style={{ color: "var(--faint)" }}>Cargando…</span>
      </div>
    </div>
  );
}

function SignedOut() {
  const { signIn } = useAuthActions();
  return (
    <div className="account">
      <button type="button" className="signInBtn" onClick={() => void signIn("github")}>
        <GitHubIcon />
        Entrar con GitHub
      </button>
    </div>
  );
}

function SignedIn() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current, {});

  // El perfil aún viaja: se muestra el hueco, no un nombre inventado.
  if (user === undefined) return <Loading />;

  const name = user?.name?.trim() || user?.email?.split("@")[0] || "Tu cuenta";

  return (
    <div className="account">
      <div className="accountRow">
        {user?.image ? (
          // Avatar de GitHub: URL remota que Next no optimiza sin configurar el dominio.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatarImg" src={user.image} alt="" width={28} height={28} />
        ) : (
          <span className="avatar">{initialsOf(name)}</span>
        )}
        <span style={{ minWidth: 0, flexGrow: 1 }}>
          <span className="accountName">{name}</span>
          <span className="accountMeta">{user?.email ?? "vía GitHub"}</span>
        </span>
        <button
          type="button"
          className="iconBtn"
          onClick={() => void signOut()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <SignOutIcon />
        </button>
      </div>
    </div>
  );
}

/** Solo se monta con deployment configurado, así que los hooks de auth son seguros. */
function LiveAccount() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <Loading />;
  return isAuthenticated ? <SignedIn /> : <SignedOut />;
}

export default function AccountRow() {
  // Sin backend de auth no hay cuenta que enseñar. Antes había un nombre de ejemplo
  // escrito a mano; era mentira en cuanto alguien más abría la app.
  if (!authEnabled) return null;
  return <LiveAccount />;
}
