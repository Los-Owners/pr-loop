# Reglas de sintaxis Mermaid

Consultá esto al escribir cada diagrama (Paso 3 del `SKILL.md`), antes de darlo por
terminado. Son las reglas que hacen que el diagrama pase la validación del Paso 5.

## Todos los tipos — abrí cada diagrama con un frontmatter de tema oscuro

```
---
config:
  theme: dark
---
flowchart LR
    ...
```

Esto es soporte nativo del parser oficial (confirmado contra `mermaid.parse()`
y renderizado real, no una suposición) — controla el tema por-diagrama sin
ningún renderer externo, ningún JS, ninguna dependencia nueva. Reemplaza al
`%%{init: {...}}%%` de ejemplos viejos, que está **deprecado desde v10.5.0**
— nunca uses esa sintaxis, usá el frontmatter `config:` de arriba. El
frontmatter va **dentro** del fence ` ```mermaid `, como primeras líneas del
diagrama, no en el frontmatter YAML del propio archivo `.md` (son dos cosas
distintas). El primer `---` tiene que ser el único carácter en su línea.

**Riesgo conocido, aceptado a propósito**: GitHub tiene un bug documentado
(github.com/orgs/community/discussions/172498) donde tema oscuro + un
diagrama grande/complejo puede colgar su renderer y mostrar "Unable to
render rich display" en vez del diagrama — confirmado en la práctica con un
`sequenceDiagram` de ~24 mensajes. El diagrama sigue siendo 100% válido
(`mermaid.parse()` lo confirma, y renderiza bien fuera de GitHub) — es un
bug de GitHub, no nuestro, y no hay workaround confiable del lado del
`.md`. Decisión explícita: mantener el tema oscuro igual en todos los
diagramas por consistencia, no bajarlo a `default` para los grandes. Si un
diagrama puntual queda así de roto en GitHub, es este bug — no hay que
"arreglarlo" reescribiendo contenido que ya está validado.

## Todos los tipos — reglas generales

- Nombres de nodos/participantes/clases en el mismo casing que usa el código
  real (no inventes nombres bonitos si el código dice `OrderSvc`, usá
  `OrderSvc`).
- No agregues campos, métodos, o pasos que no viste en el código.
- **Si un solo nodo/participante/clase termina con 5 o más conexiones
  (edges, mensajes, relaciones) apuntando hacia o desde él**, es la señal de
  que el diagrama va a quedar apretado ahí ("edge spaghetti") una vez
  renderizado. Antes de darlo por terminado: reordená la declaración de los
  nodos para que los conectados queden adyacentes (Mermaid layoutea según
  orden de declaración), o partí ese cluster en su propio `subgraph`, o
  promovelo a un diagrama de detalle aparte si el cluster es un área en sí
  misma.
- **Nunca uses `;` sin escapar dentro del texto de un label, mensaje, o
  nota.** No es puntuación inocente: Mermaid lo trata como separador de
  sentencias (equivalente a un salto de línea) en todos los tipos de
  diagrama, así que un `;` a mitad de una frase corta el mensaje ahí y rompe
  el parseo del resto — confirmado con evidencia real contra el parser
  oficial (`mermaid.parse()`) y documentado en `intro/syntax-reference.html`.
  Preferí reformular sin `;` (coma, `--`, o dos líneas con `<br/>`); si de
  verdad necesitás el carácter `;` literal, usá la entidad oficial `#59;`
  — no reemplaces el `;` por otra cosa que cambie el sentido del texto.
- **`end` es palabra reservada** en `flowchart` y `sequenceDiagram`. Si
  aparece como texto completo de un nodo o mensaje (ej. describiendo un
  estado real de "session end" o "end of stream"), envolvela en comillas,
  paréntesis, o corchetes — `["end"]`, `(end)` — para que no rompa el
  parseo. Es case-sensitive: `"End"`/`"END"` también evita el problema.
- **`#` es carácter de comentario en `sequenceDiagram`** — un `#` crudo en un
  mensaje (común si el código real referencia un issue/PR `#123`, o un color
  hex) se come el resto de la línea. Usá la entidad `&num;` en su lugar.
- **`classDiagram`: nombres de clase no alfanuméricos necesitan backticks.**
  Un nombre real del código con `$`, `::`, `.`, u otro símbolo fuera de
  letras/números/guiones/guion bajo rompe el parser a menos que lo envuelvas
  en backticks: `` `Nombre::Con.Simbolos` ``. Relevante porque la regla de
  "usar el nombre real del código" puede generar justo este caso.

## `flowchart` (boundary, dependency-map, storage)

- IDs en kebab-case. Etiquetas de dos líneas: `api["API Worker\nPublic data plane"]`.
- Agrupá por plataforma de despliegue con `subgraph`.
- Toda flecha con etiqueta que explica el motivo, no solo que existe.
- `flowchart LR` por defecto, `TD` si es más jerárquico. Si el diagrama tiene
  2+ `subgraph` grandes, tené en cuenta que el layout real (dagre, el que usa
  GitHub) puede apilarlos verticalmente en vez de dejarlos lado a lado aunque
  el diagrama sea `LR` — no es un error, es como decide el motor real cuando
  no entran horizontalmente. No lo fuerces con hacks; si te preocupa,
  achicá la cantidad de nodos por subgraph.
- `classDef` para resaltar: `external` (terceros), `entry` (puntos de entrada
  públicos), `store` (almacenamiento persistente), `concern` (riesgo conocido).

## `sequenceDiagram`

- Un `participant` por servicio/capa real involucrada, en el orden en que
  aparecen en el flujo.
- Mostrá el camino de error relevante (ej. credenciales inválidas), no solo
  el happy path, si el código lo maneja explícitamente.
- Mensajes con el nombre real de la operación/endpoint, no una paráfrasis vaga.

## `classDiagram`

- Solo relaciones que el código expresa (herencia real, campo que referencia
  otra clase, interfaz implementada) — no relaciones "conceptuales" inventadas.
- Mostrá visibilidad (`+`/`-`) solo si el lenguaje del proyecto la tiene.

## `erDiagram`

- Cardinalidad tal como está en la migración/modelo (`||--o{`, etc.), no una
  suposición.
- Solo columnas relevantes para entender la relación, no el schema completo
  campo por campo si la tabla es ancha — decilo en la nota, no en el diagrama.

## `stateDiagram-v2`

- Un estado por valor real del enum. Una transición por cada función/rama de
  código que efectivamente cambia el estado — no inventes transiciones
  "lógicas" que el código no implementa.
- Soporta `classDef`/`class`/`:::` igual que `flowchart` (no aplica a
  estados start/end ni compuestos) — usá la misma paleta de `entry`/
  `external`/`store`/`concern` si el estado lo amerita, para consistencia
  visual con el resto de los diagramas.
