import { chromium } from 'playwright-extra';
import { Page, BrowserContext } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CONFIG } from './config';
import fs from 'fs-extra';
import dayjs from 'dayjs';

// Activate Stealth Plugin
chromium.use(stealthPlugin());

const TARGET_URL = process.argv[2];
const SALE_TIME_STR = process.argv[3];
const VARIANT_KEYWORD = process.argv[4];

if (!TARGET_URL) {
    console.error('Usage: npm start <product_url> [sale_time] [variant_keyword]');
    process.exit(1);
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

async function startBot() {
    console.log(`\n--- SHOPEE FLASH SALE BOT (STEALTH RESTORED) ---`);
    console.log(`Target: ${TARGET_URL}`);

    let context: BrowserContext;
    let page: Page;
    let browser;

    try {
        console.log('Connecting to Chrome...');
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        context = browser.contexts()[0];
        page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        console.log('>>> SUCCESS: Connected!');

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            (window as any).chrome = { runtime: {} };
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

    let targetPage: Page | null = null;
    console.log(`\n[INFO] Monitoring ALL tabs for: ${cleanTarget}`);

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

    page = targetPage;
    console.log('\n>>> TARGET DETECTED! ATTACHING BOT... <<<');

    if (SALE_TIME_STR) await waitForSaleTime(page, SALE_TIME_STR);

    let attempts = 0;
    while (attempts < 5) {
        try {
            attempts++;
            const result = await page.evaluate(async (data) => {
                const { variantKeyword } = data;
                console.log('--- BOT ACTIVE ---');
                
                function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
                const start = Date.now();

                while (Date.now() - start < 180000) {
                    // 0. TRAFFIC ERROR CHECK
                    const bodyText = document.body.innerText;
                    if (document.title.includes('Traffic') || bodyText.includes('Traffic Error') || bodyText.includes('Page Not Found')) {
                        console.log('>>> TRAFFIC ERROR! Opening new tab... <<<');
                        window.open(window.location.href, '_blank');
                        await sleep(5000);
                        return 'OPENED_NEW_TAB';
                    }

                    const currentUrl = window.location.href;

                    // ============================================================
                    //  CHECKOUT LOGIC (UPDATED FOR 7-ELEVEN)
                    // ============================================================
                    if (currentUrl.includes('/checkout')) {
                        console.log('>>> ARRIVED AT CHECKOUT! <<<');

                        // Define our target texts
                        const mainCategoryText = "Cash Payment at Physical Stores";
                        const subOptionText = "Cash Payment at 7-Eleven";

                        // Get all potential elements
                        const allElements = Array.from(document.querySelectorAll('div, button, span, label'));

                        // Helper to find visible elements by text
                        const findByText = (text: string) => allElements.find(el => {
                            const htmlEl = el as HTMLElement;
                            return htmlEl.innerText && 
                                   htmlEl.innerText.trim() === text && 
                                   htmlEl.offsetParent !== null; // Must be visible
                        });

                        // STEP 1: Look for the specific 7-Eleven button first
                        const sevenElevenBtn = findByText(subOptionText);

                        if (sevenElevenBtn) {
                            // If found, click it!
                            // We check if it's already "selected" roughly by checking classes, 
                            // but clicking it again is usually safe and ensures it's active.
                            console.log(`>>> FOUND 7-ELEVEN! CLICKING... <<<`);
                            (sevenElevenBtn as HTMLElement).click();
                            await sleep(500); // Wait for UI update
                        } else {
                            // STEP 2: If 7-Eleven is NOT visible, we need to open the main category
                            const mainBtn = findByText(mainCategoryText);
                            
                            if (mainBtn) {
                                console.log(`>>> OPENING MENU: ${mainCategoryText} <<<`);
                                (mainBtn as HTMLElement).click();
                                await sleep(1000); // Wait for the menu to slide down/open
                                continue; // Restart loop to find 7-Eleven now that it's visible
                            } else {
                                console.log('>>> Warning: Could not find Payment Category buttons yet... <<<');
                            }
                        }

                        // STEP 3: PLACE ORDER
                        // Only try to place order if we successfully clicked the 7-Eleven button (or if it was already there)
                        // But to be aggressive, we always check for the Place Order button just in case manual intervention happened.
                        const placeOrderBtns = Array.from(document.querySelectorAll('button')).filter(b => {
                            const txt = b.innerText.toLowerCase();
                            return txt.includes('place order') || txt.includes('buat pesanan') || txt.includes('pay now');
                        });

                        if (placeOrderBtns.length > 0) {
                            const btn = placeOrderBtns.find(b => !b.disabled && (b as HTMLElement).offsetParent !== null);
                            
                            // Optimization: Check if 7-Eleven is actually selected before clicking?
                            // For speed, we just try to click Place Order. If payment isn't selected, Shopee usually blocks it or shows an error, 
                            // but the bot will just loop and try again.
                            if (btn) {
                                (btn as HTMLElement).click();
                                console.log('>>> CLICKED PLACE ORDER! <<<');
                                await sleep(5000);
                                return 'ORDER_PLACED';
                            }
                        }
                        
                        await sleep(1000);
                        continue;
                    }

                    // ============================================================
                    //  CART PAGE LOGIC
                    // ============================================================
                    if (currentUrl.includes('/cart')) {
                        console.log('>>> DETECTED CART PAGE <<<');
                        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                        if (checkboxes.length > 0) {
                            const firstBox = checkboxes[0] as HTMLElement;
                            if (!(firstBox as any).checked) {
                                firstBox.click();
                                await sleep(500);
                            }
                        }
                        const checkoutBtns = Array.from(document.querySelectorAll('button')).filter(b => 
                            b.innerText.toLowerCase().includes('checkout') || b.innerText.toLowerCase().includes('semak keluar')
                        );
                        if (checkoutBtns.length > 0) {
                            const btn = checkoutBtns.find(b => !b.disabled && (b as HTMLElement).offsetParent !== null);
                            if (btn) {
                                (btn as HTMLElement).click();
                                await sleep(2000);
                            }
                        }
                        await sleep(1000);
                        continue;
                    }

                    // ============================================================
                    //  PRODUCT PAGE LOGIC
                    // ============================================================
                    
                    // 1. Variant Selection
                    let allVariants = Array.from(document.querySelectorAll('button.product-variation'));
                    const variantGroups = new Map<Element, Element[]>();

                    if (allVariants.length > 0) {
                        for (const btn of allVariants) {
                            const parent = btn.parentElement;
                            if (parent) {
                                if (!variantGroups.has(parent)) variantGroups.set(parent, []);
                                variantGroups.get(parent)?.push(btn);
                            }
                        }
                    }

                    for (const [parent, buttons] of variantGroups) {
                        const isSelected = buttons.some(b => b.className.includes('--selected') || b.getAttribute('aria-selected') === 'true');
                        if (!isSelected) {
                            let target = buttons[0]; 
                            if (variantKeyword) {
                                const match = buttons.find(b => (b as HTMLElement).innerText.toLowerCase().includes(variantKeyword.toLowerCase()));
                                if (match) target = match;
                            }
                            if (target.className.includes('disabled') || target.getAttribute('aria-disabled') === 'true') {
                                const next = buttons.find(b => !b.className.includes('disabled') && b.getAttribute('aria-disabled') !== 'true');
                                if (next) target = next;
                            }
                            if (target) {
                                (target as HTMLElement).click();
                                await sleep(200);
                            }
                        }
                    }

                    // 2. Click Buy Button
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const buyBtn = buttons.find(b => {
                        const t = b.innerText.toLowerCase();
                        return (t.includes('buy now') || t.includes('beli sekarang')) && 
                               (b.className.includes('btn-solid-primary') || b.className.includes('btn--l'));
                    });

                    if (buyBtn && !buyBtn.disabled && (buyBtn as HTMLElement).offsetParent !== null) {
                        (buyBtn as HTMLElement).click();
                        console.log('>>> CLICKED BUY BUTTON <<<');
                        await sleep(2000);
                        continue;
                    }

                    // 3. Confirm Dialog
                    const confirmBtn = buttons.find(b => b.innerText.toLowerCase().includes('confirm') && b.className.includes('btn-solid-primary'));
                    if (confirmBtn && !confirmBtn.disabled && (confirmBtn as HTMLElement).offsetParent !== null) {
                        (confirmBtn as HTMLElement).click();
                        await sleep(1000);
                    }

                    await sleep(100);
                }
                return 'TIMEOUT';
            }, { variantKeyword: VARIANT_KEYWORD });

            console.log(`Result: ${result}`);
            break; 

        } catch (e: any) {
            console.error(`\n[Warn] Bot execution failed: ${e.message}`);
            if (e.message.includes('Execution context was destroyed')) {
                await new Promise(r => setTimeout(r, 2000));
            } else {
                throw e;
            }
        }
    }
}

startBot().catch(console.error);