# Approach

Document Summary Assistant is a fully client-side React + Vite app — no
backend, no API keys. PDFs are parsed with pdf.js; any page lacking a real
text layer (a scanned page) is automatically rendered to canvas and run
through Tesseract.js OCR, so mixed and fully-scanned PDFs still work.
Plain images go straight to OCR.

For summarization, I implemented TextRank — an unsupervised, graph-based
algorithm ranking sentences by centrality — from scratch in plain JS,
rather than calling a hosted LLM API. This was deliberate: documents
never leave the browser, there's no API key/rate-limit/uptime dependency,
and the app behaves identically on request one and ten thousand. The
tradeoff is an extractive summary, not a rewritten abstract; for
faithfulness to source material, that felt right.

Tesseract's OCR worker, WASM engine, and language model default to
loading from a public CDN at runtime — a hidden dependency removed by
self-hosting all three, so OCR can't silently break behind a corporate
proxy or CDN outage.

Beyond the core build: an optional query field steers summarization
toward a topic, a "how this was ranked" panel makes sentence scoring
inspectable instead of a black box, and the app is now installable and
usable fully offline.
