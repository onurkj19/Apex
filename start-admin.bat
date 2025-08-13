@echo off
echo Starting Apex Gerüstbau Admin System...
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm run dev"
cd ..

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Frontend: http://localhost:8081
echo Backend: http://localhost:5000
echo Admin Panel: http://localhost:8081/#/admin/login
echo.
echo Admin Credentials:
echo Username: Apex
echo Password: apex12345
echo.
pause
