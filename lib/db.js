const DB_NAME = 'MnemosyneDB';
const DB_VERSION = 1;
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

  async add(url, title, text, vector, timestamp = Date.now()) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        url,
        title,
        text, // Full text or snippet
        vector, // Float32Array
        timestamp
      });

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
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
  
  // Basic vector search (brute force - okay for small history)
  // For production, use a specialized vector store or HNSW index
  async search(queryVector, limit = 10) {
    const items = await this.getAll();
    if (!items.length) return [];

    // Cosine similarity
    const results = items.map(item => {
      const sim = this.cosineSimilarity(queryVector, item.vector);
      return { ...item, score: sim };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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
