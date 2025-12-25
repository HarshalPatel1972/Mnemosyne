const DB_NAME = 'MnemosyneDB';
const DB_VERSION = 2;
const STORE_NAME = 'semantic_history';

export class Database {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject('IndexedDB error: ' + event.target.errorCode);
      };
    });
  }

  async add(url, title, text, vector, favicon, timestamp = Date.now()) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        url,
        title,
        text,
        vector,
        favicon, // New field
        timestamp
      });

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }

  async delete(url) {
    await this.open();
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(url);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
  }

  // Hybrid Search: Vector (Semantic) + Keyword Boost + Time Filter
  async search(queryVector, queryText, limit = 10, timeFilter = 'all') {
    let items = await this.getAll();
    if (!items.length) return [];

    // Filter by Time
    if (timeFilter !== 'all') {
        const now = Date.now();
        let cutoff = 0;
        if (timeFilter === '24h') cutoff = now - (24 * 60 * 60 * 1000);
        else if (timeFilter === '7d') cutoff = now - (7 * 24 * 60 * 60 * 1000);
        else if (timeFilter === '30d') cutoff = now - (30 * 24 * 60 * 60 * 1000);
        
        items = items.filter(item => item.timestamp >= cutoff);
    }
    
    // Pre-filtering (Optional): If dataset grows large, filtering by keyword *first* is faster, 
    // but we want Semantic to find things that *don't* have keywords too. 
    // So we iterate all, but apply a boost.

    const keywords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const results = items.map(item => {
      // 1. Semantic Score (Cosine -1 to 1)
      let score = this.cosineSimilarity(queryVector, item.vector);

      // 2. Keyword Boost
      // If the title or text contains the exact query words, boost the score.
      let fullText = (item.title + " " + item.text).toLowerCase();
      let matches = 0;
      keywords.forEach(kw => {
          if (fullText.includes(kw)) matches++;
      });

      // Boost logic: +10% per matching keyword, capped at +30%
      let boost = Math.min(matches * 0.1, 0.3);
      score += boost;

      return { ...item, score: score };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getAll() {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e);
    });
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
