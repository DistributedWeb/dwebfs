var ram = require('random-access-memory')
var dwebfs = require('../../')

module.exports = function (key, opts) {
  if (key && !(key instanceof Buffer)) {
    opts = key
    key = null
  }
  return dwebfs((opts && opts.dwebx) || ram, key, opts)
}
