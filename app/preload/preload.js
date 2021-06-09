window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text

    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
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
            let validChannels = ["toMain"];
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