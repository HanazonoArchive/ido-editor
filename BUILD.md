# Building Standalone Executables

## Prerequisites

### All Platforms
1. **Node.js** (v16+)
2. **Python 3.x** installed on build machine
3. Install dependencies:
   ```bash
   npm install
   npm install --save-dev electron-builder
   pip install -r requirements.txt
   ```

## Building

### Windows
```bash
npm run build:win
```

**Output:** `dist/IDO Editor Setup.exe` (installer) and `dist/IDO Editor.exe` (portable)

### macOS
```bash
npm run build:mac
```

**Output:** `dist/IDO Editor.dmg` and `dist/IDO Editor.app.zip`

### Linux
```bash
npm run build:linux
```

**Output:** `dist/IDO-Editor.AppImage` and `dist/ido-editor.deb`
