const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const shell = require('electron').shell
const isMac = process.platform === 'darwin'


var tools = require('./app/main/tools')

let mainWindow;

const loadMainWindow = () => {
    mainWindow = new BrowserWindow({
        width : 1200,
        height: 900,
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
    loadMainWindow();
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
    var toolName = args.tool;
    var source = args.source
    var destination = args.destination
    // run tool given by name and send result back to renderer process
    mainWindow.webContents.send("fromMain", tools.allTools[toolName](source, destination));
});

function showWarning(args) {
  let options = {
    title : "I'm sorry, Dave, I'm afraid I can't do that",
    message : args
    }
  dialog.showMessageBoxSync(mainWindow, options)
}

ipcMain.on("showWarning", (event, args) => {
  showWarning(args)
})

ipcMain.on("selectDirectory", (event, args) => {
  console.log("in select directory in main process")

    let options = {
      title : "Open location for processing", 
      //just show all files so user is not confued by empty directory
      filters : [{name : 'All Files', extensions: ['*']}],
      buttonLabel : "Choose Location",
      properties: ['openDirectory']
      }
    dialog.showOpenDialog(mainWindow, options).then(result => {

      if (result.canceled) {
        //cancelled so no directory selected
        let msg = "directory selection cancelled"
        console.log(msg)
        mainWindow.webContents.send("selectDirectory", msg);
      }
      else {
        let msg = new Array(2)
        if (args =="source")
        {
          msg[0] = "source"
        }
        else {
          msg[0] = "destination"
        }
        
        msg[1] = result.filePaths[0]
        console.log(`selected ${msg}`)
        mainWindow.webContents.send("selectDirectory", msg);
      }
      }).catch(err => {
        console.log(err)
        mainWindow.webContents.send("selectDirectory", err);
      })
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
      { label: 'Wavsyn', 
      click() { 
        //load main view (which is also default)
        mainWindow.loadFile(path.join(__dirname, "index.html"));
    } 
     },
     { label: 'Editor', 
      click() { 
        //load editor html file
        mainWindow.loadFile(path.join(__dirname, "/app/pages/editor.html"));

    }},
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
    label: 'Software',
    submenu: [
      { label: 'Omniflop', 
      click() { 
        shell.openExternal('http://www.shlock.co.uk/Utils/OmniFlop/OmniFlop.htm')
    } 
     },
     { label: 'HxC Floppy Emulator', 
      click() { 
        shell.openExternal('https://hxc2001.com/download/floppy_drive_emulator/')
    } 
     }
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