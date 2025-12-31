import path from 'path';

export const CONFIG = {
    SHOPEE_URL: 'https://shopee.com.my',
    // We now use a real Chrome User Data Directory instead of just a JSON file.
    // This allows saving LocalStorage, Cache, IndexedDB - making us look much more human.
    USER_DATA_DIR: path.join(__dirname, '../user_data'),
    HEADLESS: false,
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};
