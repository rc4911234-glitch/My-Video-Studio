@echo off
title YouTube Comedy Autopilot Engine
color 0A
echo ========================================================
echo   YOUTUBE 100%% AUTONOMOUS COMEDY CHANNEL ENGINE
echo   Connected Channel: Rohit choudhary
echo   Manual Work Required: 0%%
echo   Upload Schedule (IST): 1:30 PM & 7:30 PM
echo ========================================================
echo.
cd /d "%~dp0"
node schedules/comedy-autopilot-scheduler.js
pause
