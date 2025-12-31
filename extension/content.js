
// Shopee Sniper - Content Script
// Runs INSIDE the page context. No automated headers. No CDP.

console.log('%c Shopee Sniper Loaded 🎯 ', 'background: #f53d2d; color: #fff; font-size: 14px; font-weight: bold;');

let CONFIG = {
    autoBuy: true,
    variantKeyword: ''
};

// Load settings
chrome.storage.local.get(['autoBuy', 'variantKeyword'], (data) => {
    if (data.autoBuy !== undefined) CONFIG.autoBuy = data.autoBuy;
    if (data.variantKeyword) CONFIG.variantKeyword = data.variantKeyword;

    if (CONFIG.autoBuy) {
        console.log(`Sniper Active for Keyword: "${CONFIG.variantKeyword}"`);
        startLoop();
    } else {
        console.log('Sniper Disabled (Check Popup settings)');
    }
});

function startLoop() {
    const loop = setInterval(() => {
        try {
            // 1. ANALYZE VARIANTS
            const variants = Array.from(document.querySelectorAll('button.product-variation'));
            const selectedVariant = document.querySelector('button.product-variation--selected');
            const isDisabled = (v) => v.classList.contains('product-variation--disabled') || v.disabled;

            // Logic: If variants exist, we MUST have one selected before buying.
            if (variants.length > 0) {
                if (!selectedVariant) {
                    // Need to select one!
                    let target = variants[0]; // Default to first

                    if (CONFIG.variantKeyword) {
                        const match = variants.find(v => v.innerText.toLowerCase().includes(CONFIG.variantKeyword.toLowerCase()));
                        if (match) target = match;
                    }

                    // Click if not disabled
                    if (!isDisabled(target)) {
                        target.click();
                        console.log('Sniper: Clicked Variant ->', target.innerText);
                    }

                    // CRITICAL: Return here! Do not try to buy in the same tick.
                    // Wait for the UI to update and apply the 'selected' class.
                    return;
                }
            }

            // 2. CLICK BUY BUTTON (Only if we passed the variant check)
            const buttons = Array.from(document.querySelectorAll('button'));
            const buyBtn = buttons.find(b => {
                const t = b.innerText.toLowerCase().trim();
                return (t === 'buy now' || t === 'beli sekarang' || t === 'buy with voucher') &&
                    b.classList.contains('btn-solid-primary');
            });

            if (buyBtn && !buyBtn.disabled && buyBtn.offsetParent !== null) {
                buyBtn.click();
                console.log('%c Sniper: CLICKED "BUY NOW" ', 'background: green; color: #fff; font-size: 16px;');
            }

            // 3. CHECKOUT PAGE
            if (window.location.href.includes('checkout')) {
                const placeOrderBtn = buttons.find(b => {
                    const t = b.innerText.toLowerCase().trim();
                    return (t === 'place order' || t === 'buat pesanan') && b.classList.contains('stardust-button--primary');
                });

                if (placeOrderBtn) {
                    placeOrderBtn.click();
                    console.log('Sniper: PLACED ORDER');
                    clearInterval(loop);
                }
            }

        } catch (e) {
            console.error('Sniper Error:', e);
        }
    }, 50);
}
```
