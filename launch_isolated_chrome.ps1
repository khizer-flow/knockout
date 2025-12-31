
# Start Chrome in an ISOLATED Profile
# This ignores your main Chrome (so you don't need to close it!)
# It also saves your login for next time in the "chrome_bot_profile" folder.

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profilePath = "$PSScriptRoot\chrome_bot_profile"

Write-Host "Launching Isolated Chrome Bot..." -ForegroundColor Green
Write-Host "Profile: $profilePath" -ForegroundColor Gray
Write-Host "Debug Port: 9222" -ForegroundColor Cyan

Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$profilePath", "--disable-blink-features=AutomationControlled"

Write-Host ""
Write-Host "1. A *fresh* Chrome window has opened."
Write-Host "2. LOGIN to Shopee in this new window."
Write-Host "3. Open http://127.0.0.1:9222/json in a new tab to verify."
Write-Host "4. Run: npm start <product_url>"
