---
name: repo-to-spec
description: A partir de una URL pública de GitHub (un repo, o un Pull Request) clona localmente el código y hace ingeniería inversa de su comportamiento actual (no una feature nueva) para producir un único documento Markdown con la plantilla de /to-spec, reinterpretada para describir lo que el sistema ya hace hoy, con diagramas Mermaid embebidos y validados contra el parser oficial. Si el input es una URL de PR, explora el HEAD del PR (el código con esos cambios ya aplicados) y agrega una sección propia con los metadatos del PR y el análisis de impacto sobre el resto de la spec. No publica a ningún issue tracker - el .md suelto es el único entregable. Usar cuando el usuario pida "generar la spec de este repo", "documentar qué hace este repositorio", "ingeniería inversa de este repo a spec", "generar la spec de este PR", pase una URL de GitHub (repo o PR) y pida un documento de especificación técnica de su comportamiento actual, o algo equivalente. No usar para especificar una feature nueva a construir (para eso, /to-spec o /shaping) ni para generar solo diagramas de arquitectura sin el resto de la spec (para eso, /architecture-map).
---

# Repo to Spec

Ingeniería inversa de un repo público de GitHub a un documento de spec único.
El repo real es la única fuente de verdad: los `.md` que el propio repo trae
(README, docs) sirven solo para orientarte por dónde empezar a mirar, nunca
como hecho confirmado - todo lo que termine en la spec se verifica contra el
código que efectivamente se ejecuta.

Salida: **un solo archivo Markdown**, sin publicar a ningún tracker.

## Alcance

Solo repos públicos. Si el `git clone` falla por autenticación, decíselo al
usuario y detenete ahí - no pidas ni intentes usar credenciales.

## Paso 0: Identificar el tipo de input

- **URL de repo**: `https://github.com/<owner>/<repo>` (con o sin barra final).
- **URL de PR**: `https://github.com/<owner>/<repo>/pull/<n>`.

Si matchea el patrón de PR, quedate con `<owner>`, `<repo>` y `<n>`, derivá la
URL del repo (`https://github.com/<owner>/<repo>`) quitando el sufijo
`/pull/<n>`, y seguí el flujo de PR (Paso 1b) en vez del flujo de repo
(Paso 1a). En cualquier otro caso, es una URL de repo - flujo normal.

## Paso 1a: Clonar (input = repo)

```bash
git clone --depth 1 <url> <tmp-dir>
```

Usá el directorio de scratchpad de la sesión si hay uno disponible; si no,
`mktemp -d`. Si el clone falla (URL inválida, repo no existe, repo privado),
reportá el error puntual al usuario y parate ahí.

## Paso 1b: Clonar y aterrizar en el HEAD del PR (input = PR)

El resto de la spec (Paso 2 en adelante) tiene que describir el repo **con
los cambios del PR ya aplicados**, no la rama por defecto sin ellos - así
que en vez de clonar y quedarte ahí, aterrizás en el commit HEAD del PR:

```bash
git clone --depth 1 <repo-url> <tmp-dir>
cd <tmp-dir>
git fetch --depth 1 origin refs/pull/<n>/head
git checkout FETCH_HEAD
```

`refs/pull/<n>/head` es una referencia que GitHub expone en el propio repo
base para todo PR, venga o no de un fork - no hace falta encontrar ni clonar
el fork del contribuyente. Si el clone o el fetch fallan (repo no existe, PR
no existe, repo privado), reportá el error puntual y parate ahí, igual que
en el Paso 1a.

Además, sin tocar el clon, juntá los metadatos del PR contra los endpoints
públicos de GitHub (sin token):

- `https://api.github.com/repos/<owner>/<repo>/pulls/<n>` - título,
  descripción, autor, rama base (`base.ref`) y head (`head.ref`), SHAs
  (`base.sha`, `head.sha`), estado (abierto/cerrado/mergeado).
- `https://api.github.com/repos/<owner>/<repo>/pulls/<n>/files` - archivos
  tocados, con líneas agregadas/eliminadas por archivo (paginado de a 30; si
  hay más páginas, decilo en el reporte final en vez de asumir que es todo).
- `https://api.github.com/repos/<owner>/<repo>/compare/<base.sha>...<head.sha>`
  - campo `behind_by`: cuántos commits detrás de la base está el HEAD del
    PR. Reportalo tal cual en la spec - es la transparencia que compensa
    explorar el HEAD del PR en vez de la base actual.
- `https://github.com/<owner>/<repo>/pull/<n>.diff` - el diff crudo. Se
  **enlaza** desde la spec, no se pega completo (mismo criterio que "no
  incluyas snippets de código" del Paso 4 - un diff grande desactualiza la
  spec al instante).

## Paso 2: Explorar en capas

No leas el repo entero línea por línea - orientate por capas, como un
ingeniero nuevo:

1. **Señales de alto nivel**: README, manifiestos (`package.json`,
   `pyproject.toml`, `Cargo.toml`, etc.), config de despliegue, estructura de
   carpetas de primer nivel (`ls -R` acotado o `tree`). Estas señales son
   solo para orientarte - **nunca las cites como comportamiento confirmado**,
   un README puede estar desactualizado respecto al código real.
2. **Puntos de entrada**: a partir de esas señales, ubicá rutas/endpoints,
   comandos CLI, componentes principales de UI, handlers de eventos.
3. **Profundización selectiva**: entrá solo a los módulos que esas señales
   marcan como el núcleo del comportamiento. Cada afirmación que vaya a la
   spec final tiene que estar respaldada por el código que la implementa
   (la función, la ruta, el schema), no por lo que un comentario o doc dice
   que hace.

## Paso 3: Decidir qué diagramas generar

Seguí el mismo criterio y la misma tabla de tipos de diagrama que usa
`architecture-map` (`~/.claude/skills/architecture-map/SKILL.md`, Paso 2):
**siempre** un `overall-architecture` (`flowchart` de límites de producción),
y condicionalmente `sequenceDiagram`, `classDiagram`, `erDiagram`,
`stateDiagram-v2` según lo que el código realmente justifique. No generes un
diagrama por completar el catálogo - cada uno es una hipótesis a confirmar
contra el código.

Aplicá también las reglas de sintaxis de
[`~/.claude/skills/architecture-map/references/mermaid-syntax-rules.md`](~/.claude/skills/architecture-map/references/mermaid-syntax-rules.md)
(frontmatter de tema oscuro, `;` sin escapar, `end` reservado, etc.) - son las
que hacen que el diagrama pase la validación del Paso 5.

## Paso 4: Redactar la spec

Un solo archivo, con la plantilla de `/to-spec` reinterpretada para
comportamiento **existente** (no una feature a construir):

<spec-template>

<!--
Solo si el input fue una URL de PR (Paso 1b): esta sección va primero,
antes de "Problem Statement" - encuadra que el resto del documento describe
el repo CON estos cambios aplicados, no la rama por defecto tal cual está
hoy. Si el input fue una URL de repo, esta sección no existe.
-->

## Pull Request bajo revisión

**Metadatos** (hechos, tal como los devuelven los endpoints del Paso 1b):

- Título, autor, rama `<head.ref>` → `<base.ref>`, estado.
- Commits detrás de la base: el valor de `behind_by`.
- Archivos tocados, con líneas agregadas/eliminadas por archivo.
- Link al diff completo (`.../pull/<n>.diff`) - no lo pegues entero acá.

**Impacto sobre esta spec** (interpretado, no solo listado del diff): qué
User Story o Implementation Decision de las secciones de abajo agrega,
modifica, o rompe este PR. Esto es lo que un resumen crudo del diff no te
da - la conexión con el comportamiento ya documentado. Ejemplo de formato:

- Agrega la User Story #N (`<gist>`).
- Modifica la Implementation Decision "`<nombre>`": `<qué cambia>`.

## Problem Statement

El problema que el sistema resuelve hoy, inferido de su comportamiento real
(no lo que se propone resolver a futuro).

## Solution

Cómo lo resuelve el sistema actualmente.

<!-- Diagrama de overall-architecture acá, ya validado (Paso 5) -->

## User Stories

Una lista larga y numerada de capacidades que el sistema **ya entrega**,
formato:

1. As an `<actor>`, I can `<capability>`, so that `<benefit>`

Cada una tiene que corresponder a una capacidad verificada en el código, no a
una inferida solo de nombres de archivo o de la documentación del repo.

## Implementation Decisions

Decisiones de implementación **observadas** en el código real: módulos,
interfaces, schema, contratos de API, interacciones específicas. Intercalá
acá los diagramas de detalle del Paso 3 (secuencia, ER, clases, estados),
cada uno ya validado, junto a la decisión que ilustran. No incluyas rutas de
archivo ni snippets de código - se desactualizan rápido.

## Testing Decisions

Qué tests existen hoy en el repo, qué cubren, y qué patrones de testing ya
están presentes (no una recomendación de qué testear, sino lo que ya está).

## Out of Scope

Capacidades que el sistema explícitamente **no** tiene o límites observados
(ej. "no maneja autenticación multi-tenant", "no hay soporte para X").

## Further Notes

Inconsistencias, deuda técnica, o quirks detectados durante la exploración
que valga la pena señalar.

</spec-template>

Guardá el resultado en el directorio de trabajo actual, salvo que el usuario
haya pasado una ruta explícita al invocar la skill (en ese caso, usá esa
ruta). Nombre por default:

- Input = repo: `./<nombre-del-repo>.spec.md`.
- Input = PR: `./<nombre-del-repo>-pr-<n>.spec.md` - así corridas distintas
  del mismo repo (rama principal vs. PR #12 vs. PR #43) no se pisan entre sí.

## Paso 5: Validar cada diagrama

Por cada diagrama Mermaid escrito (el `overall-architecture` incluido),
**antes** de darlo por terminado en el documento:

1. Escribí el texto Mermaid (sin el fence) a un archivo temporal.
2. Corré:
   ```bash
   node ~/.claude/skills/architecture-map/scripts/validate.mjs <temp.mmd>
   ```
3. Si imprime `OK`: borrá el temporal, seguí.
4. Si falla: leé el error (línea + qué esperaba el parser), corregí el
   `.mmd` y volvé a validar. No pegues el error crudo en la spec sin antes
   intentar arreglarlo vos mismo.
5. Borrá el archivo temporal.

Si `mermaid`/`jsdom` no están instalados en
`~/.claude/skills/architecture-map/scripts/` (prerequisito compartido con
`architecture-map`), avisale al usuario que pida instalarlos ahí (`cd
~/.claude/skills/architecture-map/scripts && bun install`) y advertí
explícitamente en el reporte final que los diagramas no fueron validados.

## Paso 6: Limpiar

Borrá el directorio temporal del clon (`rm -rf <tmp-dir>`). El único
entregable que queda es el `.md` - el clon fue un artefacto de trabajo
intermedio, no el resultado.

## Paso 7: Reportar

- Ruta del archivo `.md` generado.
- Cuántos diagramas se incluyeron y de qué tipo.
- Si algún diagrama no pudo validarse, decilo explícito con el motivo.
- Si algo del repo quedó fuera de la profundización (repo muy grande, un
  módulo no revisado a fondo), decilo en vez de completar la spec con
  suposiciones.
- Si el input fue un PR: cuántos commits detrás de la base quedó el HEAD
  explorado, y si `pulls/<n>/files` tenía más páginas de las leídas (la spec
  podría no listar el 100% de los archivos tocados en un PR muy grande).
