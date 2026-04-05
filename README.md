# Offline HEIC to JPG Converter

This is a browser-only HEIC/HEIF to JPG converter. Files stay in memory inside the browser session, are never uploaded, and are never stored in a database.

## Features

- single-file upload
- bulk upload
- individual JPG download
- selected-files ZIP download
- full-batch ZIP download
- offline support after the first load through a service worker

## Run locally

Because service workers require a web origin, serve this folder over `http://localhost` instead of opening `index.html` directly from disk.

Examples:

```powershell
cd "C:\Users\Asus\Desktop\codex project\image-converter"
python -m http.server 8080
```

Then open `http://localhost:8080`.


## Notes

- Offline mode will work after the site has been loaded once in the browser
- Conversion is powered by a local copy of `heic2any`.
- ZIP downloads are powered by a local copy of `JSZip`.
- The bundled browser decoder does not preserve HEIC metadata in the exported JPG files.
