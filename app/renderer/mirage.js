var currentSource
var currentDestination

//call back end functions using IPC and an API to avoid exposing all of Node
function execute() {
    //verify source and destination are set.
    if (currentSource == null || currentDestination == null)
    {
        //pop modal warning
        window.api.send('showWarning', "Source and Destination directories must be set.")
        return
    }

    //read value of drop down box
    //must also send source and destination
    var command = {tool: document.getElementById("functions").value, 
        source : currentSource, 
        destination : currentDestination};

    console.log(`telling main process to run ${command.tool} on source ${command.source} 
    and destination ${command.destination}`);
    //sends data to the main process using asynchronous method in preload.js
    window.api.send('toMain', command)
}

//receives callback from the main process
window.api.receive('fromMain', (event, arg) => {
    //write response to the logs textarea
    //document.getElementById("logs").value += arg
    showUserLogs(arg)
    //save the logs 
    saveLogs(arg)
})

function selectDestination() {
    //Synchronous
    window.api.send('selectDirectory', 'destination')
}


function selectSource() {
    //Synchronous
    window.api.send('selectDirectory','source')
}

function saveLogs() {
    //Synchronous
    //read text area 
    let logs = document.getElementById("logs").value
    window.api.send('saveLogs', logs)
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
        //write selected directory and source or destination to the logs textarea
        showUserLogs(arg)
    }
    else{
        //must be cancelled or error message
        console.log(arg)
        document.getElementById("logs").value += arg
    }
})


function showUserLogs(theLogs) {
    for (var i = 0; i < theLogs.length; i++) { 
        console.log(theLogs[i])
        document.getElementById("logs").value += ('\r\n' + theLogs[i])
    }
}