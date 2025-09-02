@echo off
setlocal enabledelayedexpansion

REM WebStorm IDE wrapper for Claude Code
REM Usage: webstorm-ide.bat file:line

set "WEBSTORM_PATH=C:\Program Files\JetBrains\WebStorm2025.1\bin\webstorm64.exe"

REM Get all arguments
set "ARGS=%*"

REM Check if WebStorm exists
if not exist "%WEBSTORM_PATH%" (
    echo WebStorm not found at: %WEBSTORM_PATH%
    exit /b 1
)

REM If no arguments, just open WebStorm
if "%ARGS%"=="" (
    start "" "%WEBSTORM_PATH%"
    exit /b 0
)

REM Parse file:line format
for /f "tokens=1,2 delims=:" %%a in ("%ARGS%") do (
    set "FILE=%%a"
    set "LINE=%%b"
)

REM Convert relative paths to absolute
if not "%FILE:~1,1%"==":" (
    set "FILE=%CD%\%FILE%"
)

REM Handle different cases
if "!LINE!"=="" (
    REM Just a file path
    start "" "%WEBSTORM_PATH%" "%FILE%"
) else (
    REM File with line number
    start "" "%WEBSTORM_PATH%" --line !LINE! "%FILE%"
)