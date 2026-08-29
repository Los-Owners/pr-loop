# Handoff

Para quien clona el repo y sigue el desarrollo. El **qué** y el **por qué** del producto están en
[`CLAUDE.md`](./CLAUDE.md) y [`docs/spec/`](./docs/spec) — no se repiten acá. Esto es el **cómo**:
en qué estado está, cómo levantarlo, qué falta y qué trampas ya se pisaron.

---

## 1 · Levantarlo desde cero

Node 24. El puerto 3000 suele estar ocupado, así que todo asume **3007**.

```bash
npm install
```

### 1.1 · Convex

Cada persona necesita **su propio deployment**. El que se usó en desarrollo (`giant-cod-819`)
pertenece a otra cuenta y no sirve.

```bash
npx convex dev        # login interactivo, abre el navegador. Déjalo corriendo.
```

Escribe `.env.local` con `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` y
`NEXT_PUBLIC_CONVEX_SITE_URL`, y genera `convex/_generated/`. Anota tu subdominio: aparece como
`https://TU-DEPLOYMENT.convex.cloud`.

### 1.2 · Llaves de sesión

**No corras el wizard `npx @convex-dev/auth`**: pide TTY y se cuelga en cualquier ejecución no
interactiva. Se generan headless:

```bash
node -e 'import("jose").then(async({generateKeyPair,exportPKCS8,exportJWK})=>{const k=await generateKeyPair("RS256",{extractable:true});const priv=await exportPKCS8(k.privateKey);const pub=await exportJWK(k.publicKey);process.stdout.write(JSON.stringify({JWT_PRIVATE_KEY:priv.trimEnd().replace(/\n/g," "),JWKS:JSON.stringify({keys:[{use:"sig",...pub}]})}))})' > .auth-keys.json

JWT=$(node -e "process.stdout.write(require('./.auth-keys.json').JWT_PRIVATE_KEY)")
JWKS=$(node -e "process.stdout.write(require('./.auth-keys.json').JWKS)")
npx convex env set "JWT_PRIVATE_KEY=$JWT"
npx convex env set "JWKS=$JWKS"
npx convex env set "SITE_URL=http://localhost:3007"
rm .auth-keys.json
```

Usa siempre la forma `NAME=VALOR` entre comillas. `npx convex env set JWT_PRIVATE_KEY "$JWT"` falla:
el valor empieza por `-----BEGIN` y el CLI lee ese guion como un flag desconocido.

`.auth-keys.json` está en `.gitignore`. Bórralo igualmente: las llaves ya viven en el deployment.

### 1.3 · OAuth de GitHub

En <https://github.com/settings/developers> → *New OAuth App*:

| Campo | Valor |
|---|---|
| Homepage URL | `http://localhost:3007` |
| Authorization callback URL | `https://TU-DEPLOYMENT.convex.site/api/auth/callback/github` |

El callback va a **`.convex.site`**, no a `.convex.cloud`. El `.cloud` es el de
`NEXT_PUBLIC_CONVEX_URL`; confundirlos es la causa más común de que el login falle sin decir por qué.

```bash
npx convex env set "AUTH_GITHUB_ID=<client id>"
npx convex env set "AUTH_GITHUB_SECRET=<client secret>"
```

### 1.4 · Arrancar

```bash
PORT=3007 npm run dev
```

Sin `NEXT_PUBLIC_CONVEX_URL` la app **corre igual**, contra el fixture y sin login. Es deliberado:
mantiene vivo el demo cuando Convex no está levantado. Un `ConvexReactClient` sin URL revienta al
construirse, así que `components/ConvexClientProvider.tsx` lo esquiva y exporta `authEnabled`.

### 1.5 · El analizador (opcional)

Necesita `ANTHROPIC_API_KEY` en el entorno, o `ant auth login`. **Nunca se ha ejecutado** — ver §4.

---

## 2 · Desplegar a Vercel

Verificado contra `convex@1.45.0` y `@convex-dev/auth@0.0.95`. **La configuración de desarrollo no
sirve tal cual**: cinco cosas cambian.

1. **Un deployment de producción de Convex**, distinto del de desarrollo. Otro nombre, otra URL.

2. **Una segunda OAuth App de GitHub.** Las docs de Convex Auth son explícitas: no suele poderse
   compartir la misma app entre desarrollo y producción, porque una apunta a `localhost` y la otra a
   la URL pública. El callback apunta a **Convex, no a Vercel** — Vercel sirve el front, pero quien
   recibe el callback es el backend:

   ```
   dev   https://TU-DEPLOYMENT-DEV.convex.site/api/auth/callback/github
   prod  https://TU-DEPLOYMENT-PROD.convex.site/api/auth/callback/github
   ```

3. **`SITE_URL`** en el deployment de producción es la URL de Vercel, no `http://localhost:3007`.
   Es a donde Convex Auth te devuelve después del login.

4. **El build command de Vercel** no es `npm run build`:

   ```
   npx convex deploy --cmd 'npm run build'
   ```

   Despliega las funciones de Convex y además inyecta `NEXT_PUBLIC_CONVEX_URL` durante el build, así
   que esa variable no se pone a mano.

5. **`CONVEX_DEPLOY_KEY` en Vercel.** Dashboard de Convex → deployment de producción → *Deployment
   Settings* → *General* → *Generate Production Deploy Key*, con permiso `deployment:deploy`. En
   Vercel, *Environment* = solo **Production**.

Además, `ANTHROPIC_API_KEY` en Vercel si el analizador ha de correr en producción.

Dos trampas:

- **Las llaves JWT no se heredan entre deployments.** Hay que generar y poner `JWT_PRIVATE_KEY` y
  `JWKS` también en producción, con el mismo comando de §1.2.
- **Los preview deployments rompen el login.** Cada PR recibe una URL distinta y el callback de
  GitHub es fijo. Hay una deploy key de *Preview* aparte, pero el OAuth seguirá fallando salvo que
  se registre una tercera app. Para el hackathon: ignorarlo y probar en producción.

Calcula 15-20 minutos, no 3. Y es configuración que **falla en silencio**: un callback mal puesto no
da un error claro, simplemente no entras.

---

## 3 · Qué funciona

Verificado, no supuesto:

| | |
|---|---|
| `tsc --noEmit`, `npm run lint`, `npm run build` | Los tres limpios |
| Flujo completo start → auth → scan → sesión ×5 → reporte | Renderiza |
| Backend de auth desplegado | `auth:signIn`, `signOut`, `store`, `isAuthenticated` |
| `.well-known/openid-configuration` | 200 — el JWKS quedó bien |
| `/api/auth/callback/github` | 302 — la ruta existe |
| Flujo OAuth completo | `auth:signIn` → GitHub, con `client_id` y PKCE correctos |
| GitHub acepta el `redirect_uri` | 302 a la pantalla de autorización, no error |

### Cómo está armado

- **`lib/types.ts`** es el contrato. Todo lo demás se deriva de un `Analysis`.
- **`lib/questions.ts`** genera las cinco preguntas **con código normal, no con un modelo**.
  Instantáneo, gratis y reproducible; en un demo en vivo eso vale más que ser listo.
- **`lib/scoring.ts`** es corrección × confianza. Los cuatro colores están en `CLAUDE.md` y no se
  tocan.
- **`lib/report.ts`** deriva el feedback, la evidencia y el prompt que el dev se lleva.
- **`lib/analyzer/`** convierte un diff en ese `Analysis` con una llamada a `claude-opus-5`.
- **`components/`** — `App` (máquina de estados), `Shell` (drawer), `Session`, `Report`,
  `SequenceDiagram` (HTML/CSS, sin SVG), `SignInGate`, `AccountRow`.

Lo importante: **las preguntas y el reporte salen de `fixtures/pr-418/analysis.json`, no están
escritos a mano.** Cambiar el fixture cambia las cinco preguntas y los colores del diagrama sin
tocar un componente. Eso es lo que hace enchufable al analizador.

### El login

El muro vive en el botón **Analizar**, no en la navegación (`components/App.tsx`, paso `auth`).
Conserva el PR que ya pegaste y deja pasar de largo a quien ya tiene sesión.

`proxy.ts` solo mantiene la sesión fresca; no protege rutas. Va en `proxy.ts` y **no** en
`middleware.ts`: Next 16 deprecó ese nombre y lo avisa en cada arranque.

---

## 4 · Qué falta, por orden de valor

1. **Probar el analizador.** Está escrito y nunca se ha ejecutado: no había credencial en el
   entorno. Corre `npm run dev` y en otra terminal `npm run check:fixture` — comprueba que encuentra
   los tres defectos que el fixture enseña (§ `fixtures/pr-418/README.md`). Cuesta ~$0.15 por
   corrida. Hasta que pase, **no sabemos si el prompt funciona**, y es el foso del producto.

2. **Ingesta de GitHub.** Traer diff y archivos desde la URL del PR. El analizador ya acepta
   `files`, y los usa para verificar que los snippets existen de verdad — con solo el diff esa
   red de seguridad no actúa. La API pública basta para repos públicos; para privados, el token de
   GitHub que ya da el login.

3. **Persistir sesiones en Convex.** El historial del drawer está pintado a mano en `Shell.tsx`.
   `convex/schema.ts` solo tiene las tablas de auth.

4. **El botón «Dictar».** Está pintado y no hace nada — ver §6.

---

## 5 · Decisiones que no están en el código

- **El diseño se rehízo tres veces.** El chrome oscuro fue rechazado explícitamente. La dirección es
  *limpio tipo ChatGPT*: drawer gris claro, contenido blanco, acento azul usado con avaricia,
  monoespaciada **solo en metadatos**. No proponer temas oscuros ni paletas saturadas.
- **El reporte vive dentro del mismo flujo**, no en otra vista. Ya se corrigió una vez.
- **Implementación y Buenas prácticas salen deshabilitadas a propósito** en la pantalla de inicio:
  comunican visión de producto sin costar nada. No implementarlas.
- **Los cuatro colores semánticos son intocables** y el acento (`#2F5FD0`) nunca puede ser uno de
  ellos.
- **El login exigido al Analizar contradice una decisión anterior** («vive en el drawer y no bloquea
  la primera sesión»). Se cambió a petición explícita. Queda anotado el riesgo: hay demo en vivo de
  3 minutos y la regla del evento pide que alguien real lo haya usado antes de la campana; un muro
  antes de la primera sesión mete fricción justo donde el producto tiene que enamorar. Si en el
  ensayo estorba, mover el muro a después del reporte es un cambio de tres líneas en `App.tsx`.

---

## 6 · Deuda conocida

Ninguna rompe el demo con el fixture actual. Las tres primeras se notan en cuanto se analiza otro PR:

- **`components/Session.tsx:7`** — `ORDER` tiene los ids del fixture (`cart`, `price`, `coup`)
  hardcodeados. Con otro análisis, el diagrama que dibuja el dev se queda sin servicios.
- **`lib/report.ts`, `buildPrompt`** — `missed("q3")` se evalúa antes del guard `&& d`, así que un
  análisis sin `decisions` o sin camino `missing` rompe el reporte.
- **`components/AccountRow.tsx`** — muestra «Sesión iniciada», no el nombre real. Falta una query
  `users` en `convex/` y leerla con `api.users.current`.
- **El botón «Dictar»** (`components/Session.tsx`) es un `<span>` con `aria-hidden`: se ve pulsable,
  no lo es, y el lector de pantalla lo ignora. O se implementa con `SpeechRecognition` (~15 min,
  solo Chrome) o se quita.
- **`proxy.ts`** cubre `/api` en su `matcher`, así que `/api/analyze` queda detrás de la sesión.
  Decidir si debe ser público.
- **`skill-pr.md`** en la raíz no pertenece a este proyecto (es una spec de otro repo). Está
  commiteado a propósito, para borrar más adelante.

---

## 7 · Trampas ya pisadas

No hace falta volver a descubrirlas:

- **Convex Auth necesita las dos mitades del provider.** Con solo `ConvexAuthNextjsProvider`
  (cliente), `useConvexAuth()` recibe `undefined` y la página entera da 500 con
  `Cannot destructure property 'isLoading' of 'useAuth(...)'`. Falta
  `ConvexAuthNextjsServerProvider` en `app/layout.tsx`, que lee la cookie y se la pasa al cliente.
- **`convex/auth.config.ts` es obligatorio.** Si falta o el `domain` está mal, la app queda
  **siempre deslogueada, sin ningún error visible**. Es el footgun clásico.
- **El wizard `npx @convex-dev/auth` se cuelga** sin TTY. Llaves headless con `jose` — §1.2.
- **`npx convex env set NOMBRE "$VALOR"` falla** con valores que empiezan por `-`. Usar
  `"NOMBRE=$VALOR"`.
- **Next 16 deprecó `middleware.ts`** en favor de `proxy.ts`. Antes de tocar cualquier cosa de Next,
  leer `node_modules/next/dist/docs/` — esta versión tiene cambios de ruptura frente a lo que la
  mayoría de modelos tienen memorizado.
- **`next dev` reinyecta un bloque en `CLAUDE.md`** en cada arranque. No es un borrado: es un
  append, y quitarlo solo lo recrea. Commitearlo mantiene el árbol limpio.
- **`budget_tokens` ya no existe** en los modelos actuales y devuelve error. El analizador usa
  thinking adaptativo con `effort: "high"`.
- **`convex/_generated/` se excluye del lint** (`eslint.config.mjs`): Convex lo reescribe en cada
  `convex dev`.
- **Replit no procesa el repositorio.** Da entorno y créditos, nada más.
- **Design Components no soporta `sc-for`/`sc-if` anidados**, el texto dentro de `<svg>` no
  renderiza, y el contenido que pasa del alto del artboard **se corta sin aviso**. Por eso el
  diagrama de secuencia es HTML/CSS.
- **La extensión de Chrome no respondió** en dos sesiones seguidas (`tabs_context_mcp` sin
  respuesta); parece esperar un permiso en su panel lateral. No hay capturas automáticas.

---

## 8 · Skills útiles

- **`get-convex/agent-skills@convex-auth`** — ya instalada (`.agents/skills/`, registrada en
  `skills-lock.json`). De ahí salen §1.2 y las dos primeras trampas de §7.
- **`claude-api`** — obligatoria antes de tocar `lib/analyzer/`. La API cambió en 2025-2026; no
  confiar en la memoria para ids de modelo ni parámetros.
- **`convex-*`** — hay una familia entera (`convex-env`, `convex-reviewer`, `convex-authz`,
  `convex-test`…) que aparece sola al trabajar bajo `convex/`.
- **`brainstorming`** antes de trabajo creativo nuevo, **`grilling`** para estresar una decisión
  antes de construirla. `grilling` ya se usó una vez y produjo la spec actual.

`design-an-interface` y `codebase-design` son de diseño de **módulos**, no de UI.
