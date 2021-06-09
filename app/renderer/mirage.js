
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
    document.getElementById("logs").value = arg;
})