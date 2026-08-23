@echo off
setlocal
cd /d "%~dp0"

REM Backend — activate the venv, then run uvicorn as "python" (not "uv run",
REM which on Windows expands wildcard args like frontend/* before uvicorn
REM ever sees them). Edit the path below if your venv isn't at .venv.
start "Verso Backend" powershell -NoExit -Command "cd D:\Coding\Personal\Learning\GenAI\Projects\verso\backend; & ../.venv/Scripts/Activate.ps1; uvicorn main:app --reload --port 8000"


REM Frontend — its own window
start "Verso Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend and frontend are starting in their own windows.
echo Close a window (or Ctrl+C inside it) to stop that service.
echo.

REM Give them a few seconds to boot, then open the app in your browser.
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173"

