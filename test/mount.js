var test = require('tape')
const ram = require('random-access-memory')
const memdb = require('memdb')
const corestore = require('random-access-corestore')
const Megastore = require('megastore')
var create = require('./helpers/create')

test.only('basic read/write to/from a mount', t => {
  const drive1 = create()
  const drive2 = create()

  const s1 = drive1.replicate({ live: true, encrypt: false })
  s1.pipe(drive2.replicate({ live: true, encrypt: false })).pipe(s1)

  drive2.ready(err => {
    t.error(err, 'no error')
    drive2.writeFile('b', 'hello', err => {
      t.error(err, 'no error')
      drive1.mount('a', drive2.key, err => {
        t.error(err, 'no error')
        setTimeout(() => {
          drive1.readFile('a/b', (err, contents) => {
            t.error(err, 'no error')
            t.same(contents, Buffer.from('hello'))
            t.end()
          })
        }, 5000)
      })
    })
  })
})

test('multiple flat mounts', t => {
  const drive1 = create()
  const drive2 = create()
  const drive3 = create()

  var key1, key2

  replicateAll([drive1, drive2, drive3])

  drive3.ready(err => {
    drive2.ready(err => {
      key1 = drive2.key
      key2 = drive3.key
      onready()
    })
  })

  function onready () {
    drive2.writeFile('a', 'hello', err => {
      t.error(err, 'no error')
      drive3.writeFile('b', 'world', err => {
        t.error(err, 'no error')
        onwrite()
      })
    })
  }

  function onwrite () {
    drive1.mount('a', key1, err => {
      t.error(err, 'no error')
      drive1.mount('b', key2, err => {
        t.error(err, 'no error')
        onmount()
      })
    })
  }

  function onmount () {
    drive1.readFile('a/a', (err, contents) => {
      t.error(err, 'no error')
      t.same(contents, Buffer.from('hello'))
      drive1.readFile('b/b', (err, contents) => {
        t.error(err, 'no error')
        t.same(contents, Buffer.from('world'))
        t.end()
      })
    })
  }
})

test('recursive mounts', async t => {
  var key1, key2
  const drive1 = create()
  const drive2 = create()
  const drive3 = create()

  replicateAll([drive1, drive2, drive3])

  drive3.ready(err => {
    drive2.ready(err => {
      key1 = drive2.key
      key2 = drive3.key
      onready()
    })
  })

  function onready () {
    drive2.writeFile('a', 'hello', err => {
      t.error(err, 'no error')
      drive3.writeFile('b', 'world', err => {
        t.error(err, 'no error')
        console.log('DRIVE 3 KEY:', drive3.key)
        onwrite()
      })
    })
  }

  function onwrite () {
    drive1.mount('a', key1, err => {
      t.error(err, 'no error')
      drive2.mount('b', key2, err => {
        t.error(err, 'no error')
        onmount()
      })
    })
  }

  function onmount () {
    drive1.readFile('a/a', (err, contents) => {
      t.error(err, 'no error')
      t.same(contents, Buffer.from('hello'))
      setTimeout(() => {
        drive1.readFile('a/b/b', (err, contents) => {
          t.error(err, 'no error')
          t.same(contents, Buffer.from('world'))
          t.end()
        })
      }, 2000)
    })
  }
})

test('readdir returns mounts', t => {
  const drive1 = create()
  const drive2 = create()

  const s1 = drive1.replicate({ live: true, encrypt: false })
  s1.pipe(drive2.replicate({ live: true, encrypt: false })).pipe(s1)

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mkdir('b', err => {
      t.error(err, 'no error')
      drive1.mkdir('b/a', err => {
        t.error(err, 'no error')
        drive1.mount('a', drive2.key, err => {
          t.error(err, 'no error')
          drive1.readdir('/', (err, dirs) => {
            t.error(err, 'no error')
            t.same(dirs, ['b', 'a'])
            t.end()
          })
        })
      })
    })
  })
})

test('cross-mount watch', t => {
  const drive1 = create()
  const drive2 = create()

  const s1 = drive1.replicate({ live: true, encrypt: false })
  s1.pipe(drive2.replicate({ live: true, encrypt: false })).pipe(s1)

  var watchEvents = 0

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mount('a', drive2.key, err => {
      t.error(err, 'no error')
      drive1.watch('/', () => {
        if (++watchEvents === 1) t.end()
      })
      drive2.writeFile('a', 'hello', err => {
        t.error(err, 'no error')
      })
    })
  })
})

test('cross-mount symlink', t => {
  const drive1 = create()
  const drive2 = create()

  const s1 = drive1.replicate({ live: true, encrypt: false })
  s1.pipe(drive2.replicate({ live: true, encrypt: false })).pipe(s1)

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mount('a', drive2.key, err => {
      t.error(err, 'no error')
      onmount()
    })
  })

  function onmount () {
    drive2.writeFile('b', 'hello world', err => {
      t.error(err, 'no error')
      drive1.symlink('a/b', 'c', err => {
        t.error(err, 'no error')
        drive1.readFile('c', (err, contents) => {
          t.error(err, 'no error')
          t.same(contents, Buffer.from('hello world'))
          t.end()
        })
      })
    })
  }
})

test('independent corestores do not share write capabilities', t => {
  const drive1 = create()
  const drive2 = create()

  const s1 = drive1.replicate({ live: true, encrypt: false })
  s1.pipe(drive2.replicate({ live: true, encrypt: false })).pipe(s1)

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mount('a', drive2.key, err => {
      t.error(err, 'no error')
      drive1.writeFile('a/b', 'hello', err => {
        t.ok(err)
        drive1.readFile('a/b', (err, contents) => {
          t.ok(err)
          t.end()
        })
      })
    })
  })
})

test('shared corestores will share write capabilities', async t => {
  const megastore = new Megastore(ram, memdb(), false)
  await megastore.ready()

  const cs1 = megastore.get('cs1')
  const cs2 = megastore.get('cs2')

  const drive1 = create({ corestore: cs1 })
  const drive2 = create({ corestore: cs2 })

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mount('a', drive2.key, err => {
      t.error(err, 'no error')
      drive1.writeFile('a/b', 'hello', err => {
        t.error(err, 'no error')
        drive1.readFile('a/b', (err, contents) => {
          t.error(err, 'no error')
          t.same(contents, Buffer.from('hello'))
          drive2.readFile('b', (err, contents) => {
            t.error(err, 'no error')
            t.same(contents, Buffer.from('hello'))
            t.end()
          })
        })
      })
    })
  })
})

test('can mount hypercores', async t => {
  const store = corestore(ram)
  const drive = create({ corestore: store })
  var core = store.get()

  drive.ready(err => {
    t.error(err, 'no error')
    core.ready(err => {
      t.error(err, 'no error')
      core.append('hello', err => {
        t.error(err, 'no error')
        return onappend()
      })
    })
  })

  function onappend () {
    drive.mount('/a', core.key, { hypercore: true }, err => {
      t.error(err, 'no error')
      drive.readFile('/a', (err, contents) => {
        t.error(err, 'no error')
        t.same(contents, Buffer.from('hello'))
        t.end()
      })
    })
  }
})

test('truncate within mount (with shared write capabilities)', async t => {
  const megastore = new Megastore(ram, memdb(), false)
  await megastore.ready()

  const cs1 = megastore.get('cs1')
  const cs2 = megastore.get('cs2')

  const drive1 = create({ corestore: cs1 })
  const drive2 = create({ corestore: cs2 })

  drive2.ready(err => {
    t.error(err, 'no error')
    drive1.mount('a', drive2.key, err => {
      t.error(err, 'no error')
      drive1.writeFile('a/b', 'hello', err => {
        t.error(err, 'no error')
        drive1.truncate('a/b', 1, err => {
          t.error(err, 'no error')
          drive1.readFile('a/b', (err, contents) => {
            t.error(err, 'no error')
            t.same(contents, Buffer.from('h'))
            drive2.readFile('b', (err, contents) => {
              t.error(err, 'no error')
              t.same(contents, Buffer.from('h'))
              t.end()
            })
          })
        })
      })
    })
  })
})


test('versioned mount')
test('watch will unwatch on umount')

function replicateAll (drives) {
  const streams = []
  for (let i = 0; i < drives.length; i++) {
    for (let j = 0; j < drives.length; j++) {
      const source = drives[i]
      const dest = drives[j]
      if (i === j) continue

      const s1 = source.replicate({ live: true, encrypt: false})
      const s2 = dest.replicate({ live: true, encrypt: false })
      streams.push([s1, s2])

      s1.on('data', d => console.log(`${i + 1} STREAM DATA:`, d))
      s2.on('data', d => console.log(`${j + 1} STREAM DATA:`, d))
      s1.pipe(s2).pipe(s1)
    }
  }
  return streams
}