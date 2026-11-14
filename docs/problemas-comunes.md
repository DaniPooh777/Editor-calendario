# Problemas comunes

Esta página reúne los síntomas habituales y su solución, para cuando el calendario no arranca o no se ve como esperabas.

| Síntoma | Solución |
|---------|----------|
| "Falta la versión compilada" | Ejecuta `npm run build` en la carpeta del proyecto |
| El navegador no abre nada en `localhost:5173` | Cierra la ventana del servidor y vuelve a arrancarlo (el `.bat` y el `.sh` ya liberan el puerto si el que lo ocupa es el propio calendario) |
| `Permission denied` al ejecutar `./abrir-calendario.sh` | Dale permisos de ejecución con `chmod +x abrir-calendario.sh` (se pierden al pasar la carpeta por un ZIP o desde Windows) |
| Doble clic en `abrir-calendario.sh` abre el archivo en el editor | Es lo normal en Linux: usa **`Calendario`** en el menú de aplicaciones (`./abrir-calendario.sh --instalar`) |
| Doble clic en `Abrir Calendario.desktop` me abre el texto | Los gestores de GNOME no ejecutan `.desktop` de una carpeta cualquiera. Instálalo con `--instalar`, o click derecho → **Ejecutar como programa** |
| No aparece `Calendario` en el menú de aplicaciones | Vuelve a correr `./abrir-calendario.sh --instalar` (refresca el índice del menú con `update-desktop-database`) |
| No sé cómo apagar el calendario | **Cerrar Calendario** en el menú de aplicaciones, o `./abrir-calendario.sh --detener` |
| Quiero ver los mensajes del servidor en vivo | Arranca desde una terminal: `./abrir-calendario.sh` muestra la salida y `Ctrl+C` lo apaga |
| Quiero quitarlo del menú de aplicaciones | Borra `~/.local/share/applications/abrir-calendario.desktop` y `~/.local/share/applications/cerrar-calendario.desktop` |
| Lo abro desde el menú y no pasa nada, sin ningún error a la vista | No hay ventana: mira `servidor.log` en la carpeta del proyecto |
| El `.sh` avisa que el puerto 5173 lo ocupa otro programa | Ciérralo, o arranca el calendario en otro puerto con `PORT=5174 ./abrir-calendario.sh` |
| Cambio el código y no veo los cambios | El servidor sirve `dist/`: vuelve a compilar con `npm run build` |
| He perdido los eventos al borrar los datos del navegador | Revisa `datos-calendario.json`: la app lo usa como respaldo |
