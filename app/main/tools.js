const buffer = require ("buffer")
const path = require ("path")
const fs = require ("fs")


//Global variables
var WAVHEADER = 44
var TRACK_LENGTH = 5632

/* This is like the public interface of the tools.js module **/
        //put each function for manipulating wavetables, samples, and image files in here
module.exports = {
    allTools : {
    convert32_to_8bit: function (source, destination) {
        var logString = new Array()
        console.log (`processing ${source} file(s) and writing to ${destination}`)
        console.log("running convert32_to_8bit")
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source)
        let index = 0
        for (const fileName of allFiles){
            console.log (`converting ${fileName} to 8-bit`)
            let data32 = code.readFileBytes(fileName, source)
            //remove 100 byte header and convert
            let data8 = code.convert_32bf_to_8bit(code.removeWaveHeader(data32, 100))
            //write new data to a file
            code.writeFile(data8, "8bit_" + fileName, destination)
            logString[index++] = `converting ${fileName} to 8-bit\n`
        }
        return logString
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
        code.readFileBytes(fileToRead, source)

        return "write image complete"
    }
}
}

/* Functions here are not exported and are meant to be used internally by various tool functions.
They are utilities shared by all functions.
Non-exported functions are like 'private' functions **/

//Remove the 44 byte wavheader from the Buffer passed in. Returns a new Buffer.

var code = {

    removeWaveHeader : function (data, size = WAVHEADER) {
        //allocate new buffer to size without header
        var pcm = Buffer.alloc(data.byteLength - size)
        //return data (bytearray) without 44 byte header as a new Buffer
        data.copy(pcm, size, data.byteLength )
        return pcm
    },

    writeFile : function (data, fileName, destination) {
        let image = fs.openSync(destination + path.sep + fileName, 'w')
        fs.writeFileSync(image, data)
        //was getting an error saying I had no callback (whcih I thought wa optional) so added one
        fs.close(image, (err) => {
        if (err)
            console.error('Failed to close file', err);
        });
        console.log(`wrote file ${fileName} to ${destination}`)
    },

    //Read contents of a file in the directory source
    readFileBytes : function (sample_file, source) {
        //get file handle to the source file
        var data = fs.readFileSync(path.join(source, sample_file))
        console.log(`info: data read from source file = ${data.byteLength}.`)
        return data
    },

    //Take a data stream consisting of 32 bit floats (audio data) and convert to 8 bit. Assuming little-endian data.
    convert_32bf_to_8bit : function (input_bytes) {
        let size = input_bytes.length
        //32 bit floats are 4 byte values.
        let eight_bit = Buffer.alloc(size / 4)
        var index = 0
        for (let i = 0; i < size; i += 4) {
            //read 4 and unpack 4 bytes in little-endian order to a float
            let value = input_bytes.readFloatLE(i)
            //value is expected to be in range -1 to + 1. Convert to 0 - 255.
            eight_bit[index] = Math.round((value[0] + 1) / 2 * 255)
            index += 1
        }
        return eight_bit
    },

    //source is a directory
    getFileList : function (source) {
        return fs.readdirSync(source)
    }
}

//end of internal namespace
module.exports = code