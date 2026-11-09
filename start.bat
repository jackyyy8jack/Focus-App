@echo off
REM ===== Focus App launcher - double click to run =====
REM go to the folder where this .bat lives
cd /d "%~dp0"

REM clear the env var that makes Electron run as plain Node (causes "app undefined")
set "ELECTRON_RUN_AS_NODE="

REM launch the app using the bundled Electron
start "" ".\node_modules\electron\dist\electron.exe" .
