@echo off
rem Arrete les shells embarques du Dashboard NeonFlare lances via WSL.
rem   Double-clic : arrete tous les shells (ttyd + proxy) et revoque le jeton.
rem Utile si la fenetre de start-shells.cmd a ete fermee par la croix [X]
rem (les shells sont alors deja arretes, mais le jeton restait ecrit dans
rem config/shell-session.js ; ceci le remet a vide), ou pour arreter depuis
rem une autre fenetre. Tout le travail est fait par scripts/wsl/ttyd-shells.sh.
setlocal
where wsl.exe >nul 2>&1 || (
  echo WSL introuvable. Dans PowerShell ^(admin^) : wsl --install -d kali-linux
  pause
  exit /b 1
)
set "ROOT=%~dp0..\.."

echo Arret des shells NeonFlare...
wsl.exe --cd "%ROOT%" -e bash scripts/wsl/ttyd-shells.sh stop
echo.
echo Termine.
rem Reste ouvert seulement en double-clic (aucun argument), pour voir le resultat.
if "%~1"=="" pause
exit /b %ERRORLEVEL%
