import { firefox } from 'playwright'; // Switching to Firefox
import { CONFIG } from './config';
import fs from 'fs-extra';

async function manualLoginPersistent() {
    console.log('---------------------------------------------------------');
    console.log('  SHOPEE BOT - MANUAL LOGIN (FIREFOX MODE)');
    console.log('---------------------------------------------------------');
    console.log('1. A FIREFOX window will open.');
    console.log('2. We switched to Firefox to bypass Chrome detection.');
    console.log('3. Log in to Shopee Malaysia manually.');
    console.log('4. Once checked in, CLOSE THE BROWSER WINDOW to save.');
    console.log('---------------------------------------------------------');

    // Ensure directory exists
    fs.ensureDirSync(CONFIG.USER_DATA_DIR);

    // Firefox often evades Chrome-specific anti-bot scripts
    // Note: Persistent Context in Firefox might require specific user data handling
    // Playwright handles basic profile creation.
    const context = await firefox.launchPersistentContext(CONFIG.USER_DATA_DIR, {
        headless: false,
        viewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('Navigating to Shopee...');
    await page.goto(CONFIG.SHOPEE_URL);

    return new Promise<void>((resolve) => {
        page.on('close', () => {
            console.log('Page closed, saving session...');
            setTimeout(() => {
                context.close().then(() => resolve());
            }, 2000);
        });
    });
}

manualLoginPersistent().catch(console.error);
