# Uso

Esta página explica cómo moverte por el calendario, cómo se crean los eventos y qué hace cada herramienta de la barra superior.

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

## 🎨 Estaciones

Cada estación cambia la cara del calendario sin tocar tus eventos ni tus notas:

| Estación | Ambiente |
|----------|----------|
| 🌸 **Primavera** | Fondo verde suave, flores y mariposas |
| ☀️ **Verano** | Fondo dorado, soles, nubes y helados |
| 🍂 **Otoño** | Fondo arena, hojas y calabazas |
| ❄️ **Invierno** | Fondo azul claro, copos y regalos |

Las decoraciones se reparten sobre la cuadrícula y **no** aparecen en el PNG: la captura queda limpia, solo con tu calendario.
