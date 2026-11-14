# Instalación

Esta página reúne lo necesario para dejar el calendario listo en tu ordenador y arrancarlo, tanto en Windows como en Linux.

## Lo que necesitas

- **Node.js 18 o superior** ([descárgalo desde nodejs.org](https://nodejs.org/), versión LTS).
- Un navegador moderno (Chrome, Edge, Firefox, Brave…).
- **Windows** para arrancar con doble clic. En **Linux** todo está en [la sección Linux](#-linux).

## Primera vez (una sola vez)

1. Descarga o clona la carpeta del proyecto.
2. Abre una terminal **dentro de la carpeta** y ejecuta:

   ```bash
   npm install      # instala las dependencias
   npm run build    # compila la app en dist/
   ```

> La carpeta `dist/` es la versión compilada que sirve el servidor local, y no se sube al repositorio: por eso este paso hace falta siempre que la app haya cambiado o después de clonar el proyecto.

## Arrancar el calendario (Windows)

**Haz doble clic en `abrir-calendario.bat`.**

Ese archivo lo hace todo: libera el puerto si ha quedado un servidor antiguo abierto, levanta el servidor local y abre el calendario en el navegador en <http://localhost:5173>.

> [!WARNING]
> La ventana negra que se abre **es el servidor**. Mientras esté abierta, cada cambio se escribe también en `datos-calendario.json`.
>
> Si cierras esa ventana, la pestaña que ya tenías abierta sigue funcionando y guarda en el navegador, pero al recargar la página no volverá a cargarse: vuelve a hacer doble clic en el `.bat`.

¿Quieres un acceso con el icono del calendario? Crea un acceso al `.bat` y asígnale `public/favicon.ico` como icono.

## 🐧 Linux

En Linux no hay ventana negra ni doble clic en un `.bat`. Hay dos formas de arrancarlo.

**Desde el menú de aplicaciones**, sin que se abra ninguna ventana. La primera vez hay que instalarlo:

```bash
./abrir-calendario.sh --instalar
```

A partir de ahí aparece como **`Calendario`** en el menú y se abre con un clic.

**Desde una terminal**, que queda como ventana del servidor y te muestra los mensajes en vivo:

```bash
./abrir-calendario.sh
```

Arrancarlo otra vez reemplaza la instancia anterior, así que nunca quedan dos servidores abiertos. Para apagarlo, **`Cerrar Calendario`** en el menú de aplicaciones o `./abrir-calendario.sh --detener`.
