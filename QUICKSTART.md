# Quick Start Guide - IDO Compiler & Decompiler

## First Time Setup

1. **Open terminal in the project folder**
2. **Install dependencies** (one time only):
   ```bash
   npm install
   ```

3. **Verify Python is installed**:
   ```bash
   python --version
   ```
   Should show Python 3.x

## Running the Application

```bash
npm start
```

The GUI window will open automatically.

## Basic Workflow

### To Decompile an IDO File:

1. **Select the Decompile tab** (blue folder icon)
2. **Click "Browse"** next to "Select IDO File"
3. **Choose your .ido file**
4. **Click "Save As"** to set output location (or use auto-suggested path)
5. **Click "Start Decompilation"**
6. **Watch the console** for real-time progress

📌 **Result**: Creates XML, texture, or CSV file + `.meta` file (if binary)

### To Compile back to IDO:

1. **Select the Compile tab** (blue package icon)
2. **Click "File"** to select XML or binary texture
   - OR **Click "Folder"** to select a directory
3. **Click "Save As"** to set output `.ido` location
4. **Click "Start Compilation"**
5. **Watch the console** for progress

⚠️ **Important**: Binary files need their `.meta` file in the same folder!

## Understanding the Console

- **Blue messages** = Information and progress
- **Green messages** = Success!
- **Orange messages** = Warnings (non-critical)
- **Red messages** = Errors

Click **"Clear"** button to clear the console log.

## Tips

✅ **Auto-suggestion**: Output paths are automatically suggested based on input
✅ **Keep .meta files**: Always keep the `.meta` files with binary exports
✅ **Real-time feedback**: Watch the console for detailed operation progress
✅ **Multiple operations**: Switch tabs to compile/decompile different files

## Common File Extensions

| Extension | Description |
|-----------|-------------|
| `.ido` | Compressed game asset file |
| `.xml` | Decompiled data (text) |
| `.meta` | Header metadata for recompilation |
| `.dds/.tga/.bmp/.png` | Extracted textures |
| `.csv` | Shop database export |
| `.gb` | Gamebryo state block |

## Troubleshooting

**"Python not found"**
- Install Python from python.org
- Or add Python to your system PATH

**"Header not found"**
- When compiling, ensure `.meta` file exists
- Or check if XML has embedded header comment

**"Process failed"**
- Check console for detailed error messages
- Verify input file is not corrupted
- Ensure sufficient disk space

## Need Help?

Check the full README.md for detailed technical information and advanced usage.

---

🎮 **Happy modding!**
