# Tecnología

Esta página cuenta con qué está construido el proyecto y qué hace falta para correr los tests.

[Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) sin frameworks, y [html-to-image](https://github.com/bubkoo/html-to-image) para exportar el PNG. El servidor local usa solo módulos nativos de Node, sin dependencias extra.

Los tests usan el runner nativo de Node (`npm test`), también sin dependencias: Node ejecuta el TypeScript directamente. Eso necesita el soporte de *type stripping* de Node, es decir **Node 22.18 o superior** (la app y el build siguen funcionando desde Node 18).
