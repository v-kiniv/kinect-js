'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Kinect = function (_EventEmitter) {
  _inherits(Kinect, _EventEmitter);

  function Kinect() {
    _classCallCheck(this, Kinect);

    var _this = _possibleConstructorReturn(this, (Kinect.__proto__ || Object.getPrototypeOf(Kinect)).call(this));

    _this._handleNewListener = function (event) {
      _this.lastAdded = event;
      _this._updateSessionOptions();
    };

    _this._handleRemoveListener = function (event) {
      _this.lastRemoved = event;
      _this._updateSessionOptions();
    };

    _this.connected = false;
    _this.socket = null;
    _this.timer = null;
    _this.address = '127.0.0.1';
    _this.sensor = {
      available: true,
      trackedBodies: 0
    };

    _this.on('newListener', _this._handleNewListener);
    _this.on('removeListener', _this._handleRemoveListener);
    return _this;
  }

  _createClass(Kinect, [{
    key: 'connect',
    value: function connect(address, secure) {
      var _this2 = this;

      if (address !== undefined) {
        this.address = address;
      }
      if (secure === undefined) {
        secure = true;
      }
      if (this.socket !== null) {
        this.socket.close();
      }

      this.socket = new WebSocket((secure ? 'wss' : 'ws') + '://' + this.address + ':8181');
      this.socket.binaryType = 'arraybuffer';

      this.lastAdded = null;
      this.lastRemoved = null;

      this.socket.onopen = function () {
        clearTimeout(_this2.timer);
        _this2.timer = null;

        _this2.connected = true;
        _this2._updateSessionOptions();
        _this2._updateState();
      };

      this.socket.onclose = function () {
        if (_this2.socket.readyState === WebSocket.OPEN) {
          // Previous connection closed.
          return;
        }

        _this2.close();

        _this2.timer = setTimeout(function () {
          _this2.connect();
        }, 1000);
      };

      this.socket.onmessage = function (msg) {
        if (typeof msg.data === 'string') {
          var event = JSON.parse(msg.data);

          switch (event.type) {
            case 'state':
              _this2._handleStateEvent(event);
              break;
            case 'bodies':
              _this2._handleBodiesEvent(event);
              break;
            case 'gesture':
              _this2._handleGestureEvent(event);
              break;
            default:
              break;
          }
        } else if (msg.data instanceof ArrayBuffer) {
          _this2._handleStreamEvent(msg.data);
        }
      };
    }
  }, {
    key: 'close',
    value: function close() {
      this.connected = false;
      this.sensor.available = false;
      this.sensor.trackedBodies = 0;
      this._updateState();

      if (this.socket !== null) {
        this.socket.onmessage = null;
        this.socket.onclose = null;
        this.socket.close();
        this.socket = null;
      }
    }

    /* Private methods */

  }, {
    key: '_sendServerEvent',
    value: function _sendServerEvent(eventType, data) {
      var event = { Type: eventType, Data: JSON.stringify(data) };
      this.socket.send(JSON.stringify(event));
    }
  }, {
    key: '_updateState',
    value: function _updateState() {
      var state = {
        connected: this.connected,
        available: this.sensor.available,
        trackedBodies: this.sensor.trackedBodies
      };
      this.emit('state', state);
    }
  }, {
    key: '_listenersCount',
    value: function _listenersCount(event) {
      var count = this.listenerCount(event);
      if (this.lastAdded !== null && event === this.lastAdded) {
        count++;
        this.lastAdded = null;
      }
      if (this.lastRemoved !== null && event === this.lastAdded) {
        count--;
        this.lastRemoved = null;
      }
      return count;
    }
  }, {
    key: '_updateSessionOptions',
    value: function _updateSessionOptions() {
      var config = {
        GestureEvents: this._listenersCount('gesture') > 0,
        BodyEvents: this._listenersCount('bodies') > 0,
        DepthEvents: this._listenersCount('depth') > 0
      };

      if (this.connected) {
        this._sendServerEvent('SessionConfig', config);
      }
    }

    /* Server event handlers */

  }, {
    key: '_handleStateEvent',
    value: function _handleStateEvent(event) {
      this.sensor.available = event.state.available;
      this.sensor.trackedBodies = event.state.trackedBodies;
      this._updateState();
    }
  }, {
    key: '_handleBodiesEvent',
    value: function _handleBodiesEvent(event) {
      var bodies = [];
      for (var i = 0; i < event.bodies.length; i++) {
        bodies.push(new Body(event.bodies[i]));
      }
      this.emit('bodies', bodies, event.floorClipPlane);
    }
  }, {
    key: '_handleGestureEvent',
    value: function _handleGestureEvent(event) {
      var gesture = event.gesture,
          body = event.body;

      this.emit('gesture', gesture, body);
    }
  }, {
    key: '_handleStreamEvent',
    value: function _handleStreamEvent(data) {
      var desc = new Uint16Array(data, 0, 10);

      if (desc[0] === Kinect.StreamType.Depth) {
        var frameDesc = { width: desc[1], height: desc[2], minDistance: desc[3], maxDistance: desc[4] };
        this.emit('depth', new Uint16Array(data, 10), frameDesc);
      }
    }
  }]);

  return Kinect;
}(_events2.default);

Kinect.StreamType = Object.freeze({
  'IR': 0,
  'Depth': 1,
  'Color': 2
});

Kinect.JointType = Object.freeze({
  0: 'SpineBase',
  1: 'SpineMid',
  2: 'Neck',
  3: 'Head',
  4: 'ShoulderLeft',
  5: 'ElbowLeft',
  6: 'WristLeft',
  7: 'HandLeft',
  8: 'ShoulderRight',
  9: 'ElbowRight',
  10: 'WristRight',
  11: 'HandRight',
  12: 'HipLeft',
  13: 'KneeLeft',
  14: 'AnkleLeft',
  15: 'FootLeft',
  16: 'HipRight',
  17: 'KneeRight',
  18: 'AnkleRight',
  19: 'FootRight',
  20: 'SpineShoulder',
  21: 'HandTipLeft',
  22: 'ThumbLeft',
  23: 'HandTipRight',
  24: 'ThumbRight'
});

Kinect.HandState = Object.freeze({
  0: 'Unknown',
  1: 'NotTracked',
  2: 'Open',
  3: 'Closed',
  4: 'Lasso'
});

Kinect.TrackingConfidence = Object.freeze({
  0: 'Hight',
  1: 'Low'
});

Kinect.TrackingState = Object.freeze({
  0: 'NotTracked',
  1: 'Inferred',
  2: 'Tracked'
});

var Body = function Body(compactBody) {
  _classCallCheck(this, Body);

  this.trackingId = compactBody.TI;
  this.isClosest = compactBody.IC;
  this.handLeftConfidence = Kinect.TrackingConfidence[compactBody.HLC];
  this.handLeftState = Kinect.HandState[compactBody.HLS];
  this.handRightConfidence = Kinect.TrackingConfidence[compactBody.HRC];
  this.handRightState = Kinect.HandState[compactBody.HRS];
  this.leanTrackingState = Kinect.TrackingState[compactBody.LTS];
  this.lean = compactBody.LN;
  this.skeleton = {};

  for (var i = 0; i < compactBody.JN.length; i++) {
    this.skeleton[Kinect.JointType[i]] = new Joint(compactBody.JN[i]);
  }
};

var Joint = function Joint(compactJoint) {
  _classCallCheck(this, Joint);

  this.pos = compactJoint.P;
  this.orient = compactJoint.O;
  this.state = Kinect.TrackingState[compactJoint.S];
};

exports.default = new Kinect();