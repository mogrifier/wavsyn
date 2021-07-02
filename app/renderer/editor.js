//has listeners for the program editor UI.
//maintains overall state for all programs (12 - 4 per sound)
//would like to use same listeners but with some extra parameters to identify
//which sound/program was being edited.

//user sets these. all midi functions must use them. 
var midiIn
var midiOut

//program and sound used to set mirage up, once these are set, not used until they change. 
//change should change mirage setting, so send sysex onChange()
//range 0 -5 ; translate to lower/upper value
var program
//range 0 -3
var sound

var dirty = false

//generic method to update the value for a field/control given by the label
function update(label) {
    let newValue = parseInt(document.getElementById(label).value, 10)
    //display as 2 digit hex
    console.log(newValue)
    let hexStr = newValue.toString(16)
    if (hexStr.length < 2) {
        hexStr = "0" + hexStr
    }
    document.getElementById(label + "_display").value = hexStr

    //update dirty flag- could make a 100% compare old vs new, but this is simple.
    var flag = document.getElementById("dirty")
    flag.style.color = "red";
    flag.value = "Editor has changes!!"
    dirty = true
}

function setSound() {

    //pop a warning if changing a dirty sound without saving firat
    if (dirty) {
        //warn

    }


    sound = parseInt(document.getElementById("sound").value)
    //send sysex to have mirage load new sound

    //reset dirty flag warning
    var flag = document.getElementById("dirty")
    flag.style.color = "green";
    flag.value = "No changes yet"
    dirty = false
}


function setProgram() {
    program = parseInt(document.getElementById("program").value)
    //send sysex to load new program

    //reset dirty flag warning
    var flag = document.getElementById("dirty")
    flag.style.color = "green";
    flag.value = "No changes yet"
    dirty = false
}


function getProgramDump(lower) {
    //send sysex command to the Mirage to get a program dump (upper or lower)
    //if lower = true, get a lower program dump of 3 programs
    //create one argument object to send
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["isLower"] = lower
    window.api.send('getProgramDump', data)
}


function configureMidi() {
    //load the midi ports into the UI
    window.api.send('getMidiPorts')
}

/**
 * Update midi in and out variables when user selects new value
 */
function selectMidi(direction) {

    if (direction == "in") {
        midiIn = document.getElementById("midi_in").value
    }
    else{
        //= out
        midiOut = document.getElementById("midi_out").value
    }

}



/** receives callback from the main process. arg is midiPorts with two values
 * ["inputs"] and ["outputs"]. Each contains an array of json name/value pairs in
 * format port name: value (index # of port, zero-based)
 * 
 * */
window.api.receive('midiPorts', (event, arg) => {
    //parse the object containing the midi ports and display in the UI. 
    //never save- always keep fresh in case of system changes

    //read the inputs
    for (var i = 0; i < arg["inputs"].length; i++) {
        //load the dropdown lists
        var inputList = document.getElementById("midi_in")
        //Create and append the options
        var option = document.createElement("option");
        for (var k in arg["inputs"][i]) {
            option.value = arg["inputs"][i][k]
            option.text = k
        }
        inputList.appendChild(option);
    }

    //now read the outputs and load
    for (i = 0; i < arg["outputs"].length; i++) {
        //load the dropdown lists
        var outputList = document.getElementById("midi_out")
        //Create and append the options
        option = document.createElement("option");
        for (k in arg["outputs"][i]) {
            option.value = arg["outputs"][i][k]
            option.text = k
        }
        outputList.appendChild(option);
    }
})
