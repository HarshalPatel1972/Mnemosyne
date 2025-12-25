import { Database } from '../lib/db.js';

const db = new Database();
const resultsDiv = document.getElementById('results');
const searchBtn = document.getElementById('search-btn');
const queryInput = document.getElementById('query');

// Ensure offscreen is ready to handle the query embedding
// We can reuse the same message type 'EMBED_TEXT'
async function getEmbedding(text) {
    // Check if offscreen exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: ['offscreen/offscreen.html']
    });

    if (existingContexts.length === 0) {
        try {
            await chrome.offscreen.createDocument({
                url: 'offscreen/offscreen.html',
                reasons: ['BLOBS'],
                justification: 'Search embedding'
            });
        } catch (err) {
            // Ignore error if it was created concurrently
            if (!err.message.includes('Only a single offscreen')) {
                throw err;
            }
        }
    }

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'EMBED_TEXT',
            target: 'offscreen',
            text: text
        }, (response) => {
             if (chrome.runtime.lastError) {
                 reject(chrome.runtime.lastError);
             } else if (response && response.status === 'success') {
                 resolve(response.vector);
             } else {
                 reject(response ? response.error : 'Unknown error');
             }
        });
    });
}

searchBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    resultsDiv.innerHTML = '<div class="loading">Consulting the neural matrix...</div>';

    try {
        // 1. Embed the query
        const queryVector = await getEmbedding(query);

        // 2. Search DB
        const results = await db.search(queryVector);

        // 3. Render
        resultsDiv.innerHTML = '';
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="loading" style="animation:none">No memories matching that concept found.</div>';
            return;
        }

        results.forEach((item, index) => {
            const div = document.createElement('a');
            div.className = 'result-item';
            div.href = item.url;
            div.target = "_blank";
            div.style.animationDelay = `${index * 0.05}s`; // Staggered animation

            const scorePct = Math.round(item.score * 100);
            
            div.innerHTML = `
                <div class="result-header">
                    <span class="result-title">${item.title}</span>
                    <span class="score-badge">${scorePct}%</span>
                </div>
                <div class="result-meta">
                    <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
            `;
            resultsDiv.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = `<div style="color:#ef4444; padding:10px;">Error: ${err.message}</div>`;
    }
});
