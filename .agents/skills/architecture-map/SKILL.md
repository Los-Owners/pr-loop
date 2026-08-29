---
name: architecture-map
description: Explora un repo y genera/actualiza documentación de arquitectura basada en lo que realmente existe en el código — un docs/architecture.md con el diagrama de límites de producción como índice, más un diagrama por cada área que lo amerite (secuencia de un flujo real, clases del dominio real, ER del schema real, estado de una máquina de estados real) en docs/diagrams/*.md. Cada diagrama se valida contra el parser oficial de mermaid.js antes de darse por terminado, así se garantiza que renderiza en GitHub/GitLab/cualquier visor real, no solo que "se ve bien" en una herramienta de terceros. Usar cuando el usuario pida "generar los diagramas de este proyecto", "documentar la arquitectura del repo", "diagrama de secuencia de este flujo basado en el código", "diagrama de clases del dominio", "diagrama ER de la base de datos", "mapear la arquitectura", o algo equivalente a "un generador de diagramas de acuerdo a la información del proyecto" — no para diagramas a partir de una descripción verbal sin código detrás (para eso usar mermaid-skill).
---

# Architecture Map

Genera documentación de arquitectura **grounded en el código real**, nunca en
una descripción inventada. Si no encontrás en el repo el material que
justifique un tipo de diagrama, no lo generás — no rellenás con ejemplos
genéricos.

Salida: **solo `.md`**, nada más. No hay SVG, no hay HTML, no hay render
paralelo — la calidad tiene que estar en el propio texto Mermaid, porque
GitHub/GitLab/el editor de quien lo lea van a renderizar exactamente ese
texto con su propio motor, no con ninguna herramienta de terceros.

- `docs/architecture.md` — el **índice**: diagrama de límites de producción
  (`flowchart`), boundary notes, y una tabla que enlaza a cada diagrama de
  detalle.
- `docs/diagrams/<slug>.md` — un archivo corto y autocontenido **por
  diagrama de detalle**, cada uno con su propio tipo de Mermaid según lo que
  describe.

Antes de dar cualquier diagrama por terminado, se valida contra el parser
oficial de `mermaid.js` (ver Paso 5) — el mismo motor que usa GitHub. Esto no
es opcional: un diagrama que "se ve bien" en una vista previa de terceros
puede tener sintaxis inválida para el parser real y renderizar roto
("Syntax error in text") donde de verdad importa.

## Prerequisito

El paso de validación necesita `mermaid` + `jsdom` instalados en
`~/.claude/skills/architecture-map/scripts/` (setup manual, de una sola vez —
la skill no instala nada sola). Antes de validar (Paso 5), verificá:

```bash
node -e "require.resolve('mermaid', {paths: ['/Users/josueroquecastillo/.claude/skills/architecture-map/scripts']}); require.resolve('jsdom', {paths: ['/Users/josueroquecastillo/.claude/skills/architecture-map/scripts']})" 2>&1
```

Si falla, decile al usuario "Falta `mermaid` instalado — corré `cd
~/.claude/skills/architecture-map/scripts && bun install` y volvé a pedirme
esto" y detenete ahí — **no lo instales vos**. El resto de la skill funciona
igual sin esto, pero sin garantía de que el Mermaid generado sea
sintácticamente válido; avisale eso al usuario si seguís sin poder validar.
Ver [references/setup.md](references/setup.md) para el porqué de `jsdom` y
más detalle de troubleshooting.

## Paso 0: Leer contexto de dominio si existe

- `CONTEXT.md` en la raíz, o `CONTEXT-MAP.md` si hay múltiples contextos.
- `docs/adr/` (y `src/<contexto>/docs/adr/` en repos multi-contexto) —
  leé los ADRs relevantes al área que vas a describir.

Si no existen, seguí sin quejarte. Usá el vocabulario exacto de `CONTEXT.md`
para nombrar elementos. Si un diagrama que ibas a proponer contradice un ADR,
señalalo en la nota correspondiente en vez de dibujar algo que choca con una
decisión ya tomada.

## Paso 1: Explorar el repo

- Manifests (`package.json`, `pyproject.toml`, etc.) y config de despliegue
  (`wrangler.toml`, `docker-compose.yml`, infra as code).
- Directorios de primer nivel para límites de módulos/apps.
- Entry points, definiciones de rutas/endpoints, capas de servicio.
- Modelos de dominio (clases/tipos con relaciones reales, no DTOs planos).
- Schema de base de datos: migraciones, archivos de modelo/ORM, `schema.sql`.
- Máquinas de estado explícitas: enums de estado + funciones/reducers de
  transición, o uso de una librería de state machines.

## Paso 2: Decidir qué diagramas generar

**Siempre**: `overall-architecture` (límites de producción y flujos
principales). Va en `docs/architecture.md`, nunca en `docs/diagrams/`.

**Solo si hay material real que lo justifique**, uno o más de estos, cada uno
en su propio archivo bajo `docs/diagrams/`:

| Diagrama | Tipo Mermaid | Se genera cuando encontrás... |
| --- | --- | --- |
| Flujo de un caso de uso central | `sequenceDiagram` | Un endpoint/handler con varios pasos entre servicios que no es obvio desde el boundary diagram (ej. login, checkout, un webhook) |
| Modelo de dominio | `classDiagram` | Clases/tipos de dominio con relaciones (herencia, composición, agregación) — no un DTO suelto |
| Schema de datos | `erDiagram` | Migraciones o modelos ORM con tablas y relaciones reales |
| Máquina de estados | `stateDiagram-v2` | Un enum de estados + transiciones explícitas en código (ej. ciclo de vida de una orden) |
| Mapa de dependencias | `flowchart` | Un grafo de módulos internos complejo que el boundary diagram no puede mostrar sin saturarse |
| Topología de almacenamiento | `flowchart` | 2+ sistemas de almacenamiento con reglas de autoridad distintas que valen la pena aislar |

No generes un diagrama "porque el catálogo lo tiene" — cada fila de la tabla
es una hipótesis a confirmar contra el código, no una lista de tareas fija.
Un proyecto chico puede terminar con solo `overall-architecture` y nada más.

## Paso 3: Reglas por tipo de diagrama

Antes de dar cualquier diagrama por terminado, seguí las reglas de
[references/mermaid-syntax-rules.md](references/mermaid-syntax-rules.md):
frontmatter de tema oscuro obligatorio, reglas generales de sintaxis
(`;` sin escapar, `end` como palabra reservada, `#` como comentario en
`sequenceDiagram`, backticks en nombres de clase no alfanuméricos, la
regla de "5+ conexiones = edge spaghetti"), y las reglas específicas por
tipo (`flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`,
`stateDiagram-v2`). No es opcional: son las reglas que hacen que el
diagrama pase el Paso 5.

## Paso 4: Redactar cada archivo

**`docs/architecture.md`** (siempre existe, es el índice):

1. `# Architecture`
2. Párrafo corto: qué muestra el diagrama de límites y qué no reemplaza.
3. El bloque ` ```mermaid ` de `overall-architecture`.
4. `## Boundary notes` — una viñeta por elemento no obvio, responsabilidad +
   límites explícitos (qué NO puede hacer, qué NO tiene acceso a algo).
5. `## Diagrams` — tabla con una fila por archivo en `docs/diagrams/`:
   nombre, link relativo, una línea de qué muestra.
6. Párrafo de cierre con links a `CONTEXT.md`, ADRs, runbooks que existan.

**`docs/diagrams/<slug>.md`** (uno por diagrama de detalle):

1. `# <Título del diagrama>`
2. Un párrafo de contexto: qué caso/área cubre y por qué se generó.
3. El bloque ` ```mermaid ` con el tipo correspondiente.
4. `## Notes` — lo que el diagrama no puede mostrar por sí solo (casos borde,
   por qué una relación es así, qué decisión de ADR lo respalda).
5. Link de vuelta a `[Architecture overview](../architecture.md)`.

Nombrá el slug en kebab-case describiendo el contenido, no el tipo:
`docs/diagrams/jwt-login-sequence.md`, no `docs/diagrams/sequence-1.md`.

## Paso 5: Validar contra el parser oficial

Por cada diagrama escrito (el de `docs/architecture.md` incluido), **antes**
de darlo por terminado:

1. Escribí el texto Mermaid (sin el fence, solo el código) a un archivo
   temporal, por ejemplo en el directorio de scratch de la sesión.
2. Corré:
   ```bash
   node ~/.claude/skills/architecture-map/scripts/validate.mjs <temp.mmd>
   ```
3. Si imprime `OK` (exit code 0): borrá el temporal, seguí. El diagrama está
   garantizado sintácticamente válido para el motor real de Mermaid.
4. Si falla (exit code 1): leé el mensaje de error del parser — te da número
   de línea y qué esperaba. Corregí el `.mmd` (el error más común es un `;`
   dentro de un label — ver Paso 3) y volvé a validar. No copies el error
   crudo al `.md` ni al usuario sin antes intentar arreglarlo vos mismo.
5. Borrá el archivo temporal.

Si el chequeo de prerequisito (ver arriba) falló, saltá este paso pero
**avisale explícitamente al usuario en el reporte final** que el diagrama no
fue validado y podría tener errores de sintaxis no detectados.

## Verificación visual (opcional, no es parte del flujo automático)

Dos herramientas — abrir el diagrama en `mermaid.live` para que lo vea el
usuario, o sacarle un screenshot headless para verlo vos mismo — descritas
en [references/visual-verification.md](references/visual-verification.md).
**Ninguna corre sola en el Paso 5**, que sigue siendo solo `validate.mjs`.

**Invocalas vos mismo, sin que te lo pidan, solo en estos tres casos** —
siempre "algo concreto está en duda", nunca rutina:

1. El usuario reporta que algo se ve mal (overlap, líneas raras, colores) —
   reproducilo antes de proponer un fix, no adivines a ciegas.
2. Acabás de aplicar un fix específico a un problema de render y necesitás
   confirmar que funcionó antes de decir "listo".
3. Estás investigando algo puntual del motor/plataforma (ej. si GitHub
   respeta cierta config) donde no hay otra forma de verificar sin ver el
   resultado.

**Nunca las uses** porque un diagrama es grande, tiene 5+ conexiones, o "para
estar seguro" antes de terminar una generación normal — para eso ya existe
la regla de texto del Paso 3, que es gratis. Chequear visualmente cada
diagrama "por las dudas" gasta tokens de imagen rehaciendo lo que la regla
de texto ya resuelve sin costo.

## Paso 6: Escribir o actualizar

Envolvé la parte generada de cada `.md` entre marcadores:

```markdown
<!-- architecture-map:generated:start -->
...
<!-- architecture-map:generated:end -->
```

En corridas siguientes, reemplazá solo lo que está entre esos marcadores por
archivo — dejá intacto cualquier contenido agregado a mano afuera. Si un
archivo existente no tiene los marcadores (fue escrito a mano), no lo pises:
mostrale al usuario un resumen de qué cambiaría y preguntá si agrega los
marcadores o mergea a mano.

Si al re-explorar detectás que el material que justificaba un
`docs/diagrams/<slug>.md` ya no existe en el código (el flujo cambió, la
tabla se eliminó), **no borres el archivo solo** — decíselo al usuario y
preguntá si lo eliminás o lo dejás como referencia histórica.

## Paso 7: Reportar

- Lista de archivos creados/actualizados/sin cambios.
- Si algún diagrama no pudo validarse (prerequisito faltante) o falló la
  validación y no se pudo corregir: decilo explícito, con el error puntual.
- Si fue una actualización: resumen de 3-4 líneas de qué cambió, no el diff
  completo.
- Si el Paso 2 no encontró material para ningún diagrama de detalle, decilo
  explícito ("solo generé el boundary diagram; no encontré un flujo,
  modelo de dominio, schema, o máquina de estados con suficiente sustancia
  para un diagrama aparte") en vez de forzar contenido débil.
