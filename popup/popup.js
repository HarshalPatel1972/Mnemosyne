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

    resultsDiv.innerHTML = '<div style="color:#888;">Thinking...</div>';

    try {
        // 1. Embed the query
        const queryVector = await getEmbedding(query);

        // 2. Search DB
        const results = await db.search(queryVector);

        // 3. Render
        resultsDiv.innerHTML = '';
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div style="padding:10px;">No memories found.</div>';
            return;
        }

        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            const scorePct = Math.round(item.score * 100);
            div.innerHTML = `
                <a href="${item.url}" target="_blank" class="result-title">${item.title}</a>
                <div class="result-meta">
                    <span class="score">${scorePct}% Match</span>
                    ${new Date(item.timestamp).toLocaleDateString()}
                </div>
            `;
            resultsDiv.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = `<div style="color:red;">Error: ${err.message}</div>`;
    }
});
