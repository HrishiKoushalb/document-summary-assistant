# Approach

Document Summary Assistant is a fully client-side React + Vite app — no
backend, no API keys. PDFs are parsed with pdf.js; any page lacking a real
text layer (a scanned page) is automatically rendered to canvas and run
through Tesseract.js OCR, so mixed and fully-scanned PDFs still work.
Plain images go straight to OCR.

For summarization, I implemented TextRank — an unsupervised, graph-based
algorithm ranking sentences by centrality — from scratch in plain JS,
rather than calling a hosted LLM API. This was deliberate: documents
never leave the browser (meaningful for a document tool), there's no
API key/rate-limit/uptime dependency, and the demo behaves identically
on request one and ten thousand. The tradeoff is an extractive summary
rather than a rewritten abstract; for faithfulness to source material,
that felt like the right call.

Short/Medium/Long re-summarizes instantly from cached extracted text —
no re-parsing. Key points are shown separately as the highest-ranked
sentences. Loading states track each pipeline stage, and errors are
specific (unsupported type, oversized file, no readable text, corrupt
file) rather than generic. I load-tested against a real multi-page PDF
and fixed a genuine browser-compatibility bug (a missing `Uint8Array`
method inside pdf.js's Web Worker) found during that testing.
