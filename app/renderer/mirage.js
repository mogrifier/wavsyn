//const {dialog} = require('electron')

//call back end functions using IPC and an API to avoid exposing all of Node
function execute() {
    //read value of drop down box
    var tool = document.getElementById("functions").value;
    console.log(`telling main process to run ${tool}`);
    //sends data to the main process using asynchronous method in preload.js
    window.api.send('toMain', tool)
}

//receives callback from the main process
window.api.receive('fromMain', (event, arg) => {
    //write response to the logs textarea
    console.log(arg)
    document.getElementById("logs").value = arg;
})

function selectSource() {
    //Synchronous
    window.api.send('selectDirectory', "")
}

window.api.receive('selectDirectory', (event, arg) => {
    //arg is the directory selected. get its path info
    console.log(`got a directory ${arg}`)
})
