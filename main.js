const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const shell = require('electron').shell
const isMac = process.platform === 'darwin'
const midi = require('midi')
const logger = require('electron-log');
const userLog = logger.scope('user');


//make midi in and out global
var midiOutput
var midiInput

var tools = require('./app/main/tools')
var midiTools = require('./app/main/midi')

var mainWindow;

const loadMainWindow = () => {
    mainWindow = new BrowserWindow({
        width : 1240,
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

//proxy to midi.js
ipcMain.on("getMidiPorts", (event, args) => {
  //read all input and output ports and send to render process
  mainWindow.webContents.send("midiPorts", midiTools.getMidiPorts())
});




ipcMain.on("getProgramDump", (event, args) => {

    // Set up a new output.
    midiOutput = new midi.Output();
    midiInput = new midi.Input();

    // Configure a callback.
    midiInput.on('message', (deltaTime, message) => {
     if (message.length == 1255) {
       // The message is an array of numbers corresponding to the bytes in the dump (i hope!)
      mainWindow.webContents.send("programDump", Buffer.from(message));
      console.log(`program dump: ${message} d: ${deltaTime}`);
     }
     else {
       //error
       console.log(`data does not contain a program dump fo 1255 bytes; has ${message.length} bytes`);
     }

      midiInput.closePort()
  });

  midiInput.openPort(parseInt(args["midiIn"]));
  //turn on listening for sysex messages (ignores timing and active sensing)
  midiInput.ignoreTypes(false, true, true);
  midiOutput.openPort(parseInt(args["midiOut"]));

  if (args["isLower"]) {
    //get lower dump
    midiOutput.sendMessage([240, 15, 1, 3, 247])
  }
  else {
    //get upper dump
    midiOutput.sendMessage([240, 15, 1, 19, 247])
  }

  // Close the port when done.
  midiOutput.closePort();
})


/**
 * Execute mirage command to save to floppy
 */
ipcMain.on("saveSound", (event, args) => {
/**data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["isLower"] = isLower
    data["sound"] = sound  */
    let isLower = args["isLower"]
    let sound = args["sound"]
    var sysex = []
    //11 is lower, 12 is upper, then sound , then enter (10)
    if (isLower) {
      //save to lower #sound (1, 2, 3)
      sysex = [1, 1, sound, 10]
    }
    else {
      //save to upper #sound
      sysex = [1, 2, sound, 10]
    }
    sendSysex(args["midiIn"], args["midiOut"], sysex)
})


/**
 * Execute mirage command to load from floppy soudn 1, 2, 3. This also automatically sends
 * back a program dump and an extra 12 bytes of systex (why I don't know).
 */
 ipcMain.on("loadSound", (event, args) => {
    let midiIn = args["midiIn"]
    let midiOut = args["midiOut"]
    let isLower = args["isLower"]
    let sound = args["sound"]
    midiOutput = new midi.Output();
    midiInput = new midi.Input();
    midiInput.openPort(parseInt(midiIn));
    //turn on listening for sysex messages (ignores timing and active sensing)
    midiInput.ignoreTypes(false, true, true);
    midiOutput.openPort(parseInt(midiOut));
    // Configure a callback.
    midiInput.on('message', (deltaTime, message) => {
      if (message.length == 1255) {
        console.log(`program dump: ${message} d: ${deltaTime}`);
        // The message is an array of numbers corresponding to the bytes in the dump (i hope!)
        mainWindow.webContents.send("programDump", Buffer.from(message));
      }
      else {
        //other midi recevied. hmm.
        console.log(`data recevied: ${message}`);
      }
    });

    var sysex = []
    //17 is lower, 16 is upper. The 10 is for enter.
    if (isLower) {
      sysex = [17, sound, 10]
    }
    else {
      sysex = [16, sound, 10]
    }

    var prefix = [240, 15, 1, 1]
    var suffix = [127, 247]
    var fullSysex = [...prefix, ...sysex, ...suffix]
    console.log(`sending sysex command ${fullSysex}`)
    midiOutput.sendMessage(fullSysex)
    midiOutput.closePort()
})


ipcMain.on("readParameter", (event, args) => {
  /** data["midiIn"] = midiIn
      data["midiOut"] = midiOut
      data["isLower"] = isLower
      data["sound"] = sound 
      data["programs"] = program 
      data["parameter"] = parameter
      
      send syex to Mirage to read a parameter*/

      //need parameters as two digits- decimal integers
    let d1 = parseInt(args["parameter"].charAt[0])
    let d2 = parseInt(args["parameter"].charAt[1])
    //the command means (12) for parameter d1d2 (13) read the value (since none is given)
    sendSysex(args["midiIn"], args["midiOut"], [12, d1, d2, 13] )
  })
  

/**
 * There is no single write command. You send the number of up or down arrow commands to execute.
 */

  ipcMain.on("writeParameter", (event, args) => {
      /**data["midiIn"] = midiIn
          data["midiOut"] = midiOut
          //treat parameter as two character string. parse out the integers. simplest.
        data["parameter"] = parameter
        data["delta"] = up or down arrows to send via sysex

      down arrow: F0 0F 01 01 0f 7f F7 
      up arrow: F0 0F 01 01 0e 7f F7 

        */
      let parameter = args["parameter"]
      let midiIn = args["midiIn"]
      let midiOut = args["midiOut"]
      let d1 = parseInt(parameter.charAt(0))
      let d2 = parseInt(parameter.charAt(1))
      let delta = parseInt(args["delta"])
      let selectSysex = [12, d1, d2, 13]
      
      midiOutput = new midi.Output();
      midiInput = new midi.Input();
      midiInput.openPort(parseInt(midiIn));
      //turn on listening for sysex messages (ignores timing and active sensing)
      midiInput.ignoreTypes(false, true, true);
      midiOutput.openPort(parseInt(midiOut));

      // Configure a callback.
      midiInput.on('message', (deltaTime, message) => {
        // The message is an array of numbers corresponding to the MIDI bytes:
        //   [status, data1, data2]
        // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
        // information interpreting the messages.
        console.log(`m: ${message} d: ${deltaTime}`);
      });

      //make command to select parameter to change f0 0f 01 01 0c 03 07  7f f7
      var prefix = [240, 15, 1, 1]
      var suffix = [127, 247]
      var fullSysex = [...prefix, ...selectSysex, ...suffix]
      //select the parameter to change
      midiOutput.sendMessage(fullSysex)
      //now send the right number of up and down arrows.
      if (delta > 0) {
        //uparrow
        fullSysex = [...prefix, [14], ...suffix]
      }
      else {
        //down arrow
        fullSysex = [...prefix, [15], ...suffix]
      }

      //now send it. we only send a single up or down arrow at a time
      midiOutput.sendMessage(fullSysex)
      console.log(`sent ${fullSysex}`)
      //close output and input
      midiOutput.closePort()
      //closing here since multiple messages were sent and there may be several callbacks
      midiInput.closePort()
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


//would like it midi.js but concerned callbacks won't work 
function sendSysex(midiIn, midiOut, sysex) {
    midiOutput = new midi.Output();
    midiInput = new midi.Input();
    midiInput.openPort(parseInt(midiIn));
    //turn on listening for sysex messages (ignores timing and active sensing)
    midiInput.ignoreTypes(false, true, true);
    midiOutput.openPort(parseInt(midiOut));

    // Configure a callback.
    midiInput.on('message', (deltaTime, message) => {
      // The message is an array of numbers corresponding to the MIDI bytes:
      //   [status, data1, data2]
      // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
      // information interpreting the messages.
      console.log(`m: ${message} d: ${deltaTime}`);
  
      midiInput.closePort()
    });

    //send command  and return value from a param: f0 0f 01 01 0c 03 07 0d 7f f7
    var prefix = [240, 15, 1, 1]
    var suffix = [127, 247]
    var fullSysex = [...prefix, ...sysex, ...suffix]
    console.log(`sending sysex ${fullSysex}`)
    midiOutput.sendMessage(fullSysex)

    //close output
    midiOutput.closePort()
}




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

  */


  //show value on mirage display: f0 0f 01 01 0c 03 07 0d 7f f7  (shows value of 37.)

  //change a parameter: F0 0F 01 01 0c 25 0d 09 7f F7
  //set up arrow: F0 0F 01 01 0e 7f F7  and got this: F0 0F 01 0D 03 25 04 00 F7

  //I pressed up arrao to change value of param 37 and giot this back: F0 0F 01 0D 02 25 0C 00 F7 
  // od 02 means value was 2. 25 0c looks like 37 (hex 25 is 37) and 0c is parameter number. 

  //240, 15, 1, 19, 247   F0 0F 01 13 F7 
  //tells mirage to switch to param 37 :  f0 0f 01 01 0c 03 07 7f f7
  //return value from a param: f0 0f 01 01 0c 03 07 0d 7f f7