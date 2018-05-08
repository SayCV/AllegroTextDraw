cd /d %~dp0

if "x%CDSROOT%" == "x" set "CDSROOT=D:/Cadence/SPB_17.0"
if not exist "%CDSROOT%" set "CDSROOT=D:/Cadence/SPB_16.6"
set "PATH=%CDSROOT%/tools/bin;%CDSROOT%/tools/pcb/bin;%CDSROOT%/tools/fet/bin;%PATH%"

for /f  %%a in  ('hostname') do set HOSTNAME=%%a
set "CDS_LIC_FILE=5280@%HOSTNAME%"
set "LM_LICENSE_FILE=%CDS_LIC_FILE%"

allegro -s @SCR_NAME@.scr
CALL :checkfile "@SYMBOL_NAME@.dra"

goto :eof

:checkfile
@echo off
dir %1 1>nul 2>nul
if errorlevel 1 goto checkfile_err
goto end
:checkfile_err
echo Expected file %1 not found
pause > nul
exit
:end
@echo on
