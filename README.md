# sj-assistant

A minimal playground that demonstrates how to interact with the Google Gemini Generative AI REST API directly from the browser.

## Features

- **Gemini API client** (`src/aiClient.js`) that wraps chat completion and knowledge search calls with retry, safety, and error handling logic.
- **Secure API key flow** that stores the key locally (via `localStorage`) with validation and the ability to clear the stored key.
- **Request builder** (`src/requestBuilder.js`) that merges conversation history and optional knowledge context into each request payload.
- **Progressive rendering utilities** that stream responses chunk-by-chunk in the UI for a responsive experience.
- **Sample UI** (`index.html` + `src/ui.js`) showcasing chat and knowledge query flows with loading indicators and graceful error messaging.

## Getting started

1. Open `index.html` in a modern browser (recommended: Chrome, Edge, or Firefox).
2. Enter your Google Generative AI (Gemini) API key and click **Save key**.
3. Ask a question in the **Chat Completion** section or run a **Knowledge Search**.
4. Watch responses stream progressively and inspect raw console logs for debugging details.

> **Note:** The project is intentionally lightweight—no build tooling is required. All code runs directly in the browser using native ES modules.
