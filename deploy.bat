@echo off
echo ========================================
echo   Apex Geruestbau - Deployment Script
echo ========================================
echo.

echo Step 1: Building the project...
npm run build

echo.
echo Step 2: Checking Git status...
git status

echo.
echo Step 3: Adding all changes...
git add .

echo.
echo Step 4: Committing changes...
git commit -m "Deploy: Updated website with backend integration"

echo.
echo Step 5: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   Deployment Steps Completed!
echo ========================================
echo.
echo Next steps:
echo 1. Go to Vercel.com
echo 2. Import your GitHub repository
echo 3. Configure environment variables
echo 4. Deploy!
echo.
echo Frontend URL: http://localhost:8082
echo Backend URL: http://localhost:5000
echo.
pause 