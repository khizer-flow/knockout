
# Force kill all running Chrome instances
Write-Host "Killing all Chrome processes..." -ForegroundColor Red
taskkill /F /IM chrome.exe /T 2>$null

# Wait a moment to ensure they are dead
Start-Sleep -Seconds 2

# Define the path to Chrome (try common locations)
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chromePath)) {
    $chromePath = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
}

if (Test-Path $chromePath) {
    Write-Host "Launching Chrome in DEBUG MODE..." -ForegroundColor Green
    Write-Host "Port: 9222" -ForegroundColor Cyan
    
    # Launch Chrome with debugging port and default user data (to keep login)
    # We do NOT specify --user-data-dir so it uses the DEFAULT profile.
    Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222"
    
    Write-Host "Chrome launched!"
    Write-Host "1. Go to Shopee in the new window."
    Write-Host "2. Verify: Open http://127.0.0.1:9222/json in a new tab."
    Write-Host "3. Then run: npm start <product_url>"
} else {
    Write-Host "Could not find chrome.exe! Please edit this script with your Chrome path." -ForegroundColor Red
}

Read-Host -Prompt "Press Enter to exit"
