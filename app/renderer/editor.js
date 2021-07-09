//has listeners for the program editor UI.
//maintains overall state for all programs (12 - 4 per sound)
//would like to use same listeners but with some extra parameters to identify
//which sound/program was being edited.

//user sets these. all midi functions must use them. 
var midiIn
var midiOut
var isMidiConfigured = false

//program and sound used to set mirage up, once these are set, not used until they change. 
//change should change mirage setting, so send sysex onChange()
//range 1-6 modulo 3
var sound = 1
//range 1 -4
var program = 1
//boolean
var isLower = true
//track editor changes
var dirty = false
//program data for current sound



//metadata about the range of values in the UI vewrsus internal memory of mirage/ do i need this?



//generic method to update the value for a field/control given by the label.
//called by UI. 
function update(label) {

    //check if midi is configured or not
    if (!isMidiConfigured) {
        //reset UI
        document.getElementById(label).value = 0
        //pop warning
        window.api.send('showWarning', "Please press 'Configure MIDI' and choose IN and OUT ports first.")
        return
    }


    let newValue = parseInt(document.getElementById(label).value, 10)
    //display as 2 digit hex
    console.log(newValue)
    let hexStr = newValue.toString(16)
    if (hexStr.length < 2) {
        hexStr = "0" + hexStr
    }
    document.getElementById(label + "_display").value = hexStr

    //update dirty flag- could make a 100% compare old vs new, but this is simple.
    setDirtyFlag(true)

    //compute thye delta (new - old value) by looking at what is in the program object

    //send new value to Mirage. Not trivial- must lookup how to scale the value since the internal value
    //does NOT match UI display (rather, it does NOW, but should not in future)
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["parameter"] = "36" //parameter //lookup parameter id (two character string) for the lable
    data["delta"] =  3 //will need a decimal value from the hex string
    window.api.send('writeParameter', data)
}

function setUISound() {

    //pop a warning if changing a dirty sound without saving firat
    if (dirty) {
        //warn

    }


    let uiSound = parseInt(document.getElementById("sound").value)
    setSound(uiSound)
    //send sysex to have mirage load new sound

    //reset dirty flag warning
    setDirtyFlag(false)
}


function setProgram() {
    program = parseInt(document.getElementById("program").value)
    //send sysex to load new program

    //set to dirty
    setDirtyFlag(false)
}


function setDirtyFlag(isDirty) {
    var flag = document.getElementById("dirty")
    //reset dirty flag warning
    if (isDirty){
        flag.style.color = "red";
        flag.value = "Editor has changes!!"
        dirty = true
    }
    else{
        flag.style.color = "green";
        flag.value = "No changes yet"
        dirty = false
    }
}


function setSound(uiSound) {
    //use uiSound to set the sound number and flag for upper or lower
    //ensures sound is always 1-3
    if (uiSound < 4) {
        isLower = true
        sound = uiSound
    }
    else {
        isLower = false
        sound = uiSound % 3
    }
}


function getProgramDump() {
    //send sysex command to the Mirage to get a program dump (upper or lower)
    //if lower = true, get a lower program dump of 3 programs
    //create one argument object to send
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["isLower"] = isLower
    data["sound"] = sound
    window.api.send('getProgramDump', data)
}


function configureMidi() {
    //load the midi ports into the UI
    window.api.send('getMidiPorts')
    isMidiConfigured = true
    //enable UI to use save button and selectors
    document.getElementById("saveSound").removeAttribute('disabled')
    document.getElementById("sound").removeAttribute('disabled')
    document.getElementById("program").removeAttribute('disabled')
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


/**
 * This tells the Mirage to save the current sound/programs to disk. It DOES NOT send the program data
 * since that is already in the Mirage since the UI is in sync with the Mirage. It could allow you to 
 * copy data to different sounds or upper/lower halves.
 */
function saveSound() {
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["isLower"] = isLower
    data["sound"] = sound
    let bank = isLower ? "lower" : "upper"
    console.log(`Saving current Mirage sound/programs to  ${bank} bank sound ${sound}`)
    window.api.send('saveSound', data)
}


function getProgramData() {
    //
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


//get midi parameter response from mirage
window.api.receive('parameterValue', (event, arg) => {

    //update state of internal object that is copy of mirage program?? I think best to do update after getting the data back
    console.log(`sysex from mirage: ${arg}`)

})
