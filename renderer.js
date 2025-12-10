const { ipcRenderer } = require('electron');
const path = require('path');

// State
let state = {
  decompile: {
    input: null,
    output: null
  },
  compile: {
    input: null,
    output: null
  },
  currentTab: 'decompile',
  isProcessing: false
};

// DOM Elements
const elements = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-button'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Decompile
  decompileInput: document.getElementById('decompile-input'),
  decompileInputBtn: document.getElementById('decompile-input-btn'),
  decompileOutput: document.getElementById('decompile-output'),
  decompileOutputBtn: document.getElementById('decompile-output-btn'),
  decompileRunBtn: document.getElementById('decompile-run-btn'),
  
  // Compile
  compileInput: document.getElementById('compile-input'),
  compileInputFileBtn: document.getElementById('compile-input-file-btn'),
  compileInputFolderBtn: document.getElementById('compile-input-folder-btn'),
  compileOutput: document.getElementById('compile-output'),
  compileOutputBtn: document.getElementById('compile-output-btn'),
  compileRunBtn: document.getElementById('compile-run-btn'),
  
  // Console
  logContainer: document.getElementById('log-container'),
  clearLogBtn: document.getElementById('clear-log-btn'),
  
  // Status
  statusText: document.getElementById('status-text'),
  statusDetails: document.getElementById('status-details')
};

// Utility Functions
function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

function addLog(message, level = 'INFO') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${level.toLowerCase()}`;
  
  const timestamp = document.createElement('span');
  timestamp.className = 'log-timestamp';
  timestamp.textContent = `[${formatTime()}]`;
  
  const messageSpan = document.createElement('span');
  messageSpan.className = 'log-message';
  messageSpan.textContent = message;
  
  logEntry.appendChild(timestamp);
  logEntry.appendChild(messageSpan);
  elements.logContainer.appendChild(logEntry);
  
  // Auto-scroll to bottom
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

function clearLog() {
  elements.logContainer.innerHTML = '';
  addLog('Log cleared.');
}

function updateStatus(text, details = '') {
  elements.statusText.textContent = text;
  elements.statusDetails.textContent = details;
}

function setProcessing(isProcessing) {
  state.isProcessing = isProcessing;
  
  if (isProcessing) {
    document.body.classList.add('processing');
    updateStatus('Processing...', 'Please wait');
  } else {
    document.body.classList.remove('processing');
    updateStatus('Idle');
  }
  
  updateButtons();
}

function updateButtons() {
  // Decompile button
  const canDecompile = state.decompile.input && state.decompile.output && !state.isProcessing;
  elements.decompileRunBtn.disabled = !canDecompile;
  
  // Compile button
  const canCompile = state.compile.input && state.compile.output && !state.isProcessing;
  elements.compileRunBtn.disabled = !canCompile;
}

// Tab Switching
elements.tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    
    // Update active states
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));
    
    button.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    state.currentTab = tabName;
    addLog(`Switched to ${tabName} mode`);
  });
});

// Decompile Handlers
elements.decompileInputBtn.addEventListener('click', async () => {
  const filePath = await ipcRenderer.invoke('select-file', {
    filters: [
      { name: 'IDO Files', extensions: ['ido'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (filePath) {
    state.decompile.input = filePath;
    elements.decompileInput.value = filePath;
    addLog(`Selected input file: ${path.basename(filePath)}`);
    
    // Auto-suggest output path
    if (!state.decompile.output) {
      const parsedPath = path.parse(filePath);
      const suggestedOutput = path.join(parsedPath.dir, `${parsedPath.name}.xml`);
      state.decompile.output = suggestedOutput;
      elements.decompileOutput.value = suggestedOutput;
    }
    
    updateButtons();
  }
});

elements.decompileOutputBtn.addEventListener('click', async () => {
  const defaultName = state.decompile.input 
    ? path.basename(state.decompile.input, '.ido') + '.xml'
    : 'output.xml';
    
  const filePath = await ipcRenderer.invoke('save-file', {
    defaultPath: defaultName,
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (filePath) {
    state.decompile.output = filePath;
    elements.decompileOutput.value = filePath;
    addLog(`Set output location: ${path.basename(filePath)}`);
    updateButtons();
  }
});

elements.decompileRunBtn.addEventListener('click', async () => {
  if (state.isProcessing) return;
  
  setProcessing(true);
  addLog('========================================');
  addLog('Starting decompilation process...', 'INFO');
  addLog(`Input: ${state.decompile.input}`);
  addLog(`Output: ${state.decompile.output}`);
  addLog('========================================');
  
  try {
    const result = await ipcRenderer.invoke(
      'run-python-tool',
      'decompile',
      state.decompile.input,
      state.decompile.output
    );
    
    if (result.success) {
      addLog('========================================');
      addLog('✓ Decompilation completed successfully!', 'SUCCESS');
      addLog(`Output saved to: ${result.output}`, 'SUCCESS');
      if (result.meta) {
        addLog(`Metadata saved to: ${result.meta}`, 'SUCCESS');
      }
      addLog('========================================');
      updateStatus('Complete', `Decompiled: ${path.basename(result.output)}`);
    } else {
      addLog('========================================');
      addLog(`✗ Decompilation failed: ${result.error}`, 'ERROR');
      addLog('========================================');
      updateStatus('Failed', result.error);
    }
  } catch (error) {
    addLog('========================================');
    addLog(`✗ Critical error: ${error.message}`, 'ERROR');
    addLog('========================================');
    updateStatus('Error', error.message);
  } finally {
    setProcessing(false);
  }
});

// Compile Handlers
elements.compileInputFileBtn.addEventListener('click', async () => {
  const filePath = await ipcRenderer.invoke('select-file', {
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'Image Files', extensions: ['dds', 'tga', 'bmp', 'png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (filePath) {
    state.compile.input = filePath;
    elements.compileInput.value = filePath;
    addLog(`Selected input file: ${path.basename(filePath)}`);
    
    // Auto-suggest output path
    if (!state.compile.output) {
      const parsedPath = path.parse(filePath);
      const suggestedOutput = path.join(parsedPath.dir, `${parsedPath.name}.ido`);
      state.compile.output = suggestedOutput;
      elements.compileOutput.value = suggestedOutput;
    }
    
    updateButtons();
  }
});

elements.compileInputFolderBtn.addEventListener('click', async () => {
  const folderPath = await ipcRenderer.invoke('select-folder');
  
  if (folderPath) {
    state.compile.input = folderPath;
    elements.compileInput.value = folderPath;
    addLog(`Selected input folder: ${path.basename(folderPath)}`);
    
    // Auto-suggest output path
    if (!state.compile.output) {
      const suggestedOutput = path.join(folderPath, 'output.ido');
      state.compile.output = suggestedOutput;
      elements.compileOutput.value = suggestedOutput;
    }
    
    updateButtons();
  }
});

elements.compileOutputBtn.addEventListener('click', async () => {
  const defaultName = state.compile.input 
    ? path.basename(state.compile.input, path.extname(state.compile.input)) + '.ido'
    : 'output.ido';
    
  const filePath = await ipcRenderer.invoke('save-file', {
    defaultPath: defaultName,
    filters: [
      { name: 'IDO Files', extensions: ['ido'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (filePath) {
    state.compile.output = filePath;
    elements.compileOutput.value = filePath;
    addLog(`Set output location: ${path.basename(filePath)}`);
    updateButtons();
  }
});

elements.compileRunBtn.addEventListener('click', async () => {
  if (state.isProcessing) return;
  
  setProcessing(true);
  addLog('========================================');
  addLog('Starting compilation process...', 'INFO');
  addLog(`Input: ${state.compile.input}`);
  addLog(`Output: ${state.compile.output}`);
  addLog('========================================');
  
  try {
    const result = await ipcRenderer.invoke(
      'run-python-tool',
      'compile',
      state.compile.input,
      state.compile.output
    );
    
    if (result.success) {
      addLog('========================================');
      addLog('✓ Compilation completed successfully!', 'SUCCESS');
      addLog(`Output saved to: ${result.output}`, 'SUCCESS');
      addLog(`Total size: ${result.size} bytes`, 'SUCCESS');
      addLog('========================================');
      updateStatus('Complete', `Compiled: ${path.basename(result.output)}`);
    } else {
      addLog('========================================');
      addLog(`✗ Compilation failed: ${result.error}`, 'ERROR');
      addLog('========================================');
      updateStatus('Failed', result.error);
    }
  } catch (error) {
    addLog('========================================');
    addLog(`✗ Critical error: ${error.message}`, 'ERROR');
    addLog('========================================');
    updateStatus('Error', error.message);
  } finally {
    setProcessing(false);
  }
});

// Clear Log Handler
elements.clearLogBtn.addEventListener('click', clearLog);

// Python Log Listener
ipcRenderer.on('python-log', (event, logEntry) => {
  addLog(logEntry.message, logEntry.level);
});

// Initialize
addLog('IDO Compiler & Decompiler initialized');
addLog('Select files and click the run button to begin');
updateStatus('Idle');
updateButtons();
