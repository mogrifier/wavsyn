
var tools = require('../main/tools')

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }

    //dynamically replace contents of the dropdown box containing the function list
    for (const toolName in tools.allTools) {
      //log each function - this prints the name and the function source code!
      console.log(`tool ${toolName} = ${tools.allTools[toolName]}`)
      //Create and append select list
      var selectList = document.getElementById("functions")
      //Create and append the options
      var option = document.createElement("option");
      option.value = toolName;
      option.text = toolName;
      selectList.appendChild(option);
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
            let validChannels = ["toMain", "selectDirectory"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
                console.log(`in method send; sending ${data} to channel ${channel}`);
            }
        },
        receive: (channel, data) => {
            let validChannels = ["fromMain"];
            if (validChannels.includes(channel)) {
              console.log(`in method receive; got ${data} from channel ${channel}`);
              // Deliberately strip event as it includes `sender` 
              ipcRenderer.on(channel, data);
            }
        }
    }
);