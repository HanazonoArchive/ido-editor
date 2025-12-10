const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    autoHideMenuBar: true,
  });

  mainWindow.loadFile("index.html");
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters || []
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || '',
    filters: options.filters || []
  });
  
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('run-python-tool', async (event, operation, inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'ido_tool.py');
    const pythonProcess = spawn('python', [pythonScript, operation, inputPath, outputPath]);
    
    let logs = [];
    let resultData = null;
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      const lines = output.split('\n');
      
      lines.forEach(line => {
        if (line.startsWith('RESULT:')) {
          // Final result
          try {
            resultData = JSON.parse(line.substring(7));
          } catch (e) {
            console.error('Failed to parse result:', e);
          }
        } else {
          // Log message
          try {
            const logEntry = JSON.parse(line);
            logs.push(logEntry);
            // Send real-time log to renderer
            event.sender.send('python-log', logEntry);
          } catch (e) {
            // Non-JSON output
            logs.push({ level: 'INFO', message: line });
            event.sender.send('python-log', { level: 'INFO', message: line });
          }
        }
      });
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      logs.push({ level: 'ERROR', message: error });
      event.sender.send('python-log', { level: 'ERROR', message: error });
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0 && resultData) {
        resolve({ ...resultData, logs });
      } else {
        resolve({
          success: false,
          error: `Process exited with code ${code}`,
          logs
        });
      }
    });
    
    pythonProcess.on('error', (err) => {
      reject({
        success: false,
        error: err.message,
        logs
      });
    });
  });
});
