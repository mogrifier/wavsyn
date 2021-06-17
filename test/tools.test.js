const fs = require ("fs")
const {allTools, code} = require('../app/main/tools.js');

//this has a valid 44 byte wav header
var wavdata = "5249464614269E0257415645666D7420120000000100020044AC000010B102000400100000004A554E4BCA0F000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

//first argument is the test name, second is a function to run. Uses 'expect' like 'assert'.
test('remove header from byte array', () => {
  let testData = Buffer.alloc(200)
  //no wave header
  expect(code.removeWaveHeader(testData, 100).length).toBe(200)
  //default 44 byte header
  expect(code.removeWaveHeader(testData).length).toBe(200)

  //with wave header
  testData = Buffer.from(wavdata, 'hex')
  //put in some data with a wav header to cause header stripping
  expect(code.removeWaveHeader(testData, 100).length).toBe(100)
  //default 44 byte header
  expect(code.removeWaveHeader(testData).length).toBe(156)
});


test('read file', () => {
  let testData = code.readFileBytes("testdata.txt", "./test")
  //this is test data.
  expect(testData.length).toBe(18)
});


test('getFileList', () => {
  let list = code.getFileList(".")
  console.log(list)
  //22 files and directories in root of project
  expect(list.length).toBe(22)
});

test('convert32_to_8bit', () => {

  //call public function instead . compare resulting file contents. add test files to this directory.
  allTools.convert32_to_8bit ("./test/assets/32bit/source", "./test/assets/32bit/destination")
  let eightBit = code.readFileBytes("8bit_Wave 03.wav", "./test/assets/32bit/destination")
  let goodEightBit = code.readFileBytes("Wave_03_8bit.wav", "./test/assets/32bit")
  //compare file contents as buffers
  expect(goodEightBit.equals(eightBit)).toBe(true)
  //clean up
  fs.rmSync("./test/assets/32bit/destination/8bit_Wave 03.wav")

});

test('convert16_to_8bit', () => {

  //call public function instead . compare resulting file contents. add test files to this directory.
  allTools.convert16_to_8bit ("./test/assets/16bit/source", "./test/assets/16bit/destination")
  let eightBit = code.readFileBytes("8bit_testdata16b.wav", "./test/assets/16bit/destination")
  let goodEightBit = code.readFileBytes("8bit_sample.wav", "./test/assets/16bit")
  //compare file contents as buffers
  expect(goodEightBit.equals(eightBit)).toBe(true)
  //clean up
  //fs.rmSync("./test/assets/16bit/destination/8bit_testdata16b.wav")

});

test('extractWavesamples', () => {

  //call public function instead . compare resulting file contents. add test files to this directory.
  allTools.extractWavesamples ("./test/assets/mirage_images/source", "./test/assets/mirage_images/destination")
  let soundFile = code.readFileBytes("8bit_testdata16b.wav", "./test/assets/mirage_images/destination")
  let goodSound = code.readFileBytes("8bit_sample.wav", "./test/assets/mirage_images")
  //compare file contents as buffers
  throw "not implemented"
  //clean up
  //fs.rmSync("./test/assets/16bit/destination/*.wav")

});
