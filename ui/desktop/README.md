# BalanceProjectionApp — Desktop

Tauri wrapper around the React web frontend (`ui/web/`). Packages the app as a native desktop application for Windows/macOS/Linux.

## Getting Started

```bash
npm install
npm run dev
```

This automatically starts the `ui/web` Vite dev server and opens the Tauri window pointing to it.

> **Windows:** Must be run from the **x64 Native Tools Command Prompt for VS 2022** (or after running `vcvars64.bat`) to avoid architecture mismatches during the Rust/Tauri build.

## Production Build

```bash
npm run build
```

Outputs a platform-specific installer to `src-tauri/target/release/bundle/`.

## Structure

```
src-tauri/         # Rust Tauri backend (window config, permissions)
  tauri.conf.json  # App metadata, window size, dev server URL
  Cargo.toml
package.json       # Tauri CLI dependency only — no React code here
```

All frontend code lives in `ui/web/`. Do not duplicate or modify React code here.
