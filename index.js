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

function scriptTemplate(host, port) {
  var functionName = 'initWebsocket' + currentVersion;
  return;
  '<script>\n    function ' + functionName + '() {\n      var ws = new window.WebSocket(\'ws://' + host + ':' + port + '\')\n      var storeKey = "auto_reload_current_version"\n      ws.onmessage = ({ data }) => {\n        var currentVersion = data\n        var localVersion = localStorage.getItem(storeKey)\n        if (currentVersion !== localVersion) {\n          localStorage.setItem(storeKey, currentVersion)\n          location.reload()\n        }\n      }\n      ws.onclose = () => {\n        setTimeout(() => { ' + functionName + '() }, 300)\n      }\n    }\n    ' + functionName + '()\n  </script>\n  ';
}

function sendToAll() {
  clients.forEach(function (ws) {
    if (ws.readyState === 1) ws.send(currentVersion);
  });
}

function createWs(port) {
  var wsServer = _ws2.default.Server({ port: port });
  wsServer.on('connection', function (ws) {
    clients.push(ws);
    ws.send(currentVersion);
    ws.on('close', function () {
      clients.splice(clients.findIndex(function (item) {
        return item === ws;
      }), 1);
    });
  });
}

exports.default = function (_ref) {
  var port = _ref.port,
      app = _ref.app,
      _ref$watchs = _ref.watchs,
      watchs = _ref$watchs === undefined ? [] : _ref$watchs,
      _ref$host = _ref.host,
      host = _ref$host === undefined ? 'localhost' : _ref$host;

  createWs(port);
  if (watchs.length) {
    (0, _nodeWatch2.default)('./', function (filename) {
      watchs.forEach(function (prefix) {
        if (filename.endsWith(prefix)) {
          currentVersion = new Date().getTime();
          sendToAll();
          return false;
        }
      });
    });
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