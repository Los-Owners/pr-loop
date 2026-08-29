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

function Row({
  initials,
  image,
  name,
  meta,
  action,
}: {
  initials: string;
  image?: string;
  name: string;
  meta: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="account">
      <div className="accountRow">
        {image ? (
          // Avatar de GitHub: es una URL remota que Next no puede optimizar sin configurarla.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatarImg" src={image} alt="" width={28} height={28} />
        ) : (
          <span className="avatar">{initials}</span>
        )}
        <span style={{ minWidth: 0, flexGrow: 1 }}>
          <span className="accountName">{name}</span>
          <span className="accountMeta">{meta}</span>
        </span>
        {action}
      </div>
    </div>
  );
}

/** Solo se monta con deployment configurado, así que los hooks de auth son seguros. */
function LiveAccount() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  // `skip` evita pedir el perfil antes de que haya sesión: sin token la query devuelve null.
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");

  if (isLoading) return <Row initials="··" name="Cargando…" meta="" />;
  if (!isAuthenticated) return <Row initials="—" name="Sin sesión" meta="Entras al analizar" />;

  // Autenticado pero el perfil aún viaja: se muestra el hueco, no un nombre falso.
  if (user === undefined) return <Row initials="··" name="Cargando…" meta="" />;

  const name = user?.name?.trim() || user?.email?.split("@")[0] || "Tu cuenta";

  return (
    <Row
      initials={initialsOf(name)}
      image={user?.image}
      name={name}
      meta={user?.email ?? "vía GitHub"}
      action={
        <button type="button" className="linkBtn" onClick={() => void signOut()}>
          Salir
        </button>
      }
    />
  );
}

export default function AccountRow() {
  if (!authEnabled) return <Row initials="JG" name="Jhair Guzmán" meta="Plan gratuito" />;
  return <LiveAccount />;
}
