var currentSource
var currentDestination

//call back end functions using IPC and an API to avoid exposing all of Node
function execute() {
    //read value of drop down box
    //must also send source and destination
    var command = {tool: document.getElementById("functions").value, 
        source : currentSource, 
        destination : currentDestination};

    console.log(`telling main process to run ${command.tool} on ${command.source} and ${command.destination}`);
    //sends data to the main process using asynchronous method in preload.js
    window.api.send('toMain', command)
}

//receives callback from the main process
window.api.receive('fromMain', (event, arg) => {
    //write response to the logs textarea
    document.getElementById("logs").value += arg
})

function selectDestination() {
    //Synchronous
    window.api.send('selectDirectory', 'destination')
}


function selectSource() {
    //Synchronous
    window.api.send('selectDirectory','source')
}

//name is the selected function name. will be a help JSON key
function showHelp() {
    var name = document.getElementById("functions").value;
    console.log(name)
    var currentHelp = JSON.parse(document.getElementById('helpJSON').value)
    document.getElementById('functionHelp').innerHTML = currentHelp[name]
    console.log(currentHelp[name])
}

window.api.receive('selectDirectory', (event, arg) => {
    if (arg.length == 2) {
        //arg is the directory selected and source or destination. get its path info
        if (arg[0] == "source") {
            console.log(`got source directory ${arg[1]}`)
            currentSource = arg[1]
            document.getElementById("currentSource").value = currentSource 
        }
        else {
            console.log(`got destination directory ${arg[1]}`)
            currentDestination = arg[1]
            document.getElementById("currentDestination").value = currentDestination 
        }
        //write response to the logs textarea
        for (var i = 0; i < arg.length; i++) { 
            console.log(arg[i])
            document.getElementById("logs").value += (arg[i] + '\r\n')
        }
    }
    else{
        //must be cancelled or error message
        console.log(arg)
        document.getElementById("logs").value += arg
    }
})