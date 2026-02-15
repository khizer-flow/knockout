import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { spawn } from 'child_process';

chromium.use(stealthPlugin());

// 1. UPDATE TARGET URL
const FLASH_SALE_URL = 'https://shopee.com.my/m/cny-knockout-deals';
const TARGET_KEYWORD = 'aukey gaming mouse pad'; // Lowercase for matching

interface Product {
    name: string;
    link: string;
}

async function startScanner() {
    console.log('\n--- SHOPEE SPECIFIC TARGET SCANNER ---\n');
    console.log(`Target Page: ${FLASH_SALE_URL}`);
    console.log(`Target Item: "${TARGET_KEYWORD}"`);

    let browser;
    try {
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    } catch (e) {
        console.error('Failed to connect to Chrome. Run `launch_isolated_chrome.ps1` first.');
        process.exit(1);
    }

    const context = browser.contexts()[0];
    const page = await context.newPage();

    console.log(`Navigating...`);
    await page.goto(FLASH_SALE_URL, { waitUntil: 'domcontentloaded' });

    let foundLink: string | null = null;

    // Retry loop
    for (let i = 0; i < 20; i++) { // Increase retries for high-stakes drops
        console.log(`[Attempt ${i + 1}] Scanning for keyword...`);
        
        // Custom evaluator for the specific keyword
        foundLink = await page.evaluate((keyword) => {
            const anchors = Array.from(document.querySelectorAll('a'));
            
            // Find any link where the text or the href contains the keyword
            const target = anchors.find(a => {
                const text = a.innerText.toLowerCase();
                const href = a.href.toLowerCase();
                return text.includes(keyword) || href.includes(keyword.replace(' ', '-'));
            });

            return target ? target.href : null;
        }, TARGET_KEYWORD);

        if (foundLink) {
            console.log(`\n>>> FOUND TARGET: ${foundLink} <<<\n`);
            break;
        }

        // Wait before retry
        await page.waitForTimeout(2000);
        
        // Optional: Scroll down to trigger lazy load if item is lower on page
        await page.evaluate(() => window.scrollBy(0, 500));
    }

    await page.close();

    if (!foundLink) {
        console.log('Target not found after retries.');
        process.exit(0);
    }

    // AUTO-LAUNCH BOT (No Inquirer prompt needed)
    console.log('Launching Sniper Bot immediately...');

    // Open tab for user visual confirmation
    const openerPage = await context.newPage();
    openerPage.goto(foundLink).catch(() => {});

    // Spawn bot.ts
    const botProcess = spawn('npm', ['start', foundLink], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
    });

    botProcess.on('close', (code) => {
        process.exit(code || 0);
    });
}

startScanner().catch(console.error);