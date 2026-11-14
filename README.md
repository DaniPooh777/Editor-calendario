[![Banner Editor Calendario Sencillo](docs/imagenes/Banner_Github.jpg)](docs/imagenes/Banner_Github.jpg)

# Editor Calendario Sencillo

<p align="center">
  <a href="#-qué-puedes-hacer">Qué puedes hacer</a> ·
  <a href="#-puesta-en-marcha">Puesta en marcha</a> ·
  <a href="#-cómo-se-usa">Cómo se usa</a> ·
  <a href="#-dónde-quedan-tus-datos">Tus datos</a> ·
  <a href="#-problemas-comunes">Problemas comunes</a> ·
  <a href="#-estructura-del-proyecto">Estructura</a>
</p>

**Editor Calendario Sencillo** es una aplicación web para crear a mano el calendario del mes: escribes tus eventos, los pintas con colores, añades una leyenda y notas con formato, y al final copias el mes como una imagen limpia para compartirlo o imprimirlo.

Nació como agenda de la universidad —asignaturas, entregas, exámenes, horarios—, pero sirve para cualquier mes que quieras organizar a tu manera.

Todo funciona **en tu ordenador**: no hay cuentas, no hay nube y nada viaja a un servidor de terceros.

<!-- Captura del proyecto:

Para publicarla, guarda la imagen como `docs/imagenes/captura.png` y descomenta esta línea:

![Vista principal del Editor Calendario Sencillo](docs/imagenes/captura.png)

-->

---

## 📋 Qué puedes hacer

| Función | Qué hace |
|---------|----------|
| **Cuadrícula mensual** | Un mes completo, de lunes a domingo, con casillas en las que puedes hacer clic |
| **Eventos** | Título, hora opcional (con selector de horas y minutos) y color. Pueden pintar toda la casilla o quedar sin fondo, solo con el texto |
| **Eventos de varios días** | Con **Hasta**, el evento se dibuja en todo el rango. Los rangos van en una franja propia, pegada arriba de la casilla |
| **Eventos que se repiten** | Cada semana (eligiendo qué días de la semana y cada cuántas semanas) o cada mes (mismo día del mes) |
| **Límite de repeticiones** | Campo **Repetir (veces)** para que una serie no siga para siempre. Vacío = sin límite |
| **Borrar una repetición** | Si borras una ocurrencia, desaparecen esa y las siguientes; las anteriores se quedan como estaban |
| **Arrastrar y soltar** | Mueves un evento de una casilla a otra, y los rangos se desplazan enteros |
| **Deshacer** | `Ctrl+Z` revierte el último cambio de eventos o de leyenda |
| **Leyenda fija** | Una sola lista de categorías compartida por todos los meses: crear, renombrar, recolorear y borrar |
| **Pincel** | Pintas casillas con el color elegido; el `✕` significa "sin fondo" y limpia el color |
| **Notas del mes** | Bloque de notas por mes con negrita, cursiva, subrayado, tres tamaños de letra y sublistas con `Tab` |
| **Estaciones** | Cuatro ambientaciones que cambian el tono del fondo, las casillas y las notas, con decoraciones pastel |
| **Modo oscuro** | Tema claro u oscuro, se guarda con el calendario |
| **Copiar calendario** | Exporta el mes como PNG limpio, sin botones ni menús, directo al portapapeles |
| **Guardado automático** | Todo se guarda solo; al volver a abrir está igual |

---

## 🚀 Puesta en marcha

### Lo que necesitas

- **Windows** para arrancar con doble clic, o **Linux** para arrancar con `./abrir-calendario.sh`. La app en sí funciona en cualquier sistema con Node.
- **Node.js 18 o superior** ([descárgalo desde nodejs.org](https://nodejs.org/), versión LTS).
- Un navegador moderno (Chrome, Edge, Firefox, Brave…).

### Primera vez (una sola vez)

1. Descarga o clona la carpeta del proyecto.
2. Abre una terminal **dentro de la carpeta** y ejecuta:

   ```bash
   npm install      # instala las dependencias
   npm run build    # compila la app en dist/
   ```

> La carpeta `dist/` es la versión compilada que sirve el servidor local, y no se sube al repositorio: por eso este paso hace falta siempre que la app haya cambiado o después de clonar el proyecto.

### Arrancar el calendario

**Windows: haz doble clic en `abrir-calendario.bat`.**
**Linux: ábrelo como `Calendario` en el menú de aplicaciones (la primera vez hay que instalarlo con `./abrir-calendario.sh --instalar`), o ejecuta `./abrir-calendario.sh` en una terminal.**

Los dos hacen lo mismo: liberan el puerto si ha quedado un servidor antiguo abierto, levantan el servidor local y abren el calendario en el navegador en <http://localhost:5173>.

> [!WARNING]
> En Windows, la ventana negra que se abre **es el servidor**; en Linux abierto desde una terminal, esa terminal es el servidor. Mientras el servidor esté vivo, cada cambio se escribe también en `datos-calendario.json`.
>
> Si lo cierras, la pestaña que ya tenías abierta sigue funcionando y guarda en el navegador, pero al recargar la página no volverá a cargarse: vuelve a arrancar el calendario.

En Linux abierto desde el menú de aplicaciones el servidor **no muestra ninguna ventana**: corre en segundo plano y se apaga con **Cerrar Calendario** en ese mismo menú (o con `./abrir-calendario.sh --detener`). Sus mensajes van a `servidor.log`, en la carpeta del proyecto.

Dos diferencias del `.sh` que conviene saber:

- Si el puerto 5173 lo ocupa **otro** programa, avisa y no lo mata: en Windows el `.bat` cierra lo que sea que esté en el puerto; el `.sh` solo cierra servidores del calendario, para no tumbar tu otro servidor.
- Se puede arrancar en otro puerto con `PORT=5174 ./abrir-calendario.sh`.

### Abrir con un clic (Linux)

Ejecuta una vez:

```bash
./abrir-calendario.sh --instalar
```

Eso deja **`Calendario`** y **`Cerrar Calendario`** en el menú de aplicaciones, con el icono del calendario y apuntando a esta carpeta. Desde ahí se abre con un clic, como cualquier otro programa, y **sin ninguna ventana de terminal**: el servidor queda en segundo plano y sus mensajes se escriben en `servidor.log`.

Para apagarlo, **Cerrar Calendario** en el mismo menú. Arrancarlo otra vez desde el menú reemplaza la instancia anterior, así que nunca quedan dos.

Los accesos se regeneran solos en cada arranque, así que siguen funcionando aunque muevas la carpeta. Tienen rutas absolutas de tu máquina: son locales y no se suben al repositorio.

El mismo comando deja también `Abrir Calendario.desktop` y `Cerrar Calendario.desktop` dentro de la carpeta del proyecto. Ahí **no** se ejecutan con doble clic: los gestores de archivos de GNOME dejaron de ejecutar `.desktop` que estén fuera del menú de aplicaciones, a propósito y por seguridad. Para usarlos desde la carpeta, click derecho → **Ejecutar como programa**.

`./abrir-calendario.sh --acceso` regenera solo esos dos archivos, sin tocar el menú. Y `./abrir-calendario.sh` a secas (desde una terminal) abre el calendario **con** la terminal como ventana del servidor: útil cuando algo falla y quieres ver los mensajes en vivo.

> [!NOTE]
> En Linux, doble clic sobre un `.sh` tampoco lo ejecuta: el gestor de archivos lo abre como texto. Las dos vías con un clic son el menú de aplicaciones y la terminal (`./abrir-calendario.sh`).

¿Quieres un acceso con el icono del calendario? En Windows, crea un acceso al `.bat` y asígnale `public/favicon.ico` como icono. En Linux ya lo tienes generado: el `.desktop` ya lleva `public/favicon.svg` como icono.

---

## 🧭 Cómo se usa

### Navegación

| Acción | Resultado |
|--------|-----------|
| `‹` / `›` en el título | Mes anterior / siguiente |
| Haz clic en el fondo de una casilla | Crea un evento en ese día |
| Haz clic sobre un evento | Abre el diálogo para editarlo o borrarlo |
| Arrastra un evento | Lo mueves a otro día (un rango se mueve completo) |
| `Ctrl+Z` | Deshace el último cambio de eventos o de leyenda |
| Haz clic en el nombre de la leyenda | Edita esa categoría |
| Haz clic en la muestra de color de la leyenda (con un color de pincel elegido) | Recolorea esa categoría con el color del pincel |

### Crear un evento

En el diálogo rellenas:

- **Título** (obligatorio) y **Hora** opcional.
- **Hasta**: si el evento dura varios días, se pinta en todo el rango.
- **Repetir**: sin repetición, **cada semana** o **cada mes**.
  - En modo semanal aparece **Cada (semanas)** —por ejemplo 2, para que caiga una semana sí y otra no— y los días **L M X J V S D** donde quieres que caiga.
  - **Repetir (veces)** limita la serie: 5 significa cinco ocurrencias y nada más. Vacío = para siempre.
- **Color**, **Colorear toda la casilla** o **Sin fondo**.

> Cuando editas una ocurrencia se edita **toda la serie**. Cuando **borras** una ocurrencia, se borran esa y las siguientes: las anteriores quedan intactas. Si borras la primera, desaparece el evento entero.

### Herramientas de la barra superior

| Herramienta | Para qué sirve |
|-------------|----------------|
| **Estación** | Cambia la ambientación (Primavera, Verano, Otoño, Invierno) |
| **Modo oscuro** | Alterna entre tema claro y oscuro |
| **Pincel** | Eliges un color; con `✕` limpias el color y los eventos nacen "sin fondo" |
| **Copiar Calendario** | Genera el PNG del mes y lo copia al portapapeles (si el navegador lo bloquea, lo descarga) |

### Notas del mes

Cada mes tiene su propio bloque de notas, con un guion al principio de cada línea.

| Tecla / botón | Acción |
|---------------|--------|
| `N` / `C` / `S` | Negrita / Cursiva / Subrayado |
| Selector **Tamaño** | Pequeña, Normal o Grande sobre el texto seleccionado |
| `Tab` / `Shift+Tab` | Anida o desanida la línea actual (hasta 3 niveles) |
| `Enter` | Nueva línea con guion, heredando el nivel de la anterior |
| Clic fuera | El texto se guarda solo |

---

## 💾 Dónde quedan tus datos

Se guardan en dos sitios, y los dos son tuyos:

1. **`datos-calendario.json`**, en la misma carpeta del proyecto: lo escribe el servidor local cada vez que cambias algo.
2. **El almacenamiento del navegador**, para que la app se abra al instante aunque el servidor no esté.

Si el navegador borra sus datos (o abres una ventana privada), el archivo `.json` es el que te salva: al arrancar, la app compara ambos y toma la versión más nueva.

Para hacer una copia de seguridad, copia `datos-calendario.json`. Para llevarte el calendario a otro ordenador, copia la carpeta completa junto con ese archivo.

---

## 🎨 Estaciones

Cada estación cambia la cara del calendario sin tocar tus eventos ni tus notas:

| Estación | Ambiente |
|----------|----------|
| 🌸 **Primavera** | Fondo verde suave, flores y mariposas |
| ☀️ **Verano** | Fondo dorado, soles, nubes y helados |
| 🍂 **Otoño** | Fondo arena, hojas y calabazas |
| ❄️ **Invierno** | Fondo azul claro, copos y regalos |

Las decoraciones se reparten sobre la cuadrícula y **no** aparecen en el PNG: la captura queda limpia, solo con tu calendario.

---

## 🔧 Problemas comunes

| Síntoma | Solución |
|---------|----------|
| "Falta la versión compilada" | Ejecuta `npm run build` en la carpeta del proyecto |
| El navegador no abre nada en `localhost:5173` | Cierra la ventana del servidor y vuelve a arrancarlo (el `.bat` y el `.sh` ya liberan el puerto si el que lo ocupa es el propio calendario) |
| `Permission denied` al ejecutar `./abrir-calendario.sh` | Dale permisos de ejecución con `chmod +x abrir-calendario.sh` (se pierden al pasar la carpeta por un ZIP o desde Windows) |
| Doble clic en `abrir-calendario.sh` abre el archivo en el editor | Es lo normal en Linux: usa **`Calendario`** en el menú de aplicaciones (`./abrir-calendario.sh --instalar`) |
| Doble clic en `Abrir Calendario.desktop` me abre el texto | Los gestores de GNOME no ejecutan `.desktop` de una carpeta cualquiera. Instálalo con `--instalar`, o click derecho → **Ejecutar como programa** |
| No aparece `Calendario` en el menú de aplicaciones | Vuelve a correr `./abrir-calendario.sh --instalar` (refresca el índice del menú con `update-desktop-database`) |
| No sé cómo apagar el calendario | **Cerrar Calendario** en el menú de aplicaciones, o `./abrir-calendario.sh --detener` |
| Lo abro desde el menú y no pasa nada, sin ningún error a la vista | No hay ventana: mira `servidor.log` en la carpeta del proyecto |
| El `.sh` avisa que el puerto 5173 lo ocupa otro programa | Ciérralo, o arranca el calendario en otro puerto con `PORT=5174 ./abrir-calendario.sh` |
| Cambio el código y no veo los cambios | El servidor sirve `dist/`: vuelve a compilar con `npm run build` |
| He perdido los eventos al borrar los datos del navegador | Revisa `datos-calendario.json`: la app lo usa como respaldo |

---

## 📁 Estructura del proyecto

```
Editor Calendario Sencillo/
├── index.html              # Punto de entrada HTML
├── server.mjs              # Servidor local + guardado en datos-calendario.json
├── abrir-calendario.bat    # Windows: doble clic, arranca el servidor y abre el navegador
├── abrir-calendario.sh     # Linux: ejecutar, arranca el servidor y abre el navegador
├── package.json            # Dependencias y scripts
├── tsconfig.json           # Configuración de TypeScript
├── tests/                  # Tests de la lógica de fechas (`npm test`)
├── datos-calendario.json   # Tus datos (se crea solo, no se sube al repo)
├── servidor.log            # Mensajes del servidor en modo sin ventana (se crea solo)
├── dist/                   # Versión compilada que sirve el servidor (no se sube al repo)
├── docs/
│   └── imagenes/           # Banner del README
├── public/
│   ├── favicon.svg         # Icono de la pestaña
│   └── favicon.ico
└── src/
    ├── main.ts             # Arranque y eventos de la interfaz
    ├── calendar.ts         # Lógica de fechas, cuadrícula y repeticiones (pura)
    ├── render.ts           # Dibujo de casillas, leyenda y notas
    ├── state.ts            # Estado de la app y persistencia
    ├── decorations.ts      # Decoraciones SVG por estación
    ├── capture.ts          # Exportación PNG limpia
    └── style.css           # Estilos y variables por estación
```

---

## 🧱 Tecnología

[Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) sin frameworks, y [html-to-image](https://github.com/bubkoo/html-to-image) para exportar el PNG. El servidor local usa solo módulos nativos de Node, sin dependencias extra.

Los tests usan el runner nativo de Node (`npm test`), también sin dependencias: Node ejecuta el TypeScript directamente. Eso necesita el soporte de *type stripping* de Node, es decir **Node 22.18 o superior** (la app y el build siguen funcionando desde Node 18).

---

*Arma tu mes, píntalo a tu manera y compártelo como imagen.*
