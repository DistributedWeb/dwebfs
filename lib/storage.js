const raf = require('random-access-file')
const Corestore = require('dwebx')

module.exports = function defaultCorestore (storage, opts) {
  if (isCorestore(storage)) return storage
  if (typeof storage === 'function') {
    var factory = path => storage(path)
  } else if (typeof storage === 'string') {
    factory = path => raf(storage + '/' + path)
  }
  return new Corestore(factory, opts)
}

function isCorestore (storage) {
  return storage.default && storage.get && storage.replicate && storage.close
}
