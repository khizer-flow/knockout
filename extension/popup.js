document.addEventListener('DOMContentLoaded', () => {
    const variantInput = document.getElementById('variantKeyword');
    const autoBuyInput = document.getElementById('autoBuy');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load settings
    chrome.storage.local.get(['variantKeyword', 'autoBuy'], (data) => {
        if (data.variantKeyword) variantInput.value = data.variantKeyword;
        if (data.autoBuy !== undefined) autoBuyInput.checked = data.autoBuy;
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const keyword = variantInput.value;
        const autoBuy = autoBuyInput.checked;

        chrome.storage.local.set({
            variantKeyword: keyword,
            autoBuy: autoBuy
        }, () => {
            statusDiv.textContent = 'Settings Saved!';
            setTimeout(() => statusDiv.textContent = 'State: ' + (autoBuy ? 'Active' : 'Inactive'), 1500);
        });
    });
});
