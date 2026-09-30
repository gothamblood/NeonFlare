@echo off
rem Lance les shells embarques du Dashboard NeonFlare via WSL, depuis Windows.
rem   Double-clic         : demarre les shells, puis une touche les ARRETE.
rem   start-shells.cmd start [n] / status / stop : passe la commande telle quelle.
rem Tout le travail est fait par scripts/wsl/ttyd-shells.sh (dans WSL).
setlocal
where wsl.exe >nul 2>&1 || (
  echo WSL introuvable. Dans PowerShell ^(admin^) : wsl --install -d kali-linux
  pause
  exit /b 1
)
set "ROOT=%~dp0..\.."

if not "%~1"=="" (
  wsl.exe --cd "%ROOT%" -e bash scripts/wsl/ttyd-shells.sh %*
  exit /b %ERRORLEVEL%
)

wsl.exe --cd "%ROOT%" -e bash scripts/wsl/ttyd-shells.sh start
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Shells demarres. Laisse cette fenetre ouverte pendant que tu les utilises.
echo Appuie sur une touche pour ARRETER les shells.
pause >nul
wsl.exe --cd "%ROOT%" -e bash scripts/wsl/ttyd-shells.sh stop
