
var tools = require('../main/tools')

window.addEventListener('DOMContentLoaded', () => {
    //dynamically replace contents of the dropdown box containing the function list
    for (const toolName in tools.allTools) {
      //Create and append select list
      if (toolName != "help") {
        var selectList = document.getElementById("functions")
        //Create and append the options
        var option = document.createElement("option");
        option.value = toolName;
        option.text = toolName;
        selectList.appendChild(option);
        //log each function name
        console.log(`added function ${toolName} to select options`)
      }
      else {
        //load hidden field value with help json
        document.getElementById("helpJSON").value = JSON.stringify(tools.allTools["help"])
      }
    }
  })

  const {
    contextBridge,
    ipcRenderer
} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = ["toMain", "selectDirectory", "showWarning", "getProgramDump", "saveLogs", "getMidiPorts",
              "saveSound", "loadSound", "readParameter", "writeParameter"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
                console.log(`in method send; sending ${data} to channel ${channel}`);
            }
            else {
              console.log(`unknown channel: ${channel}`);
            }
        },
        receive: (channel, data) => {
            let validChannels = ["fromMain", "selectDirectory", "midiPorts", "parameterValue", "programDump"];
            if (validChannels.includes(channel)) {
              if (data != undefined){
                console.log(`in method receive; got data from channel ${channel}`);
              }
              else {
                console.log(`in method receive; data from channel ${channel} is undefined`);
              }
              ipcRenderer.on(channel, data);
            }
        }
    }
);