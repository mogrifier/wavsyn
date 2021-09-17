//has listeners for the program editor UI.
//maintains overall state for all programs (12 - 4 per sound)
//would like to use same listeners but with some extra parameters to identify
//which sound/program was being edited.
//user sets these. all midi functions must use them. 
var midiIn = -1
var midiOut = -1
var isMidiConfigured = false
var isEditorLoaded = false

//program and sound used to set mirage up, once these are set, not used until they change. 
//change should change mirage setting, so send sysex onChange()
//range is 1-3. used in UI.
var currentSound = -1
var currentBank = "empty"
var currentParam = ""
//range 1 -4
var program = 1
var isLowerProgram = true
//track editor changes
var isDirty = false
//default values. range from 0- 6; 0 is for relaod.
var loadSoundBank = 0
//range 1-3 since you only save to current bank
var saveSoundBank = 1
//charts for adsr
var amplitudeChart
var filterChart

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

    //in the UI, y ranges from 0 to 30 (in the up/down arrow image)
    var y = trigger.layerY
    //middle of up/down arrow image
    var midLine = 16
    var delta = 1
    if (y < midLine) {
        delta = 1
    }
    else {
        delta = -1
    }

    var label = trigger.target.id
    //check if editor is loaded or not (can't load editor unless midi also configured)
    if (!isEditorLoaded) {
        //reset UI
        document.getElementById(label).value = 0
        //pop warning
        window.alert("Please load a sound to edit first.")
        return
    }


    //unscaled value from UI
    let newValue = parseInt(document.getElementById(label).value, 10) + delta
    //range check the value
    if (newValue < trigger.target.min || newValue > trigger.target.max) {
        ///out of rnage so do nothing
        return
    }

    document.getElementById(label).value = newValue
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

    //update or create the amplitude and filter charts
    renderChart()
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
 */
function updateMode(trigger) {

        //check if editor is loaded or not (can't load editor unless midi also configured)
        if (!isEditorLoaded) {
            //reset UI to default- making sure both off buttons are checked is correct deault state
            document.getElementById("mixmode_off").checked = "true"
            document.getElementById("monomode_off").checked = "true"
            //pop warning
            window.alert("Please load a sound to edit first.")
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
        data["delta"] = -1
        data["value"] = 0
    }
    else{
        data["delta"] = 1
        data["value"] = 1
    }
    //send delta to Mirage. off = 0, on = 1
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut

    //set value in allPrograms. no need to scale it.
    allPrograms[program - 1][trigger.name] = data["value"]
    window.api.send('writeParameter', data)
}



function loadEditorFromDump() {
    //since from a dump, the editor has no changes 
    setDirtyFlag(false)
    isEditorLoaded = true
    loadEditor()
}

/**
 * Load the UI editor with data from the program selected or just loaded from mirage.
 */
function loadEditor() {

    //check if editor is loaded or not (can't load editor unless midi also configured)
    if (!isEditorLoaded) {
        //reset UI to default value
        document.getElementById("program").value = program
        //pop warning
        window.alert("Please load a sound to edit first.")
        return
    }

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
        }
        else {
            //go through the rest of the keys. those are the UI id's. set values.
            document.getElementById(key).value = value
        }
    });

    isEditorLoaded = true
    //update or create the amplitude and filter charts
    renderChart()
    //now change program on the Mirage
    //f0 0f 01 01 00 x 7f f7 where x is program number
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["program"] = program
    window.api.send('changeProgram', data)
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
}


/**
 * Send sysex command to load a new sound from floppy into the mirage and load it into the UI.
 * Defaults to loading Program 1 for whatever sound it is.
 */
function loadSound() {

    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["isLowerProgram"] = isLowerProgram

    //0 means reload from current sound and bank without saving
    if (loadSoundBank != 0) {
        //want a dirty warning but it needs to give user the choice of overriding unsaved sounds.
        if (isDirty) {
            //show warning
            var answer = window.confirm(`The editor has unsaved data. Save current sound to disk ${currentBank} ${currentSound}? You can click 'cancel' and then use 'Save Sound' to save to a different location.`);
            if (answer) {
                //this saves to CURRENT SOUND vice to the saveSoundBank since following a different path
                //(assumption is you want to save to same bank you were editing; otherwise, you would use other method)
                saveSound("to current sound")
            }
            else {
                //user clicked cancel
                return
            }
        }
        data = {...data, ...getBankAndSound(loadSoundBank)}
    }
    else if (currentSound > -1) {
        //make sure reload is loading lower or upper as appropriate. Can't do a reload unless there is already a sound loaded
        data["sound"] = currentSound
        if (currentBank == "lower") {
            data["isLower"] = true
        }
        else {
            data["isLower"] = false
        }
    }
    else {
        //no soud loaded so no reload.
        window.alert("You must load a sound before you can perform a reload.")
        return
    }
    
    //this will display good log like "from lower bank sound 2"
    let bank = data["isLower"] ? "lower" : "upper"
    showLogs(`Loading Mirage sound/programs from ${bank} bank sound ${data["sound"]}`)
    window.api.send('loadSound', data)
    //update UI so current sound/program match loaded.
    document.getElementById("program").value = 1
    document.getElementById("currentbankandsound").value = `${bank} ${data["sound"]}`
    setDirtyFlag(false)
    //update internal state variables (a reload does not change these, but regular load will)
    currentBank = bank
    currentSound = data["sound"]
    isLowerProgram = data["isLower"]
    //update the savesound option list. Recall you can only save to whatever bank you loaded.
    var legalBank = document.getElementById("savesoundbank")
    //remove old options
    while (legalBank.firstChild) {
        legalBank.firstChild.remove()
    }
    //Create and append the options
    for (var i = 1; i < 4; i++) {
        var option = document.createElement("option");
        option.value = i
        option.text =  `${currentBank} ${i}`
        legalBank.appendChild(option);
    }
    //default saveSoundBank and UI selector to current sound
    saveSoundBank = currentSound
    document.getElementById("savesoundbank").value = saveSoundBank


    //select upper or lower program 1 in mirage. always set to 1 after load.
    data["program"] = 1
    window.api.send('changeProgram', data)
}


/**
 * Set by changes to the UI dropdown list for selecting bank to load from or a reload from current bank.
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

    if (midiIn > -1 & midiOut > -1) {
        //verify mirage comms
        verifyComms()
        //means user has selected in and out ports; does NOT mean it is correct
        isMidiConfigured = true
        //enable UI to use save button and selectors
        document.getElementById("program").removeAttribute('disabled')
        document.getElementById("savesoundbank").removeAttribute('disabled')
        document.getElementById("savesound").removeAttribute('disabled')
        document.getElementById("loadsoundbank").removeAttribute('disabled')
        document.getElementById("loadsound").removeAttribute('disabled')
    }
}


function verifyComms() {
    var data = new Object()
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    data["parameter"] = "36"
    window.api.send('readParameter', data)
}

/**
 * This tells the Mirage to save the current sound/programs to disk. It DOES NOT send the program data
 * since that is already in the Mirage since the UI is in sync with the Mirage. 
 */
function saveSound(trigger) {
    var data = new Object()
    data["command"] = "save sound"
    data["midiIn"] = midiIn
    data["midiOut"] = midiOut
    var bank = ""

    if (trigger == "savesound") {
        //user clicked "Save Sound" from UI to trigger the save
        data["sound"] = saveSoundBank
        bank = currentBank
    
        if (currentSound != data["sound"]) {
            //user is trying to save to a different bank or sound
            var yes = window.confirm(`You are attempting to save the current sound to a different location. Are you sure?`);
            if (!yes) {
                return
            }
        }

        if (bank == "lower") {
            data["isLower"] = true
        }
        else {
            data["isLower"] = false
        }
    }
    else {
        //save function triggered from a loadsound- default save to current sound bank
        data["sound"] = currentSound
        if (currentBank == "lower") {
            data["isLower"] = true
        }
        else {
            data["isLower"] = false
        }
        bank = data["isLower"] ? "lower" : "upper"
    }

    showLogs(`Saving current Mirage sound/programs to ${bank} bank sound ${data["sound"]}`)
    window.api.send('saveSound', data)
    //after a save there are editor editor changes so rest flag
    setDirtyFlag(false)
    //whenever a sound is saved, that is what is loaded in mirage so update current sound
    document.getElementById("currentbankandsound").value = `${bank} ${data["sound"]}`
    currentBank = bank
    currentSound = data["sound"]
}


function showLogs(message){
    document.getElementById("logs").value += ("\n" + message)
    document.getElementById("logs").scrollTop = document.getElementById("logs").scrollHeight;
    console.log(message)
}


window.api.receive('parameterValue', (event, args) => {
          /*
      returns: F0 0F 01 0D 10 25 00 05 F7
        0d = value requested
        10 = program (program is zero based. Lower 1,2,3,4 = 00, 01, 02, 03; Upper 1,2,3,4 = 10, 11, 12, 13 - note extra bit flipped to mean upper)

        just reading parameter 21 to get a string back that identifies:
        1) did midi comms work
        2) what program and bank is being edited as indicated by byte 4 (0-based)
        */
    if (args[4] < 4) {
        //lower bank
        showLogs(`lower bank ${args[4] + 1} being edited`)
        isLowerProgram = true
    }
    else {
        //upper bank
        showLogs(`upper bank ${args[4] - 15} being edited`)
        isLowerProgram = false
    }


})


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
   showLogs(`in received programDump.`)

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

    //if there is a problem with no ports found, show warning and return
    if (arg["inputs"].length == 0 | arg["outputs"].length ==0) {
        //missing required inputs
        window.alert("The required MIDI input and/or output ports were not found.")
        return
    }

    //never save- always keep fresh in case of system changes
    var optionList = document.getElementById("midi_in")
    while (optionList.firstChild) {
        optionList.firstChild.remove()
    }
    optionList = document.getElementById("midi_out")
    while (optionList.firstChild) {
        optionList.firstChild.remove()
    }

    //read the inputs
    var inputList = document.getElementById("midi_in")
    var option = document.createElement("option");
    option.value = -1
    option.text = "select input"
    inputList.appendChild(option);
    for (var i = 0; i < arg["inputs"].length; i++) {
        //load the dropdown lists
        //Create and append the options
        option = document.createElement("option");
        //I know there is only one 'k'
        for (var k in arg["inputs"][i]) {
            option.value = arg["inputs"][i][k]
            option.text = k
        }
        inputList.appendChild(option);
    }

    var outputList = document.getElementById("midi_out")
    option = document.createElement("option");
    option.value = -1
    option.text = "select output"
    outputList.appendChild(option);
    //now read the outputs and load
    for (i = 0; i < arg["outputs"].length; i++) {
        //load the dropdown lists
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
    showLogs(`sysex from mirage: ${arg}`)

})


function renderChart() {

    if (filterChart != undefined)
    {
        filterChart.destroy()
    }

    if (amplitudeChart != undefined)
    {
        amplitudeChart.destroy()
    }
    var filterCtx = document.getElementById('filteradsr').getContext('2d');
    var amplitudeCtx = document.getElementById('amplitudeadsr').getContext('2d');
    //data comes from current loaded program. also has to chage on updates to data.
    var dataset = createChartData()
    //change to scatter with x,y data plus connected points
    //https://stackoverflow.com/questions/46232699/display-line-chart-with-connected-dots-using-chartjs
    amplitudeChart = new Chart(amplitudeCtx, dataset.amplitude);
    filterChart = new Chart(filterCtx, dataset.filter);
}



function createChartData() {
    //create a json dataset for the given program for filter and amplitude adsr

    const labels = ["attack", "decay", "sustain", "release", ""]

    //recall program is zero based so need to subtract 1. Scaling NOT required since ADSRP values are not scaled.
    var attack = allPrograms[program - 1]["aea"]
    var decay = allPrograms[program - 1]["aed"]
    var sustain = allPrograms[program - 1]["aes"]
    var release = allPrograms[program - 1]["aer"]
    var peak = allPrograms[program - 1]["aep"]
    var amplitudeData = [{x: 0, y: 0}, {x: attack, y: peak }, {x: attack + decay, y: sustain}, 
        {x: attack + decay + 30, y: sustain}, {x: attack + decay + 30 + release, y: 0}]
    var dataset = new Object()
    dataset.amplitude = {
        type: 'scatter', data : {
          labels: labels,
          datasets: [{
            label: 'Amplitude ADSR',
            data: amplitudeData,
            fill: false,
            borderColor: 'rgb(5, 39, 194)',
            tension: 0.1,
            showLine:true
          }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 35
                },
                x: {
                    max: 130
                }
            },
            animation: {
                duration: 0
            }
        }
    }

    attack = allPrograms[program - 1]["fea"]
    decay = allPrograms[program - 1]["fed"]
    sustain = allPrograms[program - 1]["fes"]
    release = allPrograms[program - 1]["fer"]
    peak = allPrograms[program - 1]["fep"]
    var filterData = [{x: 0, y: 0}, {x: attack, y: peak }, {x: attack + decay, y: sustain}, 
        {x: attack + decay + 30, y: sustain}, {x: attack + decay + 30 + release, y: 0}]

    dataset.filter = {
        type: 'scatter', data : {
          labels: labels,
          datasets: [{
            label: 'Filter ADSR',
            data: filterData,
            fill: false,
            borderColor: 'rgb(160, 25, 47)',
            tension: 0.1,
            showLine:true
          }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 35
                },
                x: {
                    max: 130
                }
            },
            animation: {
                duration: 0
            }
        }
    }

    return dataset
}



function setCurrentLabel(event) {
    var text = event.target.localName
    if (text.includes("label")) {
        currentParam = event.target.htmlFor
    }
    
}

/*
window.addEventListener("click", function (event) {

    var text = event.target.localName
    if (text.includes("label")) {
        setCurrentLabel(event.target.htmlFor)
    }
    
})
*/

/*
document.addEventListener("DOMContentLoaded", function(event) { 
    //do work
    var allLabels = document.body.getElementsByTagName("label") 
    var x = allLabels.length

    for (var i = 0; i < x; i++) {
        //add listener
        allLabels[i].addEventListener("mouseenter", setCurrentLabel(allLabels[i].htmlFor))
    }

  });
*/


//keystroke listener for up and down arrows used to change parameter values
window.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
      return; // Do nothing if the event was already processed
    }

    if (currentParam == "") {
        //nothing selected so ignore the key press
        return
    }

    var mock = new Object()
  
    switch (event.key) {
      case "ArrowDown":
        // Do something for "down arrow" key press.
        //create object with parameters of the event used by update method- layerY, target.id, etc.
        mock = {"layerY": 20, "target": {"id": currentParam, "min": 1, "max": 20}}
        //need min and max to match the html page (maybe just read the page and set same values to ensure no errors)
        //now call update
        update(mock)
        break;
      case "ArrowUp":
        // Do something for "up arrow" key press.
        //create object with parameters of the event used by update method- layerY, target.id, etc.
        mock = {"layerY": 1, "target": {"id": currentParam, "min": 1, "max": 20}}
        //need min and max to match the html page (maybe just read the page and set same values to ensure no errors)
        //now call update
        update(mock)
        break;
      default:
        return; // Quit when this doesn't handle the key event.
    }
  
    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
  }, true);


