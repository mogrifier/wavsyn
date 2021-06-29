const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const shell = require('electron').shell
const isMac = process.platform === 'darwin'
const midi = require('midi')
const logger = require('electron-log');
const userLog = logger.scope('user');

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

//for the Mac OS About menu
app.setAboutPanelOptions({
  applicationName: "Wavsyn",
  applicationVersion: "Version",
  version: app.getVersion(),
  credits: "Developed by Erich izdepski",
  copyright: "Copyright 2021"
});

//for the help menu item 'about'
function aboutWavsyn() {
  var aboutMessage = `Wavsyn, Version (${app.getVersion()}) Developed by Erich izdepski, Copyright 2021
    Chrome Version ${process.versions['chrome']} 
    Node Version ${process.versions['node']}
    Electron Version ${process.versions['electron']}`

  let options = {
    title : "Wavsyn Environment Details",
    message : aboutMessage
    }
  dialog.showMessageBoxSync(mainWindow, options)
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
    title : "I'm sorry, Dave, I'm afraid I can't do that.",
    message : args
    }
  dialog.showMessageBoxSync(mainWindow, options)
}

ipcMain.on("showWarning", (event, args) => {
  showWarning(args)
})

ipcMain.on("saveLogs", (event, args) => {
  //the args variable contains the latest text area output. save to a file. it appends.
  userLog.info(args)
});

ipcMain.on("getProgramDump", (event, args) => {

  // Set up a new output.
  const output = new midi.Output();
  const input = new midi.Input();

  // Configure a callback.
input.on('message', (deltaTime, message) => {
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  console.log(`m: ${message} d: ${deltaTime}`);

  input.closePort()
});

//HACK 2 is code for Mirage on system Open the first available input port.
input.openPort(1);
//turn on listening for sysex messages (ignores timing and active sensing)
input.ignoreTypes(false, true, true);

var ports = input.getPortCount();
for (var i =0; i < ports; i++) {
  console.log(`input ports ${input.getPortName(i)}`)
}

  // Count the available output ports.
   ports = output.getPortCount();
  for (i =0; i < ports; i++) {
    console.log(`output ports ${output.getPortName(i)}`)


    
    /**
     * Microsoft GS Wavetable Synth 0
      Express  128: Port 1 1
      Express  128: Port 2 2
      Express  128: Port 3 3
      Express  128: Port 4 4
      Express  128: Port 5 5
      Express  128: Port 6 6
      Express  128: Port 7 7
      Express  128: Port 8 8
      UFX1604 MIDI 1 9
     */
}


//FIXME hardcode Open the Mirage port.
output.openPort(2);

//get a wavesample dump: F0 0F 01 04 F7   65544 bytes. why?  655536 is the data- must be sysex headers
//get a program dump: F0 0F 01 13 F7
//get a config dump: F0 0F 01 00 F7
/**
 * F0 0F 01 02
 * 00 00 02 03 02 00 0E 01 00 04 00 00 02 02 00 0A 00 00 00 03 00 00 01 00 00 00 00 00
 * 01 00 00 00 00 00 0F 0F 0F 0E 00 00 00 00 01 00 00 00 0F 0F 01 00 00 00 00 00 00 02 00 00 F7 
 * 
 * made changes and saved the config to a disk
 * F0 0F 01 02 
 * 00 00 02 03 0C 00 02 01 00 04 00 00 07 03 0E 00 00 00 00 03 00 00 01 00 00 00 00 00 
 * 01 00 00 00 00 00 0F 0F 0F 0E 00 00 00 00 01 00 00 00 0F 0F 01 00 00 00 00 00 00 02 00 00 F7 
 */

//load a sound: F0 0F 01 01 10 02 0a 7f F7
/** read a parameter: f0 0f 01 01 0c 03 07 0d 7f f7   - crazy. 0c means parameter number follows. Comes as two bytes. 03 07 = 37
0d means return the value of the parameter.
returned F0 0F 01 0D 00 25 00 0A F7 . 00 25 - this is hex for 37. So decimal one way, hex the other. Value is 00 0A.
Mirage reads 40 (max resonance. Internal value max is 160, by the way.)
These are nibbles sent in LS MS order. Reverse them to create a byte. value is 160, which corresponds to a 40 on mirage display.

I sent param 40 to 1.6. Read it. Got: F0 0F 01 0D 00 28 00 01 F7.. 00 28 is forty. (I guess the 00 is a spare since not needed).
value was 00 01. revers. 01 00. = 16.

setting a value.
f0 0f 01 01 0c 04 00 0d 0F 7f f7   to set param 40 to value 15 (note I am back to using hex. These commands only have 5 bytes.)
returned: F0 0F 01 0D 00 28 0F 00 F7   0F 00 reverse is 15!!


*/


//show value on mirage display: f0 0f 01 01 0c 03 07 0d 7f f7  (shows value of 37.)

//change a parameter: F0 0F 01 01 0c 25 0d 09 7f F7
//set up arrow: F0 0F 01 01 0e 7f F7  and got this: F0 0F 01 0D 03 25 04 00 F7

//I pressed up arrao to change value of param 37 and giot this back: F0 0F 01 0D 02 25 0C 00 F7 
// od 02 means value was 2. 25 0c looks like 37 (hex 25 is 37) and 0c is parameter number. 

//240, 15, 1, 19, 247   F0 0F 01 13 F7 
//tells mirage to switch to param 37 :  f0 0f 01 01 0c 03 07 7f f7
//return value from a param: f0 0f 01 01 0c 03 07 0d 7f f7
var getDump = [240, 15, 1, 1, 12, 3, 7, 13, 127 , 247]
  if (args) {
    //get lower dump
    output.sendMessage(getDump)


    output.closePort();
  }
  else {
    //get upper dump

  }

  // Close the port when done.
  output.closePort();

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
        label: 'Wavsyn on Github',
        click() {
          shell.openExternal('https://github.com/mogrifier/wavsyn')
        }
      },
      {
        label: 'Manual',
        click() {
          shell.openExternal('https://github.com/mogrifier/wavsyn/wiki')
        }
      },
      {
        label: "Erich's Blog",
        click() {
          shell.openExternal('https://erichizdepski.wordpress.com')
        }
      },
      {
        label: 'About',
        click() {
          aboutWavsyn()
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)