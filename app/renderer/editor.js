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
var currentSound = 1
//range 1 -4
var program = 1
//track editor changes
var isDirty = false
//default values
var loadSoundBank = 1
var saveSoundBank = 1


//program data for current sound. 4 pgroams. Note the program variable starts at 1. this holds
//an object with key (param name from UI) value pairs. Value is from Mirage. The UI code has to
//divide the parameter as needed for display in the UI. (separate responsibilities)
//This part of code stores the value Mirage has.
var allPrograms = new Array(4)
//parameters names using unique css selector ID's from the UI.
var parameterNames = ['monomode', 'lfo_freq', 'lfo_depth', 'osc_detune', 'osc_mix', 'mix_velo', 'cutoff', 'resonance',
    'tracking', 'spare', 'wavesample', 'mixmode', 
    'fea', 'fep', 'fed', 'fes', 'fer', 
    'feva', 'fevp', 'fevd', 'fevs', 'fevr', 
    'aea', 'aep', 'aed', 'aes', 'aer', 
    'aeva', 'aevp', 'aevd', 'aevs', 'aevr',
    'spare', 'spare', 'spare', 'spare']

//note that mix mode and mono mode in manual both say 28. One is wrong.
var parameterID = {'monomode':29, 'lfo_freq':31 , 'lfo_depth':32, 'osc_detune':33, 'osc_mix':34, 'mix_velo':35, 
    'cutoff':36, 'resonance':37,'tracking':38, 'wavesample':27, 'mixmode':28, 'fea':40, 'fep':41, 'fed':42,
    'fes':43, 'fer':44, 'feva':45, 'fevp':46, 'fevd':47, 'fevs':48, 'fevr':49, 
    'aea':50, 'aep':51, 'aed':52, 'aes':53, 'aer':54, 
    'aeva':55, 'aevp':56, 'aevd':57, 'aevs':58, 'aevr':59}
/** metadata on scaling values so UI on mirage and editor match, and the program value and mirage internal value match.
 * Here's how to use. Mirage UI value times scale = internal value in program data object and in mirage.
 * Program data value divided by scale = Mirge UI value. 
 * Scale value of 1 has no effect either way, but simplest to just make call and calculate for all parameters vice
 * using a big if/then statement.
 * Mode values are on/off. 
 */
var parameterScale = {'monomode':1, 'lfo_freq':1 , 'lfo_depth':1, 'osc_detune':1, 'osc_mix':4, 'mix_velo':4, 
    'cutoff':2, 'resonance':4,'tracking':1, 'wavesample':1, 'mixmode':1, 'fea':1, 'fep':1, 'fed':1,
    'fes':1, 'fer':1, 'feva':4, 'fevp':4, 'fevd':4, 'fevs':4, 'fevr':4, 
    'aea':1, 'aep':1, 'aed':1, 'aes':1, 'aer':1, 
    'aeva':4, 'aevp':4, 'aevd':4, 'aevs':4, 'aevr':4}



//generic method to update the value for a field/control given by the label.
//called by UI. 
function update(trigger) {

    var label = trigger.id
    //check if midi is configured or not
    if (!isMidiConfigured) {
        //reset UI
        document.getElementById(label).value = 0
        //pop warning
        window.api.send('showWarning', "Please press 'Configure MIDI' and choose IN and OUT ports first.")
        return
    }

/** I am blocking the holding of mouse down on the spinner to prevent it going too fast.
 * I need to implement min and max control for each id type- min and max are values of the trigger, so simple to get.
 * 
 * BUT i need to know if event was an up or down. where is that??. Can examine the event. the onclick mouse event has a
 * layerX and layerY value (and some others) that change depending on where you click. These appear to be realtive to the space you
 * click in so if you know that size, draw a horizontal line through it. Y above line is up, below line is down.
 * 
 */

    //unscaled value from UI
    let newValue = parseInt(document.getElementById(label).value, 10) + 1
    document.getElementById(label).value = newValue
        //this is the current, scaled value (same as mirage internal value)
        let currentValue = allPrograms[program - 1][label]
    //compute delta as number of arrow presses needed
    let delta = newValue - (currentValue / parameterScale[label])
    //display as 2 digit decimal, like mirage
    document.getElementById(label + "_display").value = newValue
    //update dirty flag- could make a 100% compare old vs new, but this is simple.
    setDirtyFlag(true)
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["parameter"] = parameterID[label].toString() //lookup parameter id (as a string) for the lable
    data["delta"] =  delta //ok to be positive or negative, since code will send up or down arrow as needed

    //need to update the allPrograms[program - 1][label] value to match NEW value and it must be scaled to Mirage
    //internal value
    allPrograms[program - 1][label] = newValue * parameterScale[label]

    window.api.send('writeParameter', data)
}


function captureMouse(trigger) {
    console.log('caught the mouse')
    if (trigger == "down") {
        return false
    }
    else {
        return true
    }
}


function getHexString(value){
    let hexStr = value.toString(16)
    if (hexStr.length < 2) {
        hexStr = "0" + hexStr
    }
    return hexStr
}



function getBankAndSound(sound) {
    var data = new Object()
    if (sound < 4) {
        data["sound"] = sound
        data["isLower"] = true
    }
    else {
        //adjust range to 1-3 for sysex
        data["sound"] = sound - 3
        data["isLower"] = false
    }
    return data
}



/**
 * The radio buttons for mixmode and monomode need special handler
 * @param {radiobutton}  

 */
function updateMode(trigger) {

        //check if midi is configured or not
        if (!isMidiConfigured) {
            //reset UI to default- making sure both off buttons are checked is correct deault state
            document.getElementById("mixmode_off").checked = "true"
            document.getElementById("monomode_off").checked = "true"
            //pop warning
            window.api.send('showWarning', "Please press 'Configure MIDI' and choose IN and OUT ports first.")
            return
        }

    var data = new Object()
    //update dirty flag- could make a 100% compare old vs new, but this is simple.
    setDirtyFlag(true)
        
    if (trigger.name == "monomode") {
        data["parameter"] = parameterID["monomode"].toString() 
    }
    else {
        //mixmode
        data["parameter"] = parameterID["mixmode"].toString() 
    }

    if (trigger.value == "off") {
        data["value"] = 0
    }
    else{
        data["value"] = 1
    }
    //send new value to Mirage. off = 0, on = 1
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut

    //set value in allPrograms. no need to scale it.
    allPrograms[program - 1][data["parameter"]] = data["value"]
    window.api.send('writeParameter', data)
}



function loadEditorFromDump() {
    //since from a dump, the editor has no changes 
    setDirtyFlag(false)
    loadEditor()
}

/**
 * Load the UI editor with data from the program selected or just loaded from mirage.
 */
function loadEditor() {
    //just changing the program does not change if dirty or not (unless I switch to tracking at program level vice globally)
    program = parseInt(document.getElementById("program").value)
    //get program info from allPrograms (since already loaded from Mirage and in sync)s)
    //program is zero-based in code. 1-4 in UI. 0-3 internally.
    var currentProgram = allPrograms[program - 1]
    Object.keys(currentProgram ).forEach(key =>
    {
        //mixmode and monomode are special, since radio buttons. There is an xx_on and xx_off id for each.
        let value = currentProgram[key]
        //scale the value for display in the UI (no change to what is stored in the program array)
        //value must be rounded to an integer. scale calculations can results in decimal values. Wonder how Mirage rounds?!?
        value = Math.round(value / parameterScale[key])

        if (key == "spare") {
            //same as continue in a forEach loop
            return
        } 
        else if (key == "mixmode"){
            //set correct state of each button
            if (value == 0)
            {
                document.getElementById("mixmode_off").checked = "true"
            }
            else {
                document.getElementById("mixmode_on").checked = "true"
            }
        } 
        else if (key == "monomode") {
            if (value == 0)
            {
                document.getElementById("monomode_off").checked = "true"
            }
            else {
                document.getElementById("monomode_on").checked = "true"
            }
        }
        else if (key == "wavesample") {
            //wavesample is zero-based in mirage, but UI in mirage and hence editor is 1-based
            document.getElementById(key).value = value + 1
            document.getElementById(key + "_display").value = value + 1
        }
        else {
            //go through the rest of the keys. those are the UI id's. set values. don't forget to rescale some.
            //check if value needs to be rescaled from how Mirage stores to how UI displays.
            document.getElementById(key).value = value
            //reload the textfield, too.
            document.getElementById(key + "_display").value = value
        }
    })
}


function setDirtyFlag(status) {
    var flag = document.getElementById("dirty")
    //reset dirty flag warning
    if (status) {
        flag.style.color = "red";
        flag.value = "Editor has changes!!"
        isDirty = true
    }
    else {
        flag.style.color = "green";
        flag.value = "No changes yet"
        isDirty = false
    }
}


function configureMidi() {
    //load the midi ports into the UI
    window.api.send('getMidiPorts')
    isMidiConfigured = true
    //enable UI to use save button and selectors
    document.getElementById("program").removeAttribute('disabled')
    document.getElementById("savesoundbank").removeAttribute('disabled')
    document.getElementById("savesound").removeAttribute('disabled')
    document.getElementById("loadsoundbank").removeAttribute('disabled')
    document.getElementById("loadsound").removeAttribute('disabled')
}


/**
 * Send sysex command to load a new sound from floppy into the mirage and load it into the UI.
 * Defaults to loading Program 1 for whatever sound it is.
 */
function loadSound() {

    //want a dirty warning but it needs to give user the choice of overriding unsaved sounds.
    if (isDirty) {
        //show warning
        /**
         * need to know bank and sound number from the currentsound status
         */
        let current = getBankAndSound(currentSound)
        let bank = current["isLower"] ? "lower" : "upper"
        var answer = window.confirm(`The editor has unsaved data. Save current sound to 
            disk ${bank} to ${current["sound"]}?`);
        if (answer) {
            //this saves to CURRENT SOUND vice to the saveSoundBank since following a different path
            //(assumption is you want to save to same bank you were editing; otherwise, you would use other method)
            saveSound()
        }
        else {
            return
        }
    }

    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data = {...data, ...getBankAndSound(loadSoundBank)}
    //this will display good log like "from lower bank sound 2"
    let bank = data["isLower"] ? "lower" : "upper"
    console.log(`Loading current Mirage sound/programs from ${bank} bank sound ${data["sound"]}`)
    //update UI so current sound/program match loaded
    document.getElementById("currentsound").value = loadSoundBank
    currentSound = loadSoundBank
    setDirtyFlag(false)
    window.api.send('loadSound', data)
}


/**
 * Set by changes to the UI dropdown list for selecting bank to load from
 */
function setLoadSoundBank() {
    loadSoundBank = parseInt(document.getElementById("loadsoundbank").value)
}

/**
 * Set by changes to the UI dropdown list for selecting bank to save to
 */
function setSaveSoundBank() {
    saveSoundBank = parseInt(document.getElementById("savesoundbank").value)
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
 * since that is already in the Mirage since the UI is in sync with the Mirage. 
 */
function saveSound() {
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data = {...data, ...getBankAndSound(saveSoundBank)}
    let bank = data["isLower"] ? "lower" : "upper"
    console.log(`Saving current Mirage sound/programs to  ${bank} bank sound ${data["sound"]}`)
    window.api.send('saveSound', data)
    //after a save there are editor editor changes so rest flag
    setDirtyFlag(false)
}



/**
 * Call back for recieving a program dump. Must parse it and SAVE it to all 4 programData objects
 * and put them into allPrograms. (global soo callback can access them). Note this is coming after a
 * load bank operation  not a straight program dump request, so length is 1267 vice 1255.
 */
window.api.receive('programDump', (event, args) => {
    /** receive 1255 bytes representing 625 bytes per the spec. Only interested in the program data for now.
    each byte is a nibble in LS MS order for each pair EXCEPT first byte is just a single byte.
      (9 * 32 + 8 * 24 + 1) * 2  offset into the 1255 bytes (after 4 bytes of sysex). Programs start from there. each program
    takes up 72 bytes. Math Check. 4 * 72 = 288.   288 + 192 + 1 = 481. 481 * 2 = 962. 962 + 288 = 1250.
    Sysex header is 4 bytes. Sysex ends with F7. So 5 bytes. 1255 -5 = 1250 nybbles. which form 625 bytes.
    */
   console.log(`in received programDump. Triggered by event ${event}`)

   //dumpData is all 4 programs
    var dumpData = new Array(288)
    //just copy 288bytes- skip headers and all but program data
    dumpData = args.slice(966, 1254)
    //now break into program objects- 72 bytes each, 36 pairs = 36 bytes of program data as per spec
    for (var i = 0; i < 4; i++) {
        //process all four programs of data
        var count = 0
        //dump is a single program
        var dump = new Object()
        for (var j = 0; j < 72; j+=2) {
            //process each pair into a byte
            let ls = dumpData[i * 72 + j]
            let ms = dumpData[i * 72 + j + 1]
            //addition happens before bitwise operations so paraentheses are required
            let value = (ms << 4) + ls
            //get name of parameter. There are 32 since there are 4 spare bytes at end. 9 is also a spare byte.
            let key = parameterNames[count++]
            dump[key] = value
        }
        //store dump.
        allPrograms[i] = dump
    }

    //now set the UI to program 1 for editing purposes.
    document.getElementById("program").value = 1
    loadEditorFromDump()
})


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
