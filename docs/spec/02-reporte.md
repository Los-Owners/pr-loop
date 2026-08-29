# Reporte

Aparece al final del mismo flujo, dentro de la app. Se arma con las respuestas reales de la sesión.

## Encabezado

Veredicto en una frase, coloreado por el peor resultado, más el recuento de los cuatro colores.

- Con puntos ciegos: «Confirmaste N respuestas que el código contradice.»
- Sin rojos pero con amarillos: «Hay partes de este feature que todavía no conoces.»
- Limpio: «Este checkout lo posees.»

## Sección 1 · La secuencia del código, pintada por tus respuestas

Diagrama de secuencia con **tabs por camino**: camino feliz, no califica, justo en el umbral, y
Precios no responde.

Cada mensaje toma el color de **la pregunta que lo tocó**:

| Mensaje | Pregunta |
|---|---|
| `aplicar cupón` | 1 · participantes |
| `calcular total`, umbral | 3 · la frontera |
| Los del camino de caída | 5 · camino faltante |
| El resto del camino feliz | 2 · orden |

Lo que ninguna pregunta tocó va en **gris con la etiqueta «No evaluado»** en la leyenda. Un neutro
sin nombre parece un bug; un neutro con nombre es honestidad, y le dice al dev qué le falta revisar.

## Sección 2 · Pregunta por pregunta

Una tarjeta por pregunta, con borde del color que le tocó:

- **Respondiste** — la opción elegida y si la confirmó o prefirió revisarla
- **Dijiste** — su texto, literal
- **Producto** — qué hace el código, en lenguaje de negocio
- **Por qué pueden diferir** — solo cuando hay divergencia (rojo o amarillo). En verde y azul no
  aparece: si sale en las cinco se vuelve ruido y se deja de leer justo antes de la vez que importa.
- **Ver evidencia en el código** — colapsado. Es el único lugar donde aparece código.

Las hipótesis se **ofrecen**, nunca se afirman. El sistema no puede saber cuál es cierta:

- La IA lo agregó por su cuenta y nadie lo revisó al aprobar.
- Sí se pidió, pero en un ticket que el dev no vio.
- El dev conocía la pieza y no la asoció a este flujo.

## Sección 3 · Qué te llevas

- **Un prompt copiable**, armado con los huecos reales de esta sesión. Pide cuentas, no arreglos, y
  cierra con «No cambies código todavía. Primero respóndeme.» Si el dev acertó todo, el prompt
  cambia a pedir confirmación.
- **En qué mejorar** — un párrafo sobre el patrón de error, no sobre la respuesta puntual.
- **Skills** — tres como máximo, elegidas según los colores que salieron, con nombres reales del
  ecosistema. Nunca inventar nombres: si el jurado busca una y no existe, se quema la credibilidad.
