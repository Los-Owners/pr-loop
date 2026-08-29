# Prerequisito — por qué hace falta `jsdom` y qué hacer si falla

El paso de validación necesita el paquete oficial `mermaid` **más `jsdom`**,
que le da el DOM que `mermaid.parse()` necesita internamente para sanitizar
labels — sin `jsdom`, solo `sequenceDiagram` parsea bien en Node; `flowchart`,
`classDiagram`, `erDiagram` y `stateDiagram-v2` fallan con un error interno
ajeno a la sintaxis del diagrama que estás validando (no es que el diagrama
esté mal escrito, es que falta esa dependencia).

Instalación, de una sola vez — la skill **no instala nada sola**:

```bash
cd ~/.claude/skills/architecture-map/scripts
bun install   # o: npm install
```

Antes de validar (Paso 5), verificá que esté disponible:

```bash
node -e "require.resolve('mermaid', {paths: ['/Users/josueroquecastillo/.claude/skills/architecture-map/scripts']}); require.resolve('jsdom', {paths: ['/Users/josueroquecastillo/.claude/skills/architecture-map/scripts']})" 2>&1
```

Si falla, **no lo instales vos**: decile al usuario "Falta `mermaid` instalado
— corré `cd ~/.claude/skills/architecture-map/scripts && bun install` y
volvé a pedirme esto" y detenete ahí. El resto de la skill (explorar, escribir
el `.md`) funciona igual sin esto, pero **sin garantía de que el Mermaid
generado sea sintácticamente válido** — avisale eso al usuario explícitamente
si seguís sin poder validar.
