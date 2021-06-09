module.exports = {
    //put each function for manipulating wavetables, samples, and image files in here
    allTools : {
        convert32_to_8bit: function (){
            console.log("running convert32_to_8bit")

            return "32 to 8 bit conversion complete"
        },
        convert16_to_8bit: function (){
            console.log("running convert16_to_8bit")

            return "16 to 8 bit conversion complete"
        },
        convert_to_hfe: function () {
            console.log("running convert_to_hfe")
            return "hfe conversion complete"
        },
        write_image: function () {
            console.log("write_image")

            return "write image complete"
        }
    }
}