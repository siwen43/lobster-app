@echo off
chcp 65001 >nul
echo ============================================
echo  龙虾助手 APK 构建脚本
echo ============================================
echo.

cd /d "%~dp0"

REM 1. 检查 .env.capacitor 中的服务器地址
echo [1/3] 请确认 .env.capacitor 中 VUE_APP_BASE_API 配置正确
echo         当前配置:
findstr "VUE_APP_BASE_API" .env.capacitor
echo.
pause

REM 2. 构建前端
echo.
echo [2/3] 构建 Vue 前端...
call npx vue-cli-service build --mode capacitor
if %errorlevel% neq 0 (
    echo 前端构建失败！
    pause
    exit /b 1
)
echo 前端构建完成。

REM 3. 同步到 Android 并打开 Android Studio
echo.
echo [3/3] 同步到 Android 项目并打开 Android Studio...
call npx cap sync
call npx cap open android

echo.
echo ============================================
echo  已完成！在 Android Studio 中点击 Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo  APK 输出位置: android\app\build\outputs\apk\debug\app-debug.apk
echo ============================================
pause
