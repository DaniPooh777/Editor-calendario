[![Banner Editor Calendario Sencillo](docs/imagenes/Banner_Github.jpg)](docs/imagenes/Banner_Github.jpg)

# Editor Calendario Sencillo

<p align="center">
  <a href="#-qué-puedes-hacer">Qué puedes hacer</a> ·
  <a href="#-empezar">Empezar</a> ·
  <a href="#-guías">Guías</a>
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

## 🚀 Empezar

1. Descarga o clona la carpeta del proyecto.
2. Ejecuta `npm install` en la carpeta del proyecto para instalar las dependencias.
3. Ejecuta `npm run build` para compilar la app en `dist/`.
4. Arranca el calendario: en **Windows**, haz doble clic en `abrir-calendario.bat`; en **Linux**, mira [la guía de instalación](./docs/instalacion.md).

---

## 📚 Guías

| Guía | Qué cubre |
|------|-----------|
| [Instalación](./docs/instalacion.md) | Lo que necesitas, la primera vez y cómo arrancarlo en Windows y en Linux |
| [Uso](./docs/uso.md) | Navegación, crear un evento, la barra superior, las notas del mes y las estaciones |
| [Tus datos](./docs/datos.md) | Dónde se guarda el calendario y cómo hacer una copia de seguridad |
| [Problemas comunes](./docs/problemas-comunes.md) | Qué hacer cuando el calendario no arranca o no se ve como esperabas |
| [Estructura del proyecto](./docs/estructura.md) | Qué hay en cada carpeta y con qué está hecho |

---

*Arma tu mes, píntalo a tu manera y compártelo como imagen.*
