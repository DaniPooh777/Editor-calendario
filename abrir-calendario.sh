#!/usr/bin/env bash
#
# Abre el calendario con ./abrir-calendario.sh: levanta el servidor local —que
# guarda los datos en datos-calendario.json— y abre el navegador. Es el
# equivalente en Linux de abrir-calendario.bat.
#
# También deja un acceso «Abrir Calendario.desktop» para abrirlo con doble clic
# desde el gestor de archivos, como el Abrir Calendario.lnk de Windows.
#
# Este terminal ES el servidor: mientras esté abierto, cada cambio se escribe en
# datos-calendario.json. Ctrl+C (o cerrar la ventana) lo apaga.

set -euo pipefail

SCRIPT_PATH="$(readlink -f -- "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname -- "${SCRIPT_PATH}")"
cd -- "${SCRIPT_DIR}"

PORT="${PORT:-5173}"
export PORT # server.mjs lo lee del entorno; así el puerto que se comprueba es el que se abre.
HOST=127.0.0.1
URL="http://localhost:${PORT}"

die() { printf '%s\n' "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 ||
  die 'Falta Node.js. Instálalo desde https://nodejs.org/ (versión LTS) y vuelve a abrir el calendario.'

# Identificadores de los procesos que están escuchando en el puerto del calendario.
listener_pids() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :${PORT}" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2
  elif command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "${PORT}" 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+$'
  fi | sort -u
}

# Línea de comandos de un proceso, o vacío si ya no existe.
cmdline_of() { tr '\0' ' ' <"/proc/$1/cmdline" 2>/dev/null || true; }

# Cierra un servidor viejo del calendario que aún ocupe el puerto, igual que el
# .bat. A diferencia del .bat no mata a ciegas: si el puerto lo ocupa otro
# programa, avisa y no lo toca, para no tumbar tu otro servidor.
free_port() {
  local pid line
  while read -r pid; do
    [[ -n "${pid}" ]] || continue
    line="$(cmdline_of "${pid}")"
    if [[ "${line}" == *server.mjs* ]]; then
      kill "${pid}" 2>/dev/null || true
    else
      printf 'El puerto %s ya lo ocupa otro programa (PID %s): %s\n' \
        "${PORT}" "${pid}" "${line:-desconocido}" >&2
      printf 'Ciérralo, o arranca el calendario en otro puerto con: PORT=5174 %s\n' "$0" >&2
      exit 1
    fi
  done < <(listener_pids)

  # Espera a que el puerto quede libre antes de levantar el servidor.
  for _ in {1..20}; do
    [[ -z "$(listener_pids)" ]] && return 0
    sleep 0.1
  done
  die "El puerto ${PORT} sigue ocupado; no se pudo liberar."
}

# --- Acceso directo para abrir con doble clic --------------------------------
# En Linux el equivalente de Abrir Calendario.lnk es un archivo .desktop: en
# Nautilus un .sh con doble clic se abre en el editor, un .desktop se ejecuta.
# Se regenera solo, así que sigue apuntando bien si mueves la carpeta.
DESKTOP_FILE="${SCRIPT_DIR}/Abrir Calendario.desktop"

# Valor seguro para la clave Exec: el formato Desktop Entry necesita comillas y
# escapes, o una ruta con espacios rompe la línea.
exec_quote() {
  local s=$1
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//\`/\\\`}"
  s="${s//\$/\\\$}"
  printf '"%s"' "${s}"
}

# Escribe el acceso directo si falta o quedó desactualizado, y lo marca como
# confiable para que Nautilus lo ejecute en vez de abrirlo como texto.
write_shortcut() {
  local exec_value terminal_value icon content

  # xdg-terminal-exec abre la ventana de terminal del servidor sin depender de
  # la preferencia de terminal del escritorio (en Hyprland, Terminal=true no
  # tiene a quién preguntarle).
  if command -v xdg-terminal-exec >/dev/null 2>&1; then
    exec_value="$(exec_quote "$(command -v xdg-terminal-exec)") $(exec_quote "${SCRIPT_PATH}")"
    terminal_value=false
  else
    exec_value="$(exec_quote "${SCRIPT_PATH}")"
    terminal_value=true
  fi

  icon="${SCRIPT_DIR}/public/favicon.svg"
  if [[ ! -f "${icon}" ]]; then icon="${SCRIPT_DIR}/public/favicon.ico"; fi
  if [[ ! -f "${icon}" ]]; then icon="applications-office"; fi

  # Un salto de línea en la ruta partiría la clave en dos líneas y dejaría la
  # entrada inválida (el formato Desktop Entry no tiene escapes para eso).
  case "${SCRIPT_PATH}${icon}" in
    *$'\n'* | *$'\r'*)
      printf 'No se crea el acceso directo: la ruta del proyecto tiene un salto de línea.\n' >&2
      return 1
      ;;
  esac

  content="$(printf '%s\n' \
    '[Desktop Entry]' \
    'Type=Application' \
    'Version=1.0' \
    'Name=Abrir Calendario' \
    'Comment=Editor Calendario Sencillo: escribe tu mes y compártelo como imagen' \
    "Exec=${exec_value}" \
    "Icon=${icon}" \
    "Terminal=${terminal_value}" \
    'Categories=Office;' \
    'StartupNotify=true')"

  if [[ -f "${DESKTOP_FILE}" ]] && [[ "$(<"${DESKTOP_FILE}")" == "${content}" ]]; then
    return 0
  fi

  printf '%s\n' "${content}" >"${DESKTOP_FILE}"
  chmod +x "${DESKTOP_FILE}"
  if command -v gio >/dev/null 2>&1; then
    gio set "${DESKTOP_FILE}" metadata::trusted true >/dev/null 2>&1 || true
  fi
  printf 'Acceso directo listo: %s (doble clic para abrir el calendario).\n' "$(basename "${DESKTOP_FILE}")"
}

case "${1:-}" in
  --acceso)
    write_shortcut
    exit 0
    ;;
  '') ;;
  *) die "Opción no reconocida: $1 (usa --acceso para regenerar solo el acceso directo)." ;;
esac

free_port

# El servidor corre en segundo plano para poder esperar su arranque y abrir el
# navegador en el momento justo; su salida sigue apareciendo en este terminal.
node server.mjs &
server_pid=$!
trap 'kill "${server_pid}" 2>/dev/null || true' EXIT

ready=0
for _ in {1..50}; do
  kill -0 "${server_pid}" 2>/dev/null ||
    die 'El servidor se cerró al arrancar (revisa el mensaje de arriba).'
  if (exec 3<>"/dev/tcp/${HOST}/${PORT}") 2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.1
done
[[ "${ready}" == 1 ]] || die "El servidor no respondió en ${URL}."

write_shortcut || printf 'No se pudo crear el acceso directo; el calendario arranca igual.\n' >&2

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
else
  printf 'Abre %s en tu navegador.\n' "${URL}" >&2
fi

printf '\nEste terminal es el servidor. Ctrl+C para cerrarlo.\n\n'
wait "${server_pid}" || true
