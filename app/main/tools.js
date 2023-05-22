const path = require ("path")
const fs = require ("fs")
const { exec } = require('child_process')
const {dialog} = require('electron');
const { O_DIRECTORY } = require("constants");
const int24 = require('int24');
const factorial = require("factorial")

//Global variables
var WAVHEADER = 44
var KB = 1024
var TRACK_LENGTH = 5632
var MIRAGESOUNDS = 393216
var SINGLESOUND = 65536
var TEMPLATE = "sample_template_16kb.img"
var soundNames = ["lower 1", "upper 1", "lower 2", "upper 2", "lower 3", "upper 3"]

/* This is like the public interface of the tools.js module **/
        //put each function for manipulating wavetables, samples, and image files in here
var allTools = {
    convert32_to_8bit: function (source, destination) {
        var logString = new Array()
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source, ["wav"])
        let index = 0
        logString[index++] = "**Converting 32bit to 8 bit files**"
        for (const fileName of allFiles){
            console.log (`converting ${fileName} to 8-bit`)
            let data32 = code.readFileBytes(fileName, source)
            //remove 100 byte header and convert
            let data8 = code.convert_32bf_to_8bit(code.removeWaveHeader(data32, 100))
            //write new data to a file
            code.writeFile(data8, "8bit_" + fileName, destination)
            logString[index++] = `converting ${fileName} to 8-bit`
        }
        return logString
    },
    convert24_to_8bit: function (source, destination) {
        var logString = new Array()
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source, ["wav"])
        let index = 0
        logString[index++] = "**Converting 24bit to 8 bit files**"
        for (const fileName of allFiles){
            console.log (`converting ${fileName} to 8-bit`)
            let data24 = code.readFileBytes(fileName, source)
            //remove 44 byte header and convert
            let data8 = code.convert_24b_to_8bit(code.removeWaveHeader(data24))
            //write new data to a file
            code.writeFile(data8, "8bit_" + fileName, destination)
            logString[index++] = `converting ${fileName} to 8-bit`
        }
        return logString
    },
    convert16_to_8bit: function (source, destination) {
        var logString = new Array()
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source, ["wav"])
        let index = 0
        logString[index++] = "**Converting 16bit to 8 bit files**"
        for (const fileName of allFiles){
            console.log (`converting ${fileName} to 8-bit`)
            let data16 = code.readFileBytes(fileName, source)
            //remove 44 byte header and convert
            let data8 = code.convert_16b_to_8bit(code.removeWaveHeader(data16))
            //write new data to a file
            code.writeFile(data8, "8bit_" + fileName, destination)
            logString[index++] = `converting ${fileName} to 8-bit`
        }
        return logString
    },

    convert_to_hfe: function (source, destination) {
        console.log("running convert_to_hfe")
        //msg is the child_process object. arguments go in the brackets, callback is last

/** will need to call each process separately for all source file (must be extension edm,
 * but could rename img to edm)
 * hxcfe -finput:./hxc_source/analog.edm -foutput:analog.hfe -conv -ifmode:GENERIC_SHUGART_DD_FLOPPYMODE
 * 
 * can't figure out how to make work on a folder
 * 
 */
        var logString = new Array()
        var index = 0
        logString[index++] = "**Converting .edm/.img to .hfe files**"
        let allFiles = code.getFileList(source, ["edm", "img"])

        let goodFiles = new Array()
        for (const fileName of allFiles) {
            //only allow files that end in edm or img and have have no spaces in them
            if ( fileName.indexOf(' ') < 0 
                && source.indexOf(' ') < 0 && destination.indexOf(' ') < 0) {
                goodFiles.push(fileName)
            }
            else {
                //skip
                logString[index++] = `skipping ${fileName} since not a .edm or .img file, or contains spaces in the file path or name`
            }
        }

        for (const fileName of goodFiles) {
            //will not process filenames with spaces. tried single quotes and did not work, even though does in powershell.
            var msg
            var command
            //I cannot get a CLI process to work, but hxcfloppyemulator at least starts
            if (process.platform == "darwin") {
                command = "hxcfloppyemulator"
                logString[index++] = (`Running: ${command}. You must use the HXCFE UI to perform this operation on a Mac.`)
                msg = exec(command)
                //no reason to loop on a Mac
                break
            }
            else {
                command = "hxcfe -finput:" + source  + path.sep + fileName + " -foutput:" 
                    + destination + path.sep + path.parse(fileName).name + ".hfe"
                    + " -conv -ifmode:GENERIC_SHUGART_DD_FLOPPYMODE"
                //var msg = exec("hxcfe -finput:${source}\\analog.edm -foutput:${destination}\\analog.hfe -conv -ifmode:GENERIC_SHUGART_DD_FLOPPYMODE")
                console.log(command)
            }

            msg = exec(command)
            msg.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            //I tried to cause error but it just didn't process if it couldn't find input file
            msg.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
                //I could not call method in the main.js to do this- circularity error. 
                let options = {
                    title : "I'm sorry, Dave, I'm afraid I can't do that",
                    message : data
                    }
                    //This is NOT optimal, since not modal.
                dialog.showMessageBoxSync(options)
            });

            logString[index++] = `converting ${fileName} to hfe`
        }
    
        logString[index++] = "hfe conversion complete"
        return logString
    },

    /**This will extract the data from a mirage disk image (original, not hfe) in source
    and write it out as 6 wavesample files to destination. They are raw pcm data (no wav header). 
    Format is: mono, unsigned 8 bit
    */
    extractWavesamples: function (source, destination) {
        //read files into buffers and process using function below
        let allFiles = code.getFileList(source, ["edm", "img"])
        var logString = new Array()
        var index = 0
        logString[index++] = "**Reading samples from Mirage disk images**"

        for (const fileName of allFiles){
            logString[index++] = `processing file ${fileName}`
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
        logString[index++] = "sample extraction complete"
        return logString
    },

    // Reads files from source and writes to a mirage disk image format in destination
    // using a template to insert the data in. The template contains the Mirage OS, sound parameters, wavetable
    // settings, and global mirage config parameters.
    // Source Files should be 384KB, with defined 64KB chunks representing samples for each Mirage Sound.
    writeDiskImage: function (source, destination) {
        // this is a pretty good choice for a template since all 12 programs are setup (I think)
        var index = 0
        var logString = new Array()
        logString[index++] = "**Writing disk images (.edm) files**"
        logString[index++]  = `path to executing file = ${__dirname}`
        var template = code.readFileBytes(TEMPLATE, __dirname + path.sep + ".." + path.sep + "assets")
        let allFiles = code.getFileList(source, ["wav"])
        for (const fileName of allFiles){
            var name_stub = path.parse(fileName).name
            var wavesamples = code.readFileBytes(fileName, source)
            wavesamples = code.removeWaveHeader(wavesamples)
            if (wavesamples.length != MIRAGESOUNDS) {
                logString[index++] = `skipping file ${fileName} since it does not contain ${MIRAGESOUNDS} bytes as required`
                continue
            }
            //change 0 value samples to 1
            wavesamples = code.dezero(wavesamples)
            var newImage = Buffer.alloc(template.byteLength)
            //write template data to newImage (newImage is reused for each file so a new object is needed)
            template.copy(newImage, 0, 0, template.byteLength)
            // go through the tracks/sectors and write data. copy template to the newImage as you go.
            // each wavesample starts at the given track PLUS 1024 bytes
            // write 78 sectors worth of data (6 * 64KB) into the 5120 byte slots in the template
            for (var count = 0; count < 6; count++) {
                for (var x = 0; x < 13; x++) {
                    var track = (count * 13) + x + 2
                    var position = track * TRACK_LENGTH
                    var wavesample_position = count * 65536 + x * 5120
                    if (x == 0) {
                        // skip 1024 and copy 4096 for first sector of each sample.
                        wavesample_position = count * 65536
                        //mirageData.copy(pcm, 0, offset, offset + sample_size)
                        wavesamples.copy(newImage, position + 1024, wavesample_position, wavesample_position + 4096)
                    }
                    else {
                        wavesample_position = count * 65536 + 4096 + (x - 1) * 5120
                        wavesamples.copy(newImage, position, wavesample_position, wavesample_position + 5120)
                    }
                }
            }
            // save the new disk image, named after the wave data file. Using edm since hxcfe requires that.
            code.writeFile(newImage, name_stub + ".edm", destination)
            logString[index++] = `wrote mirage image ${name_stub + ".edm"} to ${destination}`
        }
        return logString
    },

    coalesceTo384KB : function (source, destination) {
        /*general algorithm is create 6 64KB buffers. Add files from source until you can add no more then pad (with 1's) to fill.
        Write log of memory pages for each file. combine the buffers into a single 384KB file and write that file 
        to destination. Dezero file. Remember that write order ia lower1, upper1, lower2, upper2, lower3, upper3.
        */
        
        var logString = new Array()
        var index = 0
        logString[index++] = "**Coalescing files to 384KB file for disk image writing**"
        let allFiles = code.getFileList(source,["wav"])
        let fileIndex = 0
        while (fileIndex < allFiles.length) {
            var newImageAudio = Buffer.alloc(MIRAGESOUNDS)
            var soundsCopied = 0
            for (var i = 0; i < 6; i++) {
                logString[index++] = `creating sound ${soundNames[i]}`
                var full = false
                var newSound = Buffer.alloc(SINGLESOUND)
                var usedSize = 0
                while (!full && (fileIndex < allFiles.length)) {
                    //add 8-bit files until full
                    var name_stub = path.parse(allFiles[fileIndex]).name
                    var wavesamples = code.readFileBytes(allFiles[fileIndex], source)
                    //in case 8bit file has a header
                    wavesamples = code.removeWaveHeader(wavesamples)
                    if (wavesamples.length > SINGLESOUND) {
                        logString[index++] = `skipping file ${name_stub} because it is larger than  ${SINGLESOUND} bytes.`
                        //move to next file
                        fileIndex++
                        continue
                    }
                    //change 0 value samples to 1
                    wavesamples = code.dezero(wavesamples)
                    if (usedSize + wavesamples.byteLength <= SINGLESOUND) {
                        //write sample data to newSound if it fits
                        wavesamples.copy(newSound, usedSize, 0, wavesamples.byteLength)
                        //log it
                        logString[index++] = `\tAdding file ${name_stub}. Memory range is 0x${code.getHex(usedSize, false).toUpperCase()} to 0x${code.getHex(usedSize + wavesamples.byteLength, true).toUpperCase()}`
                        usedSize += wavesamples.byteLength
                        //moved to next file
                        fileIndex++
                        //test if perfectly full (no need to pad)
                        if (usedSize == SINGLESOUND) {
                            full = true
                            //copy to newImageAudio to the correct 64KB slot
                            newSound.copy(newImageAudio, i * SINGLESOUND, 0, SINGLESOUND)
                            soundsCopied++
                        }
                    }
                    else {
                        //pad the file with 1's to end
                        for (var j = usedSize; j < SINGLESOUND; j++) {
                            newSound[j] = 1
                        }
                        full = true
                        //copy to newImageAudio to the correct 64KB slot
                        newSound.copy(newImageAudio, i * SINGLESOUND, 0, SINGLESOUND)
                        soundsCopied++
                    }
                }
            }
            //end for; write the 384KB file to disk. Make up a name.
            let imageName = (new Date()).getTime()
            code.writeFile(newImageAudio, `imageaudio_${imageName}.wav`, destination)
            logString[index++] = `**Wrote disk image audio file ${imageName}.wav**`
        }
        return logString
    },

    interpolate : function (source, destination) {
        /*Apply to only 1KB wav or raw files in source folder. Each is interpolated over 31 steps, then reversed. The result is
        32 steps going from wav A to wav B, then 32 steps from wav B to wav A. This means there are two copies of wav B in the middle.
        */
        var logString = new Array()
        var index = 0
        var data
        var pcm
        logString[index++] = "**Interpolating files to create set of new 64KB files.**"
        let allFiles = code.getFileList(source,["wav", "raw"])
        let fileIndex = 0
        let pcmIndex = 0
        var pcmData = new Array()
        

        //get good list of files- correct size, no wav headers
        for (const fileName of allFiles){
            //logString[index++] = `processing file ${fileName}`
            data = code.readFileBytes(fileName, source)
            //check if less than 1KB of data plus wav header length, strip if needed
            //audacity writes a long header (124 bytes) in some export mmodes- must compensate.
            //FIXME
            if (data.byteLength <= 1024 + WAVHEADER) {
                pcm = code.removeWaveHeader(data, 44)
                //save good 1024 bytes chunks of pcm data
                pcmData[pcmIndex++] = pcm
                logString[index++] = `${fileName} is 1KB file and will be used for interpolation`
            }     
        }
        //code for creating the permutations of file pairs to be interpolated    
        //for n things taken r at a time (r = 2 in my case) n!/r!(n-r)!  where ! == factorial
        var permutations = factorial(pcmData.length)/(factorial(2) * factorial(pcmData.length - 2))

        if (permutations > 0) {
            logString[index++] = `Interpolation process will create ${permutations} new 64KB files`
            //create number pairs using two for loops. Increment start of second loop. I am treating pairs AC as same as CA.
            for (var x = 0; x < pcmData.length - 1; x++) {
            
                for (var y = x + 1; y < pcmData.length; y++) {
                    //interpolate from x to y and write resulting 64KB file
                    //generate file name
                    var name = `new${fileIndex++}.wav`
                    code.writeFile (code.interpolateWaveforms(pcmData[x], pcmData[y]), name, destination)
                    logString[index++] = `Wrote ${name} to ${destination}`
                }
            }
        }
        else {
            logString[index++] = `No files will be created. At least 2 1KB *.wav or *.raw files must be in ${source}`
        }
        
        return logString
    },


    help: {"writeDiskImage":`Write a mirage disk image from 384KB source audio files. Files must be unsigned 8 bit,
     mono, PCM. The wave header will be removed if present. This creates a 440KB disk image file (extension .edm) for use with 
    Omniflop or conversion to HFE. See the Software menu to download additional tools.`, 

    "convert_to_hfe":`Convert a disk image to hfe. You need to have HxCFloppyEmulator installed AND on your PATH. 
    See the Software menu to download additional tools. No spaces are allowed in the file path or name!`, 

    "convert16_to_8bit":"Convert 16 bit mono files to 8 bit unsigned raw data. If wave header present, assumes 44 byte length.",

    "convert24_to_8bit":"Convert 24 bit mono files to 8 bit unsigned raw data. If wave header present, assumes 44 byte length.",


    "convert32_to_8bit":"Convert 32 bit float mono files to 8 bit unsigned raw data. If wave header present, assumes 100 byte length.",

    "extractWavesamples": `Remove all 6 sound chunks from a mirage disk image and write as 6 separate 
    64KB files of 8-bit, unsigned pcm data. File names are based on image file name with a suffix indicating the 
    sound they came from.`,

    "coalesceTo384KB": `Takes a folder of 8-bit files and combines them into a single 384KB file for writing to a disk image. Sample 
    files cannot cross the 64KB barrier of each sound. They will be padded as needed. A log of the Mirage memory page range of each 
    file is created. Files are added in alphabetical order.`,

    "interpolate": `Takes a folder of 8-bit 1KB files and interpolates each with every other, creating new 64KB samples for use in
    Mirage image files. 
    `
}
}


/* Functions here are not exported and are meant to be used internally by various tool functions.
They are utilities shared by all functions.
Non-exported functions are like 'private' functions **/

//Remove the 44 byte wavheader from the Buffer passed in. Returns a new Buffer.

var code = {

    /* Interpolate between waveforms.
    */
    interpolateWaveforms : function (wave1, wave2) {
        var interpolationResult = Buffer.alloc(SINGLESOUND)
        //write starting/ending waveforms to the result buffer. 31 is an end. 32 is start of reverse direction.
        //wave1.copy(interpolationResult, 0, 0, 1024)
        //wave1.copy(interpolationResult, 1024 * 63, 0, 1024)
        var i = 0
        var delta = 0
        var j = 0

        //forward
        for (i = 0; i < KB; i++) {
            /*for each starting byte, look at value of corresponding byte in final waveform. Compute delta
            and divde by 31. That is step value (could be + or -). Write each new value for the step into the
            result buffer. I expect discontinuities, but don't know if that will be OOK audibly or not.
            There are two parts to this- forward and backwards interpolation
            */
            delta = (wave2[i] - wave1[i]) / 32
            for (j = 0; j < 32; j++) {
                //fill buffer for all points from start to finish, one set at a time for an i value
                interpolationResult[j * KB + i] = wave1[i] +  Math.round(delta * j)
            }
        }
        //reverse
        for (i = 0; i < KB; i++) {
            delta = (wave1[i] - wave2[i]) / 32
            for (j = 32; j < 64; j++) {
                //fill buffer for all points from start to finish, one set at a time for an i value
                interpolationResult[j * KB + i] = wave2[i] +  Math.round(delta * (j - 32))
            }
        }

        return code.dezero(interpolationResult);
    },

    collapseWaveData : function (samples) {
        var clean_wavesample = Buffer.alloc(66560)
        var wave_data = 5120
        for (var start = 0; start < 13; start++) {
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
        
        return code.dezero(eight_bit)
    },

        //Take a data stream consisting of 24 bit integer (audio data) and convert to 8 bit. Assuming little-endian data.
        convert_24b_to_8bit : function (input_bytes) {
            let size = input_bytes.length
            //24 bit integer are 3 byte values.
            let eight_bit = Buffer.alloc(size / 3)
            var index = 0
            for (let i = 0; i < size; i += 3) {
                //read 3 and unpack 3 bytes in little-endian order to an integer. read from buffer using offset
                let value = int24.readInt24LE(input_bytes, i)
                //value is expected to be in range −8,388,608 to 8,388,607. Convert to 0 - 255.
                //note there are minor differences between this code and python. Maybe floating point handling or rounding.
                eight_bit[index++] = Math.round(((value + 8388608)/16777215)  * 255)
            }
            
            return code.dezero(eight_bit)
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
            eight_bit[index++] = Math.round(((value + 32768)/65535) * 255)
        }
        return code.dezero(eight_bit)
    },

    dezero : function (input_bytes) {
        //value cannot be zero on Mirage- that means loop stop and can cause trouble
        for (let i = 0; i < input_bytes.length; i++) {
            if (input_bytes[i] == 0) {
                input_bytes[i] = 1
            }
        }
        return input_bytes
    },

    getHex : function (location, minus1) {
        //convert to Mirage page number. Round fractions up so it shows next page number is used, even if not complete.
        //this will probably do nothing once page boundary fix is in place, since EVERYTHING will be padded to something 
        //evenly divisible by 256.
        let pages = Math.ceil(location / 256)
        if (minus1) {
            pages = pages - 1
        }
        return  pages.toString(16)
    },

    //source is a directory. Only return files- not any directories.
    getFileList : function (source, filter) {
        let all_entries = fs.readdirSync(source)
        let all_files = new Array()
        for (let i = 0; i < all_entries.length; i++) {
            //check if a file name matches extensions in filter
            for (let j = 0; j < filter.length; j++) {
                if (all_entries[i].toLowerCase().endsWith(filter[j])) {
                    all_files.push(all_entries[i])
                    break
                }
            }
        }
        return all_files
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
    },
}

//end of internal namespace
exports.code = code
exports.allTools = allTools
