# Producto

## Objetivos

- **OBJ-1** Medir si quien aprueba un diff de IA entiende lo que el código realmente hace.
- **OBJ-2** Hacer visible el elemento que la IA agregó y que el dev no reconoce.
- **OBJ-3** Distinguir una prueba que protege de una que solamente pasa.
- **OBJ-4** Registrar con cuánta confianza se responde, no solo si se acierta.
- **OBJ-5** Entregar un veredicto que cite el código y las palabras del propio dev.

Si algo no sirve a uno de estos cinco, no se construye.

## Casos de uso

- **CU-01** El dev pega la URL de un PR público y obtiene una sesión sin instalar nada.
- **CU-02** El dev elige el área de las preguntas; hoy solo Producto está disponible.
- **CU-03** El sistema reconstruye los specs desde el código: participantes, caminos, umbrales y pruebas.
- **CU-04** El sistema pregunta por el producto antes de mostrar cualquier análisis.
- **CU-05** El dev responde con opción múltiple; «No sé» siempre está disponible.
- **CU-06** Cuando la respuesta no es «No sé», el sistema pide confirmación explícita.
- **CU-07** El dev escribe el porqué; es obligatorio en las preguntas 1 y 3.
- **CU-08** El dev puede dictar ese porqué en vez de escribirlo.
- **CU-09** El panel izquierdo muestra el diagrama que el dev va construyendo con sus respuestas.
- **CU-10** El sistema cuela un participante que no existe entre las opciones.
- **CU-11** El reporte muestra la secuencia del código pintada por corrección y confianza.
- **CU-12** El reporte cita la frase del dev junto al comportamiento que la contradice.
- **CU-13** Ante divergencia, el reporte ofrece hipótesis sin afirmar ninguna.
- **CU-14** El dev se lleva un prompt para pedir cuentas en su propia sesión.
- **CU-15** El dev ve el historial de PRs revisados, con el color de su peor resultado.

## Fuera de alcance

- **NO-1** No corregimos el código ni sugerimos el fix.
- **NO-2** No pedimos specs, tickets ni documentos: el código es la única fuente.
- **NO-3** No ejecutamos los tests ni el código del repositorio.
- **NO-4** No soportamos repos privados.
- **NO-5** No damos nota numérica ni ranking entre personas.
- **NO-6** Un solo lenguaje: el del PR de ejemplo.
- **NO-7** Las áreas Implementación y Buenas prácticas se muestran deshabilitadas, no se implementan.

## Decisión pendiente sobre la cuenta

El login vive en el drawer y **no bloquea CU-01**. La primera sesión tiene que poder completarse
sin cuenta: esa fricción cero es lo que hace que alguien pruebe el producto en diez segundos.
Guardar la sesión es lo único que exige estar logueado.
