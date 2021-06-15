const fs = require ("fs")
const {allTools, code} = require('../app/main/tools.js');

//first argument is the test name, second is a function to run. Uses 'expect' like 'assert'.
test('remove header from byte array', () => {
  let testData = Buffer.alloc(200)
  //100 byte header
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
  //19 files and directories in root of project
  expect(list.length).toBe(19)
});

test('convert_32bf_to_8bit', () => {

  //call public function instead . compare resulting file contents. add test files to this directory.
  allTools.convert32_to_8bit ("./test/assets/source", "./test/assets/destination")
  let eightBit = code.readFileBytes("8bit_Wave 03.wav", "./test/assets/destination")
  let goodEightBit = code.readFileBytes("Wave_03_8bit.wav", "./test/assets")
  //compare file contents as buffers
  expect(goodEightBit.equals(eightBit)).toBe(true)
  //clean up
  fs.rmSync("./test/assets/destination/8bit_Wave 03.wav")

});
