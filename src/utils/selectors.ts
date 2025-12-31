export const SELECTORS = {
    // Product Page
    PRODUCT: {
        PRICE: '.pqTWkA', // The main price element (class often generated, so might be unstable)
        PRICE_ALT: 'div:has-text("RM")', // Fallback
        BUY_NOW_BTN: 'button.btn-solid-primary:has-text("Buy Now"), button:has-text("Buy Now"), button:has-text("Beli Sekarang"), button:has-text("Buy With Voucher")',
        ADD_CART_BTN: 'button.btn-tinted:has-text("Add To Cart")',
        VARIANT_CONTAINER: '.flex.items-center', // Generic flex container for variants
        VARIANT_OPTION: 'button.product-variation',
        VARIANT_SELECTED: 'button.product-variation--selected',
        QUANTITY_INPUT: 'input[role="spinbutton"]',
    },
    // Cart / Checkout
    CHECKOUT: {
        CHECKOUT_BTN: 'button.shopee-button-solid--primary:has-text("Checkout"), button:has-text("Check Out")',
        PLACE_ORDER_BTN: 'button.stardust-button--primary:has-text("Place Order"), button:has-text("Place Order"), button:has-text("Buat Pesanan")',
        PAYMENT_OPTION: '.checkout-payment-method-view__current-item', // To verify payment is selected
        TOTAL_PRICE: '.checkout-payment-section__current-price',
    },
    // Popups / Overlays
    POPUP: {
        CLOSE_BTN: 'div.shopee-popup__close-btn', // Generic close button for ads
    }
};
