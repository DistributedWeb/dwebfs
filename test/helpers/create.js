var ram = require('random-access-memory')
var dwebfs = require('../../')

module.exports = function (key, opts) {
  return dwebfs(ram, key, opts)
}
