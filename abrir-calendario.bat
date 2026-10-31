@echo off
rem Abre el calendario con un doble clic: levanta Vite en segundo plano
rem (ventana minimizada) y abre el navegador en la app.
cd /d "%~dp0"
start "Calendario (servidor)" /min cmd /c npm run dev -- --port 5173 --strictPort
timeout /t 3 /nobreak >nul
start "" http://localhost:5173
