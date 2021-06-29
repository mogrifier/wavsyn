//has listeners for the program editor UI.
//maintains overall state for all programs (12 - 4 per sound)
//would like to use same listeners but with some extra parameters to identify
//which sound/program was being edited.


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
}

function getProgramDump(lower) {
    //send sysex command to the Mirage to get a program dump (upper or lower)
    //if lower = true, get a lower program dump of 3 programs
     window.api.send('getProgramDump', lower)


}

