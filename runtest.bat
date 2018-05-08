@echo off & cd /d "%~dp0" & TITLE "ATD(Xycart) Test"
set "TOPDIR=%cd%"

set "MINICONDA_ROOT="
set "QCAD_ROOT="
set "CDSROOT="

echo [ATD] - DO not operate your PC and waiting for finished...

pushd %cd%
cd scripts & call run-draGenerator.bat
popd

pushd %cd%
cd Library/Allegro & call RunLatestGenerator.bat
popd

start allegro

rem goto :eof_with_pause
if "%errorlevel%" == "0" goto :eof_with_exit
rem -------------------------------------
:eof_with_pause
pause
:eof_with_exit
exit

