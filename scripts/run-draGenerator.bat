@echo off & cd /d "%~dp0" & TITLE "ATD(Xycart)"
set "TOPDIR=%cd%"

rem -------------------------------------
setlocal enabledelayedexpansion

:----------------------------------------
set "ORIGIN_PATH=%PATH%"
set "MINI_PATH=C:/WINDOWS/system32;C:/WINDOWS;C:/WINDOWS/System32/Wbem"
set "PATH=%MINI_PATH%"
:----------------------------------------

set "MINICONDA_BIT=x64"
set "MINICONDA_VER=2"
if "x%MINICONDA_ROOT%" == "x" set "MINICONDA_ROOT=D:/pgm/DEV/Miniconda/Miniconda2/x64/envs/envWbkPy2"
set "PATH=%MINICONDA_ROOT%;%PATH%"

if "x%QCAD_ROOT%" == "x" set "QCAD_ROOT=E:/pgm/EDA/QCAD/x64"
set "PATH=%QCAD_ROOT%;%PATH%"

rem python dxfGenerator.py
python draGenerator.py %*

rem goto :eof_with_pause
if "%errorlevel%" == "0" goto :eof_with_exit
rem -------------------------------------
:eof_with_pause
pause
:eof_with_exit
rem exit

