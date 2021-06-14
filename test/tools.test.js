//const tools = require('../app/main/tools.js');
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

  let testData = "238746385768623568356342"
  let results = "5475"
  let eightBit= code.convert_32bf_to_8bit(testData)
  expect(eightBit).toBe(results)
});
