# Estructura del proyecto

Esta página muestra qué hay en cada carpeta del proyecto y con qué está construido.

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

## 🧱 Tecnología

[Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) sin frameworks, y [html-to-image](https://github.com/bubkoo/html-to-image) para exportar el PNG. El servidor local usa solo módulos nativos de Node, sin dependencias extra.

Los tests usan el runner nativo de Node (`npm test`), también sin dependencias: Node ejecuta el TypeScript directamente. Eso necesita el soporte de *type stripping* de Node, es decir **Node 22.18 o superior** (la app y el build siguen funcionando desde Node 18).
