@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   竞赛雷达 - 推送到 GitHub
echo ========================================
echo.
echo 使用前请先在 GitHub 建好空仓库（不要勾选 Add a README）。
echo.
set /p REPO="请输入仓库完整地址(https://github.com/用户名/仓库名.git): "
if "%REPO%"=="" goto :end
git remote remove origin 2>nul
git remote add origin "%REPO%"
echo.
echo 正在推送到 main 分支...
git branch -M main
git push -u origin main
if errorlevel 1 (
  echo.
  echo [推送失败] 常见原因：
  echo   1) 仓库地址写错，或仓库不存在
  echo   2) 未登录 GitHub - 会弹出登录窗口，请用浏览器完成授权
  echo   3) 仓库不是空的（建仓时勾了 README），可先删除仓库重建
) else (
  echo.
  echo [推送成功] 接着到 GitHub 仓库 Settings - Pages 开启即可。
)
:end
echo.
pause
