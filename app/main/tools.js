const buffer = require ("buffer")
const path = require ("path")
const fs = require ("fs")

//Global variables
var WAVHEADER = 44
var TRACK_LENGTH = 5632

/* This is like the public interface of the tools.js module **/
module.exports = {
        //put each function for manipulating wavetables, samples, and image files in here
        allTools : {
        convert32_to_8bit: function (source, destination) {
            console.log (`processing ${source} file(s) and writing to ${destination}`)
            console.log("running convert32_to_8bit")

            return "32 to 8 bit conversion complete"
        },
        convert16_to_8bit: function (source, destination) {
            console.log (`processing ${source} file(s) and writing to ${destination}`)
            console.log("running convert16_to_8bit")

            return "16 to 8 bit conversion complete"
        },
        convert_to_hfe: function (source, destination) {
            console.log (`processing ${source} file(s) and writing to ${destination}`)
            console.log("running convert_to_hfe")
            return "hfe conversion complete"
        },
        write_image: function (source, destination) {
            console.log (`processing ${source} file(s) and writing to ${destination}`)
            console.log("write_image")
            var fileToRead = "sample.txt"
            readFileBytes(fileToRead, source)

            return "write image complete"
        }
    }
}

/* Functions here are not exported and are meant to be used internally by various tool functions.
They are utilities shared by all functions.
Non-exported functions are like 'private' functions **/

//Remove the 44 byte wavheader from the Buffer passed in. Returns a new Buffer.
function removeWaveheader(data) {
    //allocate new buffer
    var pcm = buffer.alloc(data.byteLength)
    //return data (bytearray) without 44 byte header as a new Buffer
    data.copy(pcm, WAVHEADER, data.byteLength )
    return pcm
}


function writeFile(data, fileName, destination) {
    let image = fs.open(destination + path.sep + fileName, 'w')
    image.writeFile(data)
    image.close()
    console.log(`wrote file ${fileName} to ${destination}`)
}


function readFileBytes(sample_file, source) {
    //get file handle to the source file
    var data = fs.readFileSync(path.join(source, sample_file))
    console.log(`info: data read from source file = ${data.byteLength}.`)
    return data
}