@echo off
rem Abre el calendario con un doble clic: levanta el servidor local (que
rem guarda los datos en datos-calendario.json) y abre el navegador.
cd /d "%~dp0"
rem Cierra un servidor viejo del calendario que aún ocupe el puerto 5173
rem (por ejemplo el de versiones anteriores que no guardaban en disco).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do taskkill /PID %%p /F >nul 2>&1
start "Calendario (servidor)" /min cmd /c node server.mjs
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
