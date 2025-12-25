import { Database } from '../lib/db.js';

const db = new Database();
const queryInput = document.getElementById('query');
const timeFilterInput = document.getElementById('time-filter');
const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');
const statsDiv = document.getElementById('stats');

// Reuse the embedding logic
async function getEmbedding(text) {
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
        } catch(e) {}
    }

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'EMBED_TEXT',
            target: 'offscreen',
            text: text
        }, (response) => {
             if (response && response.status === 'success') resolve(response.vector);
             else reject(response ? response.error : 'Unknown error');
        });
    });
}

async function performSearch(query) {
    if(!query) return;
    
    // Update Input
    queryInput.value = query;
    resultsDiv.innerHTML = '<div class="placeholder">Analyzing...</div>';

    try {
        const queryVector = await getEmbedding(query);
        const timeFilter = timeFilterInput.value;
        const results = await db.search(queryVector, query, 50, timeFilter); // Limit 50 for dashboard

        renderResults(results);
    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = `<div class="placeholder" style="color:salmon">Error: ${err.message}</div>`;
    }
}

function renderResults(results) {
    resultsDiv.innerHTML = '';
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="placeholder">No memories found.</div>';
        return;
    }

    // Update stats
    statsDiv.innerText = `Found ${results.length} relevant memories.`;

    results.forEach(item => {
        const card = document.createElement('a');
        card.className = 'result-card';
        card.href = item.url;
        card.target = '_blank';

        const faviconUrl = item.favicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📄</text></svg>';
        
        // Extract a snippet (naive)
        // In real app, we'd highlight keywords.
        // We'll just take the first 150 chars of text for now, or the stored text.
        // Since `text` in DB is the "Semantic Text" blob (Title + Desc + H1 + Body), let's show it.
        // Clean it up:
        let snippet = item.text.replace(/Title:.*?Content:/, '').substring(0, 200) + '...';

        card.innerHTML = `
            <div class="card-header">
                <img src="${faviconUrl}" class="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"/>
                <div class="card-title">${item.title}</div>
            </div>
            <div class="card-snippet">${snippet}</div>
            <div class="card-meta">
                <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                <span class="score-tag">${Math.round(item.score * 100)}% Match</span>
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

// 1. Listen for clicks
searchBtn.addEventListener('click', () => performSearch(queryInput.value));
queryInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(queryInput.value); });
timeFilterInput.addEventListener('change', () => { 
    if(queryInput.value) performSearch(queryInput.value); 
});

// 2. Load Stats on init
async function init() {
    const items = await db.getAll();
    statsDiv.innerText = `Total Memories Stored: ${items.length}`;

    // 3. check URL params (from Context Menu)
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');
    if (query) {
        performSearch(query);
    }
}

init();
