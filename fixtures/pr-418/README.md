# PR de ejemplo · acme/checkout #418

«Aplicar descuento por volumen en el checkout». Es el caso sobre el que se demuestra el producto.

Contiene los tres defectos que enseñamos, uno de cada tipo:

1. **Frontera mal puesta** — la spec decía «10 o más», el código usa `> 10`, así que el carrito de
   exactamente 10 se queda fuera. Ninguna prueba lo toca.
2. **Algo que nadie pidió** — la llamada al Servicio de Cupones. En el diagrama de secuencia aparece
   como un participante entero de más, que se lee desde el fondo de la sala.
3. **Una prueba que no prueba nada** — `expect(res).not.toBeNull()` sobre una función que siempre
   devuelve algo. Pasa aunque se borre el descuento entero.

`analysis.json` es la salida que el analizador debe producir para este diff. **Es el contrato:** la
UI se construye contra este archivo sin esperar a que el analizador funcione, y el analizador se
considera listo cuando lo reproduce.

Para el demo, este análisis va precomputado. El analizador intenta generarlo en vivo; si lo logra,
mejor.
