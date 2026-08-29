# Sesión

Cinco preguntas de producto sobre un PR que implementa una funcionalidad.

## Cómo se responde

- Opción múltiple. **«No sé» siempre es una opción.**
- Si la respuesta elegida no es «No sé», aparece la confirmación: **Lo confirmo** / **Prefiero
  revisarlo**. Es el eje de confianza, y es un compromiso, no un sentimiento.
- Si la respuesta es «No sé», no se pide confirmación y el resultado es amarillo.
- El porqué en texto es **obligatorio en las preguntas 1 y 3**, opcional en el resto. Se puede dictar.

## Qué muestra el panel izquierdo

**El diagrama que el dev construye, nunca el del código.** Se dibuja con sus respuestas. Mostrar el
diagrama real filtraría las respuestas: la pregunta 1 regalaría el participante que sobra.

| # | Pregunta | Panel izquierdo |
|---|---|---|
| 1 | ¿Qué servicios participan? | Solo App y API; cada servicio marcado agrega su línea de vida |
| 2 | ¿En qué orden ocurre? | Se dibujan las flechas sobre las líneas que el dev puso |
| 3 | ¿Desde cuántos items califica? | El umbral elegido se anota sobre «calcular total» |
| 4 | ¿Qué prueba cubre el umbral? | **No hay diagrama**: las tres pruebas, traducidas de sus aserciones |
| 5 | ¿Y si Precios no responde? | El camino alternativo elegido se agrega en ámbar |

Si el dev marca un servicio que no existe, **se dibuja igual**: es su mapa, no el nuestro.

## Las cinco preguntas (PR de ejemplo)

### 1 · Participantes · multi · texto obligatorio
«Además de la App y el API de Checkout, ¿qué servicios participan?»
Carrito ✓ · Precios ✓ · **Cupones ✓** · Inventario ✗ · No sé

Cupones está en el código y casi nadie lo marca: ahí nace el rojo.

### 2 · Orden · única
«Con esos servicios, ¿en qué orden ocurre el checkout de un carrito que califica?»
- **El API pide los items al Carrito, después el total a Precios, y responde** ✓
- El API pide el total a Precios, y Precios consulta al Carrito
- La App consulta al Carrito y a Precios por separado

### 3 · La frontera · única · texto obligatorio
«¿A partir de cuántos items califica un carrito para el descuento?»
Desde 10 · **Desde 11** ✓ · Depende de si hay cupón · No sé

La spec decía «10 o más»; el código usa `> 10`. La pregunta no menciona ningún operador.

### 4 · Cobertura · única
«Un carrito de exactamente 10 items no recibe descuento. ¿Cuál de estas pruebas lo cubre?»
- Comprueba que un carrito de 12 items termina con 10% menos
- Comprueba que con cupón se aplican los dos descuentos
- Comprueba que la respuesta del checkout no es nula
- **Ninguna de estas** ✓

Las pruebas se describen por **lo que comprueban**, nunca por su nombre. El nombre de un test es la
afirmación de la IA sobre lo que hace; es justo lo que no hay que creer. «Ninguna» tiene que ser
una respuesta frecuente y legítima.

### 5 · Camino faltante · única
«Si el Servicio de Precios no responde, ¿qué hace el checkout?»
- Devuelve el total sin descuento
- Reintenta y después falla con un error
- **No está contemplado: la petición queda esperando** ✓

## La trampa

Vive dentro de la pregunta 1 como una opción más (Inventario). No es un mecanismo aparte: tiene la
misma forma que todo lo demás, así que no se nota, y marcarla con confirmación significa
exactamente lo que nos importa — reclamar existencia de algo que no está.
