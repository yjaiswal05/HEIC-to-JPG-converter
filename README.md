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

## Deploy to Netlify

This app is ready to deploy as a static site on Netlify.

If you connect the whole repo to Netlify:

1. Set the **Base directory** to `image-converter`
2. Leave the **Build command** empty
3. Leave the **Publish directory** empty, because [netlify.toml](C:\Users\Asus\Desktop\codex project\image-converter\netlify.toml) already publishes the current folder

If you want to deploy manually instead:

1. Open the `image-converter` folder
2. Prefer deploying it with the Netlify CLI from inside that folder, or drag only the static site files into Netlify Drop

Notes for Netlify:

- [.netlifyignore](C:\Users\Asus\Desktop\codex project\image-converter\.netlifyignore) keeps `node_modules` and local project files out of the deployed site
- [netlify.toml](C:\Users\Asus\Desktop\codex project\image-converter\netlify.toml) adds cache rules so the service worker updates correctly while bundled vendor files stay cached efficiently
- Offline mode will work after the site has been loaded once in the browser

## Notes

- Conversion is powered by a local copy of `heic2any`.
- ZIP downloads are powered by a local copy of `JSZip`.
- The bundled browser decoder does not preserve HEIC metadata in the exported JPG files.
