import ws from 'ws'
import watch from 'node-watch'

let clients = []
let currentVersion  = new Date().getTime()

function getCurrentVersion () {
  return currentVersion + ''
}

function setCurrentVersion() {
  currentVersion ++
  return currentVersion + ''
}

function scriptTemplate (host, port) {
  let functionName = `initWebsocket${getCurrentVersion()}`
  return `<script>
    var historyVersion = null;
    function ${functionName}() {
      var ws = new window.WebSocket('ws://${host}:${port}')
      var storeKey = "auto_reload_current_version"
      ws.onmessage = function(message) {
        var currentVersion = message.data
        if (historyVersion && historyVersion != currentVersion) {
          location.reload()
        } else {
          historyVersion = currentVersion
        }
      }
      ws.onclose = function() {
        setTimeout(() => { ${functionName}() }, 300)
      }
    }
    ${functionName}()
  </script>
  `
}

function sendToAll() {
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(getCurrentVersion())
  })
}

function createWs(port) {
  const wsServer = ws.Server({ port: port })
  console.log('[auto-reload] open websocket port:', port)
  wsServer.on('connection', ws => {
    clients.push(ws)
    ws.send(getCurrentVersion())
    ws.on('close', () => {
      clients.splice(clients.findIndex(item => item === ws), 1)
    })
  })
}

export default (app, {dir = process.cwd(),port = 39999, suffix = [], host = 'localhost'}) => {
  if (!app) throw Error('app can not be null')
  createWs(port)
  if (suffix.length) {
    watch(dir, filename => {
      suffix.forEach(s => {
        if (filename.endsWith(s)) {
          setCurrentVersion()
          sendToAll()
          return false
        }
      })
    })
    console.log('[autu-reload] on those file changed: ', dir, suffix)
  }
  return (req, res, next) => {
    res.render = (path, options, done) => {
      app.render(path,
        { locals: app.locals, ...options},
        (err, str) => {
          let send = str + scriptTemplate(host, port)
          if (typeof done === 'function') {
            done(err, str)
          }
          res.send(send)
        }
      )
    }
    next()
  }
}
