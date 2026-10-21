@echo off
title TugasKu — LMS MENTARI UNPAM
cd /d "%~dp0"

echo =================================================================
echo                 TUGASKU WEB DASHBOARD
echo =================================================================
echo  Menjalankan server TugasKu...
echo  Browser akan terbuka otomatis ke http://localhost:3000
echo  Tutup jendela ini jika selesai untuk mematikan aplikasi.
echo =================================================================
echo.

:: Tunggu 1.5 detik lalu buka browser otomatis
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Jalankan server TugasKu
node server.js

if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Terjadi kesalahan saat menjalankan TugasKu.
  pause
)
