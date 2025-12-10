# IDO & DDS Compiler, Decompiler & Converter

A modern, standalone GUI application for compiling and decompiling `.ido` game asset files. Built with Electron and Python.

## Features

- **Modern Dark Theme UI** - Clean, professional interface with smooth animations
- **Real-time Console Output** - See detailed logs of compilation/decompilation process
- **Dual Mode Operation**:
  - **Decompile**: Extract `.ido` files to XML, textures (DDS, TGA, BMP, PNG), or CSV (shop database)
  - **Compile**: Convert XML/binary files back to `.ido` format
- **DDS Image Converter**: Convert between DDS and PNG formats for texture editing
- **Smart File Detection** - Automatically detects file types and handles accordingly
- **Metadata Preservation** - Saves and restores file headers via `.meta` files
- **EUC-KR Encoding Support** - Proper handling of Korean text encoding

## Supported File Types

### Decompilation
- XML data files
- DDS/TGA/BMP/PNG textures
- Gamebryo State Block binaries (`.gb`)
- Shop Database binaries (`.csv`)

### Compilation
- XML files → IDO
- Binary textures (DDS, TGA, BMP, PNG) → IDO
- Requires `.meta` file for header information

## Installation

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Python 3.x**

### Setup

1. Install dependencies:
```bash
npm install
pip install -r requirements.txt
```

2. Verify Python is accessible:
```bash
python --version
```

## Usage

### Starting the Application

```bash
npm start
```

Or for development with logging:

```bash
npm run dev
```

### Decompiling Files

1. Click the **Decompile** tab
2. Click **Browse** to select an `.ido` file
3. Choose or confirm the output location
4. Click **Start Decompilation**
5. Watch the console for real-time progress

**Output Files:**
- XML files include embedded header as comment
- Binary files have accompanying `.meta` files for recompilation

### Compiling Files

1. Click the **Compile** tab
2. Click **File** or **Folder** to select input
3. Choose the output `.ido` location
4. Click **Start Compilation**
5. Monitor the console for progress

**Requirements:**
- XML files: Header must be embedded or have `.meta` file
- Binary files: Must have corresponding `.meta` file

### Converting DDS Images

1. Click the **DDS Converter** tab
2. Choose conversion direction (DDS→PNG or PNG→DDS)
3. Click **Browse** to select input file
4. Choose output location
5. Click **Convert**

**Notes:**
- DDS to PNG: Extracts uncompressed RGBA8 image
- PNG to DDS: Creates uncompressed DDS file (compatible with most games)
- For compressed DDS formats (BC3/DXT5), use specialized tools

## File Structure

```
ido-editor/
├── main.js           # Electron main process (IPC handlers)
├── renderer.js       # Frontend JavaScript (UI logic)
├── ido_tool.py       # Python backend (compile/decompile logic)
├── index.html        # Application UI structure
├── styles.css        # Modern styling and animations
├── package.json      # Node.js dependencies
└── README.md         # This file
```

## Technical Details

### Python Backend

The `ido_tool.py` script handles:
- Zlib compression/decompression
- EUC-KR encoding/decoding
- File type detection
- Binary structure parsing
- Metadata management

### Electron Frontend

- **IPC Communication**: Bidirectional communication between Python process and UI
- **Real-time Logging**: Live output streaming from Python to console
- **File Dialogs**: Native OS file/folder selection
- **Tab Navigation**: Separate interfaces for compile and decompile operations

## Console Log Levels

- **INFO** (Blue): General information and progress
- **SUCCESS** (Green): Successful operation completion
- **WARNING** (Orange): Non-critical issues
- **ERROR** (Red): Critical failures

## Troubleshooting

### Python not found
Ensure Python is in your system PATH or modify `main.js` to use absolute Python path:
```javascript
const pythonProcess = spawn('C:\\Python\\python.exe', [pythonScript, ...]);
```

### Missing .meta file
When compiling binary files, ensure the `.meta` file exists in the same directory with the same base name.

### Encoding issues
The tool uses EUC-KR encoding for text. Some characters may not map correctly between UTF-8 and EUC-KR.

## Development

### Enable Developer Tools

Uncomment in `main.js`:
```javascript
mainWindow.webContents.openDevTools();
```

### Python Logging

All Python output is captured and displayed in the console. Add `log()` calls in `ido_tool.py` for debugging.

## License

ISC

## Credits

Based on the original Rust implementation of the IDO compiler/decompiler.
