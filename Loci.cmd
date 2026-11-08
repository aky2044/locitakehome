@echo off
rem Double-click to open the Loci onboarding in its own app window.
rem Keep this console open while using the app; close it to stop the local server.
cd /d "%~dp0"
title Loci (local server - close to quit)
py run.py
