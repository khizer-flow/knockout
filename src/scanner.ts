
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import path from 'path';

chromium.use(stealthPlugin());

const FLASH_SALE_URL = 'https://shopee.com.my/shocking_sale';

interface Product {
    name: string;
    price: string;
    link: string;
    discount?: string;
}

async function startScanner() {
    console.log('\n--- SHOPEE FLASH SALE SCANNER ---\n');

    let browser;
    try {
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    } catch (e) {
        console.error('Failed to connect to Chrome. Make sure to run `launch_isolated_chrome.ps1` first.');
        process.exit(1);
    }

    const context = browser.contexts()[0];
    const page = await context.newPage();

    console.log(`Navigating to ${FLASH_SALE_URL}...`);
    await page.goto(FLASH_SALE_URL, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for content to load...');

    // Retry loop for scraping
    let items: Product[] = [];
    for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(5000); // 5s wait

        // Scrape items using generic heuristics
        const currentItems: Product[] = await page.evaluate(() => {
            const results: any[] = [];
            // Detect all anchor tags that look like products (contain "RM" price)
            const anchors = Array.from(document.querySelectorAll('a'));

            for (const a of anchors) {
                const text = a.innerText;
                // Filter anchors that have a price-like structure
                if (text.includes('RM') && (a.offsetHeight > 50)) {

                    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

                    // Heuristics
                    const priceMatch = lines.find(l => /^RM[\d\.]+/.test(l)) || lines.find(l => l.includes('RM'));
                    // name is usually longest line
                    const nameMatch = lines.sort((a, b) => b.length - a.length).find(l => !l.includes('RM') && !l.includes('%') && l.length > 5);

                    if (priceMatch && nameMatch) {
                        // avoid extremely long text which might be footer links
                        if (nameMatch.length > 150) continue;
                        if (results.find(r => r.link === a.href)) continue;

                        results.push({
                            name: nameMatch,
                            price: priceMatch,
                            link: a.href,
                            discount: text.match(/-\d+%/)?.[0] || ''
                        });
                    }
                }
            }
            return results;
        });


        items = currentItems;
        if (items.length > 0) {
            console.log(`Found ${items.length} items.\n`);
            break; // Found items, stop retrying
        } else {
            console.log(`Attempt ${i + 1}: Found 0 items. Retrying...`);
            // Check for traffic error / verification
            const title = await page.title();
            if (title.includes('Traffic') || title.includes('Login')) {
                console.log('Detected Traffic Control or Login page. Please solve CAPTCHA in the browser window manually if visible.');
                // Maybe wait longer?
                await page.waitForTimeout(5000);
            }
        }
    }

    // Close the scanner page so it doesn't clutter
    await page.close();

    if (items.length === 0) {
        console.log('No items found after 3 attempts. Check selectors or if page is active.');
        process.exit(0);
    }

    // Prompt user
    const choices = items.map((item, index) => ({
        name: `[${item.discount || ''}] ${item.name.substring(0, 50)}... (${item.price})`,
        value: item.link
    }));

    const answer = await inquirer.prompt([
        {
            type: 'rawlist',
            name: 'selectedLink',
            message: 'Select a product to snipe:',
            choices: choices,
            pageSize: 20
        }
    ]);

    const targetUrl = answer.selectedLink;
    console.log(`\nTarget Selected: ${targetUrl}`);

    // Auto-open in browser for user convenience
    try {
        // ALWAYS open a new tab to avoid confusion/cluttering existing tabs
        const openerPage = await context.newPage();
        console.log('Opening product page automatically in NEW TAB...');
        await openerPage.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => { });
    } catch (e) {
        console.log('Could not auto-open page, please navigate manually.');
    }

    console.log('Launching Sniper Bot...');

    // Spawn bot.ts
    // npm start <url>
    const botProcess = spawn('npm', ['start', targetUrl], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
    });

    botProcess.on('close', (code) => {
        console.log(`Sniper bot exited with code ${code}`);
        process.exit(code || 0);
    });
}

startScanner().catch(console.error);
