'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _nodeWatch = require('node-watch');

var _nodeWatch2 = _interopRequireDefault(_nodeWatch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var clients = [];
var currentVersion = new Date().getTime();

function getCurrentVersion() {
  return currentVersion + '';
}

function setCurrentVersion() {
  currentVersion++;
  return currentVersion + '';
}

function scriptTemplate(host, port) {
  var functionName = 'initWebsocket' + getCurrentVersion();
  return '<script>\n    var historyVersion = null;\n    function ' + functionName + '() {\n      var ws = new window.WebSocket(\'ws://' + host + ':' + port + '\')\n      var storeKey = "auto_reload_current_version"\n      ws.onmessage = function(message) {\n        var currentVersion = message.data\n        if (historyVersion && historyVersion != currentVersion) {\n          location.reload()\n        } else {\n          historyVersion = currentVersion\n        }\n      }\n      ws.onclose = function() {\n        setTimeout(() => { ' + functionName + '() }, 300)\n      }\n    }\n    ' + functionName + '()\n  </script>\n  ';
}

function sendToAll() {
  clients.forEach(function (ws) {
    if (ws.readyState === 1) ws.send(getCurrentVersion());
  });
}

function createWs(port) {
  var wsServer = _ws2.default.Server({ port: port });
  console.log('[auto-reload] open websocket port:', port);
  wsServer.on('connection', function (ws) {
    clients.push(ws);
    ws.send(getCurrentVersion());
    ws.on('close', function () {
      clients.splice(clients.findIndex(function (item) {
        return item === ws;
      }), 1);
    });
  });
}

exports.default = function (app, _ref) {
  var _ref$dir = _ref.dir,
      dir = _ref$dir === undefined ? process.cwd() : _ref$dir,
      _ref$port = _ref.port,
      port = _ref$port === undefined ? 39999 : _ref$port,
      _ref$suffix = _ref.suffix,
      suffix = _ref$suffix === undefined ? [] : _ref$suffix,
      _ref$host = _ref.host,
      host = _ref$host === undefined ? 'localhost' : _ref$host;

  if (!app) throw Error('app can not be null');
  createWs(port);
  if (suffix.length) {
    (0, _nodeWatch2.default)(dir, function (filename) {
      suffix.forEach(function (s) {
        if (filename.endsWith(s)) {
          setCurrentVersion();
          sendToAll();
          return false;
        }
      });
    });
    console.log('[autu-reload] on those file changed: ', dir, suffix);
  }
  return function (req, res, next) {
    res.render = function (path, options, done) {
      app.render(path, _extends({ locals: app.locals }, options), function (err, str) {
        var send = str + scriptTemplate(host, port);
        if (typeof done === 'function') {
          done(err, str);
        }
        res.send(send);
      });
    };
    next();
  };
};