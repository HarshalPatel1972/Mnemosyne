import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Configure environment to skip local model checks if needed (we want local formatted models)
// Since we are in an extension, we likely want to load models from the cache or web.
// 'allowLocalModels: false' forces it to fetch from remote (HuggingFace) if not cached.
env.allowLocalModels = false; 

// Singleton instance
class Embedder {
    static instance = null;

    static async getInstance() {
        if (!this.instance) {
            console.log("Loading AI Model...");
            // Quantized Xeno for speed
            this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true 
            });
            console.log("AI Model Loaded.");
        }
        return this.instance;
    }
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'EMBED_TEXT') {
        (async () => {
             try {
                 const embedder = await Embedder.getInstance();
                 // Mean pooling is often used for sentence embeddings
                 const output = await embedder(message.text, { pooling: 'mean', normalize: true });
                 // Output is a Tensor, we want the data array
                 const vector = Array.from(output.data); 
                 
                 sendResponse({ status: 'success', vector: vector });
             } catch (error) {
                 console.error("Embedding Error", error);
                 sendResponse({ status: 'error', error: error.toString() });
             }
        })();
        return true; // Keep channel open for async response
    }
});
