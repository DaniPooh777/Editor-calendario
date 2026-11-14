#!/usr/bin/env bash
#
# Abre el calendario: levanta el servidor local —que guarda los datos en
# datos-calendario.json— y abre el navegador. Es el equivalente en Linux de
# abrir-calendario.bat.
#
#   ./abrir-calendario.sh                 abre con este terminal como ventana del
#                                         servidor: ves los mensajes y Ctrl+C lo apaga
#   ./abrir-calendario.sh --sin-ventana   sin ventana: el servidor queda en segundo
#                                         plano y su salida va a servidor.log
#   ./abrir-calendario.sh --detener       apaga el servidor
#   ./abrir-calendario.sh --instalar      deja «Calendario» y «Cerrar Calendario»
#                                         en el menú de aplicaciones
#   ./abrir-calendario.sh --acceso        solo regenera los archivos .desktop

set -euo pipefail

SCRIPT_PATH="$(readlink -f -- "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname -- "${SCRIPT_PATH}")"
cd -- "${SCRIPT_DIR}"

PORT="${PORT:-5173}"
export PORT # server.mjs lo lee del entorno; así el puerto que se comprueba es el que se abre.
HOST=127.0.0.1
URL="http://localhost:${PORT}"

# En modo sin ventana no hay dónde leer el error: además del stderr, se avisa por
# notificación del escritorio.
die() {
  printf '%s\n' "$*" >&2
  if [[ "${MODE:-}" == detached ]] && command -v notify-send >/dev/null 2>&1; then
    notify-send -a Calendario 'No se pudo abrir el calendario' "$*" >/dev/null 2>&1 || true
  fi
  exit 1
}

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
# En Linux el equivalente de Abrir Calendario.lnk es un archivo .desktop.
# Ojo: Nautilus NO ejecuta .desktop que estén en una carpeta cualquiera —lo quitó
# a propósito, por sandboxing— así que el camino soportado es instalarlo en el
# menú de aplicaciones con --instalar. El de la carpeta sirve para el click
# derecho → «Ejecutar como programa».
DESKTOP_FILE="${SCRIPT_DIR}/Abrir Calendario.desktop"
STOP_DESKTOP_FILE="${SCRIPT_DIR}/Cerrar Calendario.desktop"
DATA_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}"
INSTALLED_FILE="${DATA_HOME}/applications/abrir-calendario.desktop"
INSTALLED_STOP_FILE="${DATA_HOME}/applications/cerrar-calendario.desktop"
# Sin ventana no hay dónde ver los mensajes del servidor: van a este archivo.
LOG_FILE="${SCRIPT_DIR}/servidor.log"

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

# Contenido de una entrada .desktop: $1 nombre, $2 comentario, $3 Exec, $4 icono.
desktop_entry() {
  printf '%s\n' \
    '[Desktop Entry]' \
    'Type=Application' \
    'Version=1.0' \
    "Name=$1" \
    "Comment=$2" \
    "Exec=$3" \
    "Icon=$4" \
    'Terminal=false' \
    'Categories=Office;' \
    'StartupNotify=true'
}

# Escribe una entrada si falta o quedó desactualizada, y la marca confiable para
# que el gestor de archivos no la trate como texto.
write_entry() {
  local path=$1 content=$2
  if [[ -f "${path}" ]] && [[ "$(<"${path}")" == "${content}" ]]; then
    return 0
  fi
  printf '%s\n' "${content}" >"${path}"
  chmod +x "${path}"
  if command -v gio >/dev/null 2>&1; then
    gio set "${path}" metadata::trusted true >/dev/null 2>&1 || true
  fi
  printf 'Acceso directo listo: %s\n' "$(basename "${path}")"
}

# Regenera los dos accesos: abrir (sin ventana) y cerrar.
write_shortcuts() {
  local icon open_exec stop_exec

  icon="${SCRIPT_DIR}/public/favicon.svg"
  if [[ ! -f "${icon}" ]]; then icon="${SCRIPT_DIR}/public/favicon.ico"; fi
  if [[ ! -f "${icon}" ]]; then icon="applications-office"; fi

  # Un salto de línea en la ruta partiría la clave en dos líneas y dejaría la
  # entrada inválida (el formato Desktop Entry no tiene escapes para eso).
  case "${SCRIPT_PATH}${icon}" in
    *$'\n'* | *$'\r'*)
      printf 'No se crean los accesos: la ruta del proyecto tiene un salto de línea.\n' >&2
      return 1
      ;;
  esac

  open_exec="$(exec_quote "${SCRIPT_PATH}") --sin-ventana"
  stop_exec="$(exec_quote "${SCRIPT_PATH}") --detener"

  write_entry "${DESKTOP_FILE}" "$(desktop_entry 'Calendario' \
    'Editor Calendario Sencillo: escribe tu mes y compártelo como imagen' "${open_exec}" "${icon}")"
  write_entry "${STOP_DESKTOP_FILE}" "$(desktop_entry 'Cerrar Calendario' \
    'Apaga el servidor del calendario' "${stop_exec}" "${icon}")"

  # Si ya están instalados en el menú de aplicaciones, mantenlos al día para que
  # no queden apuntando a una ruta vieja si mueves la carpeta.
  if [[ -f "${INSTALLED_FILE}" ]]; then
    install -m 0755 "${DESKTOP_FILE}" "${INSTALLED_FILE}" 2>/dev/null || true
  fi
  if [[ -f "${INSTALLED_STOP_FILE}" ]]; then
    install -m 0755 "${STOP_DESKTOP_FILE}" "${INSTALLED_STOP_FILE}" 2>/dev/null || true
  fi
}

# Copia los accesos al menú de aplicaciones, que es el único sitio desde donde el
# escritorio los ejecuta con un clic.
install_shortcuts() {
  local dir
  write_shortcuts || return 1
  dir="$(dirname -- "${INSTALLED_FILE}")"
  mkdir -p "${dir}"
  install -m 0755 "${DESKTOP_FILE}" "${INSTALLED_FILE}"
  install -m 0755 "${STOP_DESKTOP_FILE}" "${INSTALLED_STOP_FILE}"
  if command -v gio >/dev/null 2>&1; then
    gio set "${INSTALLED_FILE}" metadata::trusted true >/dev/null 2>&1 || true
    gio set "${INSTALLED_STOP_FILE}" metadata::trusted true >/dev/null 2>&1 || true
  fi
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "${dir}" >/dev/null 2>&1 || true
  fi
  printf 'Instalado en %s\nEn el menú de aplicaciones aparecen «Calendario» y «Cerrar Calendario».\n' "${dir}"
}

# Apaga el servidor del calendario si está corriendo.
stop_server() {
  local pid line found=0
  while read -r pid; do
    [[ -n "${pid}" ]] || continue
    line="$(cmdline_of "${pid}")"
    if [[ "${line}" == *server.mjs* ]]; then
      kill "${pid}" 2>/dev/null || true
      found=1
    fi
  done < <(listener_pids)
  if [[ "${found}" == 1 ]]; then
    printf 'Calendario detenido: puerto %s liberado.\n' "${PORT}"
  else
    printf 'No había ningún calendario corriendo en el puerto %s.\n' "${PORT}"
  fi
}

MODE=terminal
case "${1:-}" in
  --acceso)
    write_shortcuts
    exit 0
    ;;
  --instalar)
    install_shortcuts
    exit 0
    ;;
  --detener)
    stop_server
    exit 0
    ;;
  --sin-ventana) MODE=detached ;;
  '') ;;
  *) die "Opción no reconocida: $1 (usa --sin-ventana, --detener, --acceso o --instalar)." ;;
esac

free_port

server_pid=''
if [[ "${MODE}" == detached ]]; then
  # Sin ventana: el servidor se desacopla de cualquier terminal con setsid y su
  # salida va al log, porque ya no hay ventana donde verla.
  : >"${LOG_FILE}"
  setsid node server.mjs >>"${LOG_FILE}" 2>&1 </dev/null &
  disown 2>/dev/null || true
else
  # En una terminal, el servidor corre en segundo plano del script para poder
  # esperar su arranque; su salida sigue apareciendo aquí y Ctrl+C lo apaga.
  node server.mjs &
  server_pid=$!
  trap 'kill "${server_pid}" 2>/dev/null || true' EXIT
fi

ready=0
for _ in {1..50}; do
  if [[ -n "${server_pid}" ]] && ! kill -0 "${server_pid}" 2>/dev/null; then
    die 'El servidor se cerró al arrancar.'
  fi
  if (exec 3<>"/dev/tcp/${HOST}/${PORT}") 2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.1
done
[[ "${ready}" == 1 ]] || die "El servidor no respondió en ${URL}."

write_shortcuts || printf 'No se pudieron crear los accesos; el calendario arranca igual.\n' >&2

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
else
  printf 'Abre %s en tu navegador.\n' "${URL}" >&2
fi

if [[ "${MODE}" == detached ]]; then
  printf 'Calendario abierto en %s (sin ventana). Log: %s\n' "${URL}" "${LOG_FILE}"
  exit 0
fi

printf '\nEste terminal es el servidor. Ctrl+C para cerrarlo.\n\n'
wait "${server_pid}" || true
