import ws from 'ws'
import watch from 'node-watch'

let clients = []
let currentVersion  = new Date().getTime()

function scriptTemplate (host, port) {
  let functionName = `initWebsocket${currentVersion}`
  return
  `<script>
    function ${functionName}() {
      var ws = new window.WebSocket('ws://${host}:${port}')
      var storeKey = "auto_reload_current_version"
      ws.onmessage = ({ data }) => {
        var currentVersion = data
        var localVersion = localStorage.getItem(storeKey)
        if (currentVersion !== localVersion) {
          localStorage.setItem(storeKey, currentVersion)
          location.reload()
        }
      }
      ws.onclose = () => {
        setTimeout(() => { ${functionName}() }, 300)
      }
    }
    ${functionName}()
  </script>
  `
}

function sendToAll() {
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(currentVersion)
  })
}

function createWs(port) {
  const wsServer = ws.Server({ port: port })
  wsServer.on('connection', ws => {
    clients.push(ws)
    ws.send(currentVersion)
    ws.on('close', () => {
      clients.splice(clients.findIndex(item => item === ws), 1)
    })
  })
}

export default ({port, app, watchs = [], host = 'localhost'}) => {
  createWs(port)
  if (watchs.length) {
    watch('./', filename => {
        watchs.forEach(prefix => {
          if (filename.endsWith(prefix)) {
            currentVersion = new Date().getTime()
            sendToAll()
            return false
          }
        })
    })
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
