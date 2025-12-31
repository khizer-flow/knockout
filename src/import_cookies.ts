
import { firefox } from 'playwright';
import { CONFIG } from './config';
import fs from 'fs-extra';
import path from 'path';

async function importCookies() {
    const cookiesPath = path.join(__dirname, '../cookies.json');

    if (!fs.existsSync(cookiesPath)) {
        console.error('Error: cookies.json not found!');
        return;
    }

    const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
    let cookies: any[];
    try {
        cookies = JSON.parse(cookiesContent);
        if (!Array.isArray(cookies)) {
            throw new Error('Not an array');
        }
    } catch (e) {
        console.error('Error parsing cookies.json');
        return;
    }

    console.log(`Read ${cookies.length} cookies.`);

    // Sanitize cookies for Playwright/Firefox
    const validCookies = cookies.map(c => {
        // Create a clean object
        const newCookie: any = {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            expires: c.expirationDate
        };

        // Handle SameSite strict casing
        let ss = c.sameSite;
        if (!ss || ss === 'unspecified' || ss === 'no_restriction') {
            newCookie.sameSite = 'None';
        } else if (ss.toLowerCase() === 'lax') {
            newCookie.sameSite = 'Lax';
        } else if (ss.toLowerCase() === 'strict') {
            newCookie.sameSite = 'Strict';
        } else {
            newCookie.sameSite = 'None';
        }

        return newCookie;
    });

    console.log(`Sanitized ${validCookies.length} cookies.`);

    fs.ensureDirSync(CONFIG.USER_DATA_DIR);

    const context = await firefox.launchPersistentContext(CONFIG.USER_DATA_DIR, {
        headless: false,
        args: [],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('Clearing existing cookies...');
    await context.clearCookies();

    console.log('Injecting sanitized cookies...');
    await context.addCookies(validCookies);

    console.log('Navigating to Shopee...');
    await page.goto(CONFIG.SHOPEE_URL);

    console.log('---------------------------------------------------------');
    console.log('CHECK BROWSER: If you are logged in, CLOSE the browser.');
    console.log('---------------------------------------------------------');

    // We need to wait for the user to close it to "save" the state effectively 
    // (mostly for the user confirmation, the persistent context auto-saves to disk on close)
}

importCookies().catch(console.error);
