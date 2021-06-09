const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const shell = require('electron').shell
const isMac = process.platform === 'darwin'

let mainWindow;

const loadMainWindow = () => {
    mainWindow = new BrowserWindow({
        width : 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false, // is default value after Electron v5
          contextIsolation: true, // protect against prototype pollution
          enableRemoteModule: false, // turn off remote
          preload: path.join(__dirname, 'app/preload/preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

//on ready event call loadMainWindow
app.whenReady().then(() => {
    loadMainWindow()
  })

// clean up properly after shutdown after event
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  //start app if not already running (single instance)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

//set up for communications with renderer process
ipcMain.on("toMain", (event, args) => {
    //just prove function name was received and echo it back from tools.js
    var tool = args;
    //javascript string interpolation (inserting a variable name) requies using backticks -` - vice quotes.
    console.log(`main process running ${tool}`)
    // Send result back to renderer process
    mainWindow.webContents.send("fromMain", `you called the function ${tool}`);
  });


//set up custom menus

const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      { label: 'test menu', 
      click() { 
        shell.openExternal('http://coinmarketcap.com')
    } 
     },
      (isMac ? { role: 'close' } : { role: 'quit' }),
    ]
  },
  // { role: 'editMenu' }
  /** 
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  */
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://electronjs.org')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)