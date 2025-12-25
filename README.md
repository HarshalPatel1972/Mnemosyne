# 🧠 Mnemosyne - The Semantic History Tool

**Mnemosyne** (named after the Greek goddess of memory) is a Chrome Extension that gives you a "Second Brain." 

Unlike your standard browser history, which only remembers *keywords* (e.g., "google.com"), Mnemosyne remembers the **concepts and meaning** of the pages you visit.

> **Example:** You read an article about "How to pull the perfect espresso shot."
> *   **Standard History:** You must search for "espresso" or the exact website title.
> *   **Mnemosyne:** You can search for *"morning coffee tips"* or *"barista guide"*, and it will find the page even if those exact words weren't in the title!

## ✨ Key Features

*   **🔒 100% Private & Local:** Your history *never* leaves your device. The AI runs entirely inside your browser. No cloud, no sending data to OpenAI/Google.
*   **🧠 Semantic Search:** Search by *idea*, not just keyword.
*   **🖱️ Smart Context Menu:** Highlight text on any page -> Right Click -> "Search Mnemosyne" to find related memories instantly.
*   **📊 Memory Dashboard:** A beautiful full-screen view to explore your reading history with filters.
*   **⏱️ Time Travel:** Filter your search by "Last 24 Hours", "Last 7 Days", etc.
*   **🗑️ Data Sovereignty:** Easily delete any memory forever with one click.

## 🚀 How to Install

**Easy Method (For Everyone):**
1.  Go to the [Releases Page](https://github.com/HarshalPatel1972/Mnemosyne/releases).
2.  Download the latest `mnemosyne-v1.zip` file.
3.  Unzip it to a folder on your computer.
4.  Open Chrome and navigate to `chrome://extensions`.
5.  Toggle **Developer mode** (top right corner).
6.  Click **Load unpacked**.
7.  Select the unzipped folder.

**Developer Method:**
1.  Clone this repository.
2.  Follow steps 4-7 above.

## 📖 How to Use

### 1. Just Browse 🌐
Mnemosyne works in the background. It only saves a page if you stay on it for **more than 30 seconds**. This ensures it only remembers what you actually read, not click-bait you immediately closed.

### 2. The Popup Search 🔎
Click the **Mnemosyne Icon** in your toolbar.
*   Type a concept (e.g., *"coding errors in python"*).
*   Filter by time if you want (e.g., *"Last 7 Days"*).
*   Click **Find**.

### 3. The Dashboard 📊
Want a bigger view?
*   Highlight any text on a web page.
*   **Right-Click** -> Select **"Search Mnemosyne for..."**
*   This opens the **Dashboard**, where you can browse all your memories in a visual grid.

## 🛠️ Technical Details (For Nerds)
*   **Engine:** `Transformers.js` (running `Xenova/all-MiniLM-L6-v2` quantized).
*   **Storage:** `IndexedDB` (Native Browser DB) for vector storage.
*   **Architecture:** Manifest V3 with an Offscreen Document for heavy AI processing to keep the UI lag-free.

---
*Built with ❤️ for a smarter, private web experience.*
