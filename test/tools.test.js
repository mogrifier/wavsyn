const tools = require('../app/main/tools.js');


//first argument is the test name, second is a function to run. Uses 'expect' like 'assert'.
test('remove header from byte array', () => {
  let testData = Buffer.alloc(200)
  //100 byte header
  expect(tools.removeWaveHeader(testData, 100).length).toBe(100)
  //default 44 byte header
  expect(tools.removeWaveHeader(testData).length).toBe(156)
});