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

const timeFilterInput = document.getElementById('time-filter');

searchBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    resultsDiv.innerHTML = '<div class="loading">Consulting the neural matrix...</div>';

    try {
        // 1. Embed the query
        const queryVector = await getEmbedding(query);

        // 2. Search DB (Hybrid: Vector + Keyword)
        const timeFilter = timeFilterInput.value;
        const results = await db.search(queryVector, query, 10, timeFilter);

        // 3. Render
        resultsDiv.innerHTML = '';
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="loading" style="animation:none">No memories matching that concept found.</div>';
            return;
        }

        results.forEach((item, index) => {
            const div = document.createElement('div'); // Wrapper div for relative positioning
            div.className = 'result-item';
            div.style.animationDelay = `${index * 0.05}s`;
            
            // Handle Favicon (fallback if empty)
            const faviconUrl = item.favicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📄</text></svg>';
            
            const scorePct = Math.round(item.score * 100);
            
            div.innerHTML = `
                <div class="result-header">
                    <img src="${faviconUrl}" class="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"/>
                    <a href="${item.url}" target="_blank" class="result-title">${item.title}</a>
                </div>
                
                <div class="result-meta">
                    <span class="score-badge">${scorePct}% Match</span>
                    <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>

                <button class="delete-btn" data-url="${item.url}" title="Forget this memory">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
            resultsDiv.appendChild(div);
        });

        // Add Event Listeners for Delete Buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // prevent triggering the link if we clicked div (though link is separate now)
                if (confirm('Forget this memory forever?')) {
                    const url = btn.dataset.url;
                    await db.delete(url);
                    // Remove visually
                    btn.closest('.result-item').remove();
                }
            });
        });

    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = `<div style="color:#ef4444; padding:10px;">Error: ${err.message}</div>`;
    }
});
