@echo off
rem Lance les shells embarques du Dashboard NeonFlare via WSL, depuis Windows.
rem   Double-clic : demarre les shells et RESTE ouvert. La fenetre DOIT
rem                 rester ouverte tant que tu utilises les shells : des que
rem                 plus aucune session WSL n'est attachee, WSL arrete ttyd
rem                 et le proxy. Pour ARRETER : Ctrl+C dans cette fenetre
rem                 (arret propre, jeton revoque). Fermer par la croix [X]
rem                 arrete aussi les shells, mais laisse le jeton en place
rem                 dans config/shell-session.js -- il est inerte (plus de
rem                 proxy) et reecrit au prochain demarrage ; un
rem                 start-shells.cmd stop le remet a vide tout de suite.
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

echo Demarrage des shells NeonFlare ^(garde cette fenetre ouverte^)...
echo.
wsl.exe --cd "%ROOT%" -e bash scripts/wsl/ttyd-shells.sh run
if errorlevel 1 (
  echo.
  echo Echec du demarrage -- voir le message ci-dessus.
  pause
)
exit /b %ERRORLEVEL%
