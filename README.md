# Loci onboarding

Clickable prototype of the Loci onboarding flow: Home → model setup → model download → chat.
Plain HTML, CSS and JS; `run.py` only serves the folder locally.

## Run

```bash
py run.py
```

Or double-click `Loci.cmd` on Windows. It opens http://127.0.0.1:5173 in its own app window.
Add `?speed=10` to the URL to make the simulated download 10× faster.

## Hosting (e.g. Netlify)

No build step: publish the repo root as-is.

- In a normal browser tab the app is shown inside a drawn 1280×832 Mac window.
- Chrome / Edge also offer **Install Loci** (address bar icon). Installed, it opens in its
  own window with no tabs or address bar, sized to 1280×832.
