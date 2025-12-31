
import { chromium } from 'playwright';
import { CONFIG } from './config';
import fs from 'fs-extra';

async function loginViaCDP() {
    console.log('---------------------------------------------------------');
    console.log('  SHOPEE BOT - SESSION EXTRACTOR');
    console.log('---------------------------------------------------------');
    console.log('Step 1: Close ALL Chrome windows.');
    console.log('Step 2: Press Win+R, run: chrome.exe --remote-debugging-port=9222');
    console.log('Step 3: In that Chrome, ensure you are logged into Shopee.');
    console.log('Step 4: Press ENTER in this terminal.');
    console.log('---------------------------------------------------------');

    await new Promise<void>(resolve => process.stdin.once('data', () => resolve()));

    console.log('Connecting to Chrome...');
    try {
        const browser = await chromium.connectOverCDP('http://localhost:9222');
        const context = browser.contexts()[0];

        console.log('Connected! Saving session state...');

        // Save to our configured cookies path
        await context.storageState({ path: CONFIG.COOKIES_PATH });

        console.log(`Session saved successfully to: ${CONFIG.COOKIES_PATH}`);
        console.log('You can now run "npm start ..."');

        await browser.close();
        process.exit(0);

    } catch (e) {
        console.error('Connection failed. Is Chrome running with port 9222?');
        console.error(e);
        process.exit(1);
    }
}

loginViaCDP().catch(console.error);
