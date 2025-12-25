// 1. Check if Offscreen exists, create if not
async function ensureOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: ['offscreen/offscreen.html']
    });

    if (existingContexts.length > 0) return;

    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['BLOBS'], // Using BLOBS as a generic reason for heavy computation
            justification: 'Running AI embeddings in background'
        });
    } catch (err) {
        if (!err.message.includes('Only a single offscreen')) {
            throw err;
        }
    }
}

// 2. Listen for harvested text from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PAGE_HARVESTED') {
        handleHarvest(message.payload);
    }
    // Return true if async response needed (not used here yet)
});

import { Database } from './lib/db.js';
const db = new Database();

async function handleHarvest(payload) {
    const { url, title, text } = payload;
    
    try {
        await ensureOffscreenDocument();

        // 3. Forward to Offscreen for embedding
        const response = await chrome.runtime.sendMessage({
            type: 'EMBED_TEXT',
            target: 'offscreen',
            text: text
        });

        if (response && response.status === 'success') {
            const vector = response.vector;
            console.log(`[Mnemosyne] Vector received for ${title}. Saving to DB...`);
            
            // 4. Save to IndexedDB
            await db.add(url, title, text, vector);
            console.log(`[Mnemosyne] Saved!`);
        } else {
            console.error('[Mnemosyne] Embedding failed', response);
        }

    } catch (err) {
        console.error('[Mnemosyne] Orchestration Error:', err);
    }
}
