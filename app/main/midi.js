const midi = require('midi')

function getMidiPorts() {
    //create the MIDI in and out lists and return for use in UI
    var midiPorts = new Object();
    const input = new midi.Input();
    var ports = input.getPortCount();
    var inputList = new Array() 
    for (var i = 0; i < ports; i++) {
      //need name and number for each type of port (input or output)- put in an object
      let value = i
      let portName = input.getPortName(i)
      let current = `{"${portName}":${value}}`
      inputList.push(JSON.parse(current))
      console.log(`found midi input ${current}`)
    }

    //add output ports
    const output = new midi.Output();
    ports = output.getPortCount();
    var outputList = new Array()
    for (var j = 0; j < ports; j++) {
      //need name and number for each type of port (input or output)- put in an object
      let value = j
      let portName = output.getPortName(j)
      let current = `{"${portName}":${value}}`
      outputList.push(JSON.parse(current))
      console.log(`found midi output ${current}`)
    }

    input.closePort()
    output.closePort()

    //return object
    midiPorts["inputs"] = inputList
    midiPorts["outputs"] = outputList
    return midiPorts
}

exports.getMidiPorts = getMidiPorts