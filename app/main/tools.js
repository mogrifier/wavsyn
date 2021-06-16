const buffer = require ("buffer")
const path = require ("path")
const fs = require ("fs")


//Global variables
var WAVHEADER = 44
var TRACK_LENGTH = 5632

/* This is like the public interface of the tools.js module **/
        //put each function for manipulating wavetables, samples, and image files in here
var allTools = {
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
        var logString = new Array()
        console.log (`processing ${source} file(s) and writing to ${destination}`)
        console.log("running convert16_to_8bit")
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source)
        let index = 0
        for (const fileName of allFiles){
            console.log (`converting ${fileName} to 8-bit`)
            let data16 = code.readFileBytes(fileName, source)
            //remove 44 byte header and convert
            let data8 = code.convert_16b_to_8bit(code.removeWaveHeader(data16))
            //write new data to a file
            code.writeFile(data8, "8bit_" + fileName, destination)
            logString[index++] = `converting ${fileName} to 8-bit\n`
        }
        return logString
    },
    convert_to_hfe: function (source, destination) {
        console.log (`processing ${source} file(s) and writing to ${destination}`)
        console.log("running convert_to_hfe")
        return "hfe conversion complete"
    },
    write_image: function (source, destination) {
        console.log (`processing ${source} file(s) and writing to ${destination}`)
        console.log("write_image")

        return "write image complete"
    },

    /**This will extract the data from a mirage disk image (original, not hfe) in source
    and write it out as 6 wavesample files to destination. They are raw pcm data (no wav header). 
    Format is: mono, unsigned 8 bit
    */
    extractWavesamples: function (source, destination) {
        console.log (`processing ${source} file(s) and writing to ${destination}`)
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source)
        for (const fileName of allFiles){
            /** create six separate arrays of binary data, each initially 72704 bytes.
            This contains the 64KB wavesample plus extra 512 byte sectors
            and initial 1024 byte parameter data to be removed. */
            var mirageData = code.readFileBytes(fileName, source)
            console.log(`data read = ${mirageData.length}.`)
            //wavesample plus extra data size
            var sample_size = 72704
            //should be a 440kb image file. extension can be img or edm
            var name_stub = path.parse(fileName).name
            //track start number for samples
            var sample_metadata = {}
            //could not create using json string- causing parser error.
            sample_metadata[name_stub +"_lh1.wav"] = 2
            sample_metadata[name_stub + "_uh1.wav"] = 15
            sample_metadata[name_stub + "_lh2.wav"] = 28
            sample_metadata[name_stub + "_uh2.wav"] = 41
            sample_metadata[name_stub + "_lh3.wav"] = 54
            sample_metadata[name_stub + "_uh3.wav"] = 67

            //calculate offset and remove short sectors
            //lower half wavesample 1, starts at sector 2 (skips 0 and 1)
            Object.keys(sample_metadata).forEach(function(key) {                
                let soundName = key
                let track = sample_metadata[soundName]
                //create a new byte array containing correct data (64KB chunk)
                let offset = track * TRACK_LENGTH
                var pcm = Buffer.alloc(sample_size)
                mirageData.copy(pcm, 0, offset, offset + sample_size)
                console.log(`***** processing ${soundName} *****`)
                let wavesample = code.collapseWaveData(pcm)
                code.writeFile(wavesample, soundName, destination)
            })
        }
    },

    help: {"write_image":`Write a mirage disk image. This creates a 440KB disk image file for use with 
    Omniflop. See the Software menu to download.`, 

    "convert_to_hfe":`Convert a disk image to hfe. You need to have HxCFloppyEmulator installed AND on your PATH. 
    See the Software menu to download.`, 

    "convert16_to_8bit":"Convert 16 bit mono files to 8 bit unsigned raw data. If wave header present, assumes 44 byte length.",

    "convert32_to_8bit":"Convert 32 bit float mono files to 8 bit unsigned raw data. If wave header present, assumes 100 byte length.",

    "extractWavesamples": `Remove all 6 sound chunks from a mirage disk image and write as 6 separate 
    64KB files of 8-bit, unsigned pcm data. File names are based on image file name with a suffix indicating the sound they came from.`}
}


/* Functions here are not exported and are meant to be used internally by various tool functions.
They are utilities shared by all functions.
Non-exported functions are like 'private' functions **/

//Remove the 44 byte wavheader from the Buffer passed in. Returns a new Buffer.

var code = {

    collapseWaveData : function (samples) {
        var clean_wavesample = Buffer.alloc(66560)
        var wave_data = 5120
        for (var start = 0; start < 13; start++) {
            let end = start * wave_data + wave_data
            //console.log(`copying bytes ${start * TRACK_LENGTH}:${start * TRACK_LENGTH + wave_data}`)
            //console.log(`to ${start * wave_data}:${end}`)
            samples.copy(clean_wavesample, start * wave_data, start * TRACK_LENGTH, start * TRACK_LENGTH + wave_data)
        }
        //skip first 1024 bytes of parameter data
        return clean_wavesample.slice(1024, 66560)
    },

    removeWaveHeader : function (data, size = WAVHEADER) {
        //test if a wave file first. If no, then return data
        if (!code.isWaveFile(data)) {
            return data
        }

        //allocate new buffer to size without header
        var pcm = Buffer.alloc(data.byteLength - size)
        //return data (bytearray) without 44 byte header as a new Buffer
        data.copy(pcm, 0, size, data.byteLength )
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
            //note there are minor differences between this code and python. Maybe floating point handling or rounding.
            eight_bit[index++] = Math.round(((value + 1) / 2) * 255)
        }
        
        return eight_bit
    },

    convert_16b_to_8bit : function (input_bytes) {
        let size = input_bytes.length
        //16 bit ints are 2 byte values.
        let eight_bit = Buffer.alloc(size / 2)
        var index = 0
        for (let i = 0; i < size; i += 2) {
            //not as simple as I thought. Need unsigned values from signed 16 bit data
            let value = input_bytes.readInt16LE(i)
            //change range to 0 - 65535 and grab MSB
            eight_bit[index++] = Math.round((value + 32768) / 255)
        }
        return eight_bit
    },

    //source is a directory
    getFileList : function (source) {
        return fs.readdirSync(source)
    },

    isWaveFile : function (data) {
        // look at start of data bytes for wave header info
        //http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html
        var riff = data.slice(0, 16).toString("utf-8", 0, 16)
        if (riff.startsWith("RIFF")) {
            return true
        }
        else {
            return false
        }
    }
}

//end of internal namespace
exports.code = code
exports.allTools = allTools
