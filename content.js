// Wait 30 seconds before harvesting (as per specific Project Mandate)
// Only harvest if user is still on the page? 
// Mandate says: "visits > 30 seconds".

let hasHarvested = false;

// Simple check: restart timer if visibility changes or just fire once after 30s?
// "pages I visit >30 seconds". Simples impl: Valid after 30s residence.

setTimeout(() => {
    if (document.hidden) {
        // If tab is hidden, maybe don't harvest yet? 
        // For v1, let's keep it simple. If the content script is alive for 30s, we harvest.
    }
    harvest();
}, 30000); 

function harvest() {
    if (hasHarvested) return;
    hasHarvested = true;

    const title = document.title;
    const metaDesc = document.querySelector('meta[name="description"]')?.content || "";
    const h1 = document.querySelector('h1')?.innerText || "";
    const bodyText = document.body.innerText.substring(0, 500).replace(/\s+/g, ' ').trim();

    // Construct "Semantic Text"
    // Combine robustly
    const fullText = `Title: ${title}. Description: ${metaDesc}. Header: ${h1}. Content: ${bodyText}`;

    chrome.runtime.sendMessage({
        type: 'PAGE_HARVESTED',
        payload: {
            url: window.location.href,
            title: title,
            text: fullText
        }
    });

    console.log('[Mnemosyne] Page harvested for memory.');
}
