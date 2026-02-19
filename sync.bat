@echo off
setlocal enabledelayedexpansion

:: 1. Auto-detect source path (the folder where this bat is located)
set "SRC=%~dp0"
set "SRC=%SRC:~0,-1%"

:: 2. Extract the current folder name from the source path
for %%I in ("%SRC%") do set "DIR_NAME=%%~nxI"

:: 3. Set destination path to Downloads\ToGemini
set "DST_ROOT=%USERPROFILE%\Downloads\ToGemini"

:: 4. Generate timestamp for the subfolder
set "TS=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%"
set "TS=%TS: =0%"

:: 5. Combine Folder Name and Timestamp for the destination
set "DST=%DST_ROOT%\Export_%DIR_NAME%_%TS%"

echo [INFO] SOURCE: "%SRC%"
echo [INFO] TARGET: "%DST%"

:: 6. Create the destination directory tree (Auto-creates ToGemini if missing)
if not exist "%DST%" mkdir "%DST%"

:: 7. Execute Robocopy
:: /E   : Copy subfolders
:: /XD  : Exclude .git folder
:: /XF  : Exclude .bat files (including this script)
echo.
echo Exporting to ToGemini...
robocopy "%SRC%" "%DST%" /E /XD .git /XF *.bat /R:0 /W:0

echo.
echo Success! Files are organized in:
echo "%DST%"
pause