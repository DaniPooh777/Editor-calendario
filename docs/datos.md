# Tus datos

Esta página cuenta dónde se guarda tu calendario y cómo llevártelo o hacer una copia de seguridad.

Se guardan en dos sitios, y los dos son tuyos:

1. **`datos-calendario.json`**, en la misma carpeta del proyecto: lo escribe el servidor local cada vez que cambias algo.
2. **El almacenamiento del navegador**, para que la app se abra al instante aunque el servidor no esté.

Si el navegador borra sus datos (o abres una ventana privada), el archivo `.json` es el que te salva: al arrancar, la app compara ambos y toma la versión más nueva.

Para hacer una copia de seguridad, copia `datos-calendario.json`. Para llevarte el calendario a otro ordenador, copia la carpeta completa junto con ese archivo.
