"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { authEnabled } from "./ConvexClientProvider";

function Row({ initials, name, meta, action }: { initials: string; name: string; meta: string; action?: React.ReactNode }) {
  return (
    <div className="account">
      <div className="accountRow">
        <span className="avatar">{initials}</span>
        <span style={{ minWidth: 0, flexGrow: 1 }}>
          <span style={{ display: "block", fontSize: 13 }}>{name}</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{meta}</span>
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

  if (isLoading) return <Row initials="··" name="Cargando…" meta="" />;
  if (!isAuthenticated) return <Row initials="—" name="Sin sesión" meta="Entras al analizar" />;

  return (
    <Row
      initials="GH"
      name="Sesión iniciada"
      meta="vía GitHub"
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
