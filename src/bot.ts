
import { chromium } from 'playwright-extra';
import { Page, BrowserContext } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CONFIG } from './config';
import fs from 'fs-extra';
import dayjs from 'dayjs';

// Activate Stealth Plugin
// This is CRITICAL. It deletes the "I am a robot" flags from the browser.
chromium.use(stealthPlugin());

const TARGET_URL = process.argv[2];
const SALE_TIME_STR = process.argv[3];
const VARIANT_KEYWORD = process.argv[4];

if (!TARGET_URL) {
    console.error('Usage: npm start <product_url> [sale_time] [variant_keyword]');
    process.exit(1);
}

async function startBot() {
    console.log(`\n--- SHOPEE FLASH SALE BOT (STEALTH RESTORED) ---`);
    console.log(`Target: ${TARGET_URL}`);

    let context: BrowserContext;
    let page: Page;
    let browser;

    try {
        console.log('Connecting to Chrome...');
        // Connect to the existing Chrome window
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        context = browser.contexts()[0];

        // Use the current active page or a new one
        page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

        console.log('>>> SUCCESS: Connected!');

        // Listen to browser console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // --- MANUAL STEALTH INJECTION (Force Override) ---
        // This ensures the browser does NOT report itself as automation
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Mock Chrome runtime to look native
            (window as any).chrome = { runtime: {} };
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission } as PermissionStatus) :
                    originalQuery(parameters)
            );
        });
        console.log('>>> STEALTH SHIELDS ACTIVE');

    } catch (e) {
        console.error('\nConnection Failed.');
        console.error('Make sure to run: launch_isolated_chrome.ps1');
        process.exit(1);
    }

    console.log('\nWAITING FOR YOU TO NAVIGATE TO TARGET...');
    console.log(`URL: ${TARGET_URL}`);

    const cleanTarget = TARGET_URL.split('?')[0].replace('https://', '').replace('http://', '').replace('www.', '');

    // Polling loop to detect when ANY tab matches the product page
    // This allows you to open a new tab if the first one errors out.
    let targetPage: Page | null = null;

    console.log(`\n[INFO] Monitoring ALL tabs for: ${cleanTarget}`);
    console.log(`[TIP] If you see a "Traffic Error", allows mid-click or "Open in New Tab" on the product link!`);

    while (!targetPage) {
        const pages = context.pages();
        for (const p of pages) {
            const currentUrl = p.url();
            const cleanCurrent = currentUrl.split('?')[0].replace('https://', '').replace('http://', '').replace('www.', '');

            if (cleanCurrent.includes(cleanTarget)) {
                targetPage = p;
                console.log(`\n>>> MATCH FOUND in tab: ${currentUrl} <<<`);
                break;
            }
        }

        if (targetPage) break;
        await new Promise(r => setTimeout(r, 500));
    }

    // Switch active page reference to the one we found
    page = targetPage;
    // Re-attach console listener to the NEW page if needed (though we evaluate on it directly)
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    console.log('\n>>> TARGET DETECTED! ATTACHING BOT... <<<');

    // Wait for Sale Time (if set)
    if (SALE_TIME_STR) await waitForSaleTime(page, SALE_TIME_STR);

    // ZERO-LATENCY INJECTION
    // We execute logic INSIDE browser to click instantly
    const result = await page.evaluate(async (data) => {
        const { variantKeyword } = data;

        console.log('--- BOT ACTIVE ---');
        console.log('Searching for buttons...');

        function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

        const start = Date.now();

        // Try for 3 minutes (extended for safety)
        while (Date.now() - start < 180000) {

            // 0. CHECK FOR TRAFFIC ERROR (AUTO-HEAL)
            const bodyText = document.body.innerText;
            if (document.title.includes('Traffic Error') || bodyText.includes('Traffic Error') || bodyText.includes('halaman tidak dijumpai')) {
                console.log('>>> TRAFFIC ERROR DETECTED! Opening new tab to bypass... <<<');
                window.open(window.location.href, '_blank');
                await sleep(5000); // Wait for new tab to open and bot to switch
                return 'OPENED_NEW_TAB';
            }

            // 0.5 CHECK IF WE ARE ALREADY AT CHECKOUT
            if (window.location.href.includes('/checkout')) {
                console.log('>>> ARRIVED AT CHECKOUT! <<<');
                return 'SUCCESS_CHECKOUT';
            }

            // 1. SELECT VARIANT
            let variants = Array.from(document.querySelectorAll('button.product-variation'));

            // Strategy B: Heuristic (Fallback)
            if (variants.length === 0) {
                const allButtons = Array.from(document.querySelectorAll('button'));
                variants = allButtons.filter(b => {
                    const c = b.className.toLowerCase();
                    const text = b.innerText.toLowerCase();

                    // Exclude specific text (User identified bug: "Skip to main content")
                    if (text.includes('skip') || text.includes('content') || text.includes('share') || text.length < 2) return false;

                    // Exclude Buy/Cart buttons
                    if (c.includes('btn-solid-primary') || c.includes('btn-tinted') || text.includes('buy') || text.includes('cart') || text.includes('beli')) return false;

                    // Exclude invalid/hidden buttons
                    if (b.offsetParent === null) return false;

                    return true;
                });
                if (variants.length > 0) console.log(`[Heuristic] Potential variants found: ${variants.length}`);
            }
            console.log(`Found ${variants.length} variants`);

            const selectedVariant = document.querySelector('button.product-variation--selected') ||
                variants.find(v => v.getAttribute('aria-selected') === 'true' || v.classList.contains('selected') || v.className.includes('--selected'));

            // CHECK FOR ERROR MESSAGE
            // bodyText already defined above
            const errorToast = bodyText.includes('Please select product variation first') || bodyText.includes('Sila pilih variasi');
            if (errorToast) console.log('>>> DETECTED ERROR: Missing Variant Selection <<<');

            if (variants.length > 0 && (!selectedVariant || errorToast)) {
                let target = variants[0]; // Default to first

                // Keyword match
                if (variantKeyword) {
                    const match = variants.find(v => (v as HTMLElement).innerText.toLowerCase().includes(variantKeyword.toLowerCase()));
                    if (match) target = match;
                }

                // Click it
                const el = target as HTMLElement;
                if (!el.classList.contains('product-variation--disabled')) {
                    el.click();
                    console.log('Clicked variant:', el.innerText);
                    // Wait for selection to register
                    await sleep(300);
                }
            }

            // 2. CLICK BUY BUTTON
            const buttons = Array.from(document.querySelectorAll('button'));
            const buyBtn = buttons.find(b => {
                const t = b.innerText.toLowerCase();
                // Check for various "Buy" texts
                return (t.includes('buy now') || t.includes('beli sekarang') || t.includes('buy with voucher') || t.includes('checkout')) &&
                    // Minimal class check - sometimes they change classes but usually keep 'btn'
                    (b.className.includes('btn-solid-primary') || b.className.includes('btn--l'));
            });

            if (buyBtn) {
                console.log('Found Buy Button:', buyBtn.innerText);
            }

            if (buyBtn && !buyBtn.disabled && (buyBtn as HTMLElement).offsetParent !== null) {
                // FORCE CLICK if enabled. Do not wait for our internal logic to confirm variant selection.
                // If Shopee says it's enabled, it's enabled.

                (buyBtn as HTMLElement).click();
                console.log('>>> CLICKED BUY BUTTON - Waiting for navigation... <<<');

                // Don't result immediately. Wait a bit to ensure it actually goes through.
                await sleep(2000);

                // If we are still here, we loop again and might click again if button is still there.
                continue;
            }

            // 3. CHECK FOR "VARIATION CONFIRMATION" DIALOG
            // Sometimes clicking "Buy" opens a popup to select variants again with a "Confirm" button.
            const confirmBtn = Array.from(document.querySelectorAll('button')).find(b =>
                b.innerText.toLowerCase().includes('confirm') &&
                (b.className.includes('btn-solid-primary') || b.className.includes('btn--l'))
            );

            if (confirmBtn && !confirmBtn.disabled && confirmBtn.offsetParent !== null) {
                console.log('>>> FOUND CONFIRMATION DIALOG! Clicking Confirm... <<<');

                // Check if we need to select a variant inside this dialog?
                // Usually the previous logic (Step 1) handles it because the dialog buttons are just more buttons in the DOM.
                // But we might need to be careful if the dialog hides the main page buttons.

                // Simple approach: If Confirm is there, click it.
                (confirmBtn as HTMLElement).click();
                await sleep(1000);
            }

            await sleep(100);
        }
        return 'TIMEOUT';
    }, { variantKeyword: VARIANT_KEYWORD });

    console.log(`Result: ${result}`);
}

async function waitForSaleTime(page: Page, timeStr: string) {
    let targetTime = dayjs(timeStr);
    if (!timeStr.includes('-')) {
        const today = dayjs().format('YYYY-MM-DD');
        targetTime = dayjs(`${today} ${timeStr}`);
    }
    if (!targetTime.isValid()) return;

    console.log(`Waiting for ${targetTime.format('HH:mm:ss.SSS')}`);
    while (true) {
        const diff = targetTime.diff(dayjs());
        if (diff <= 0) break;
        if (diff > 5000) await new Promise(r => setTimeout(r, 1000));
        else await new Promise(r => setTimeout(r, 50));
    }
}

startBot().catch(console.error);
