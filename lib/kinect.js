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

    _this.connected = false;
    _this.socket = null;
    _this.timer = null;
    _this._address = '127.0.0.1';
    _this.sensor = {
      available: true,
      trackedBodies: 0
    };

    _this.on('newListener', function (event) {
      return _this._handleNewListener(event);
    });
    _this.on('removeListener', function (event) {
      return _this._handleRemoveListener(event);
    });
    return _this;
  }

  _createClass(Kinect, [{
    key: 'connect',
    value: function connect(address) {
      var _this2 = this;

      if (address !== undefined) {
        this.address = address;
      }
      if (this.socket !== null) {
        this.socket.close();
      }

      this.socket = new WebSocket('ws://' + this.address + ':8181');
      this.socket.binaryType = 'arraybuffer';

      this.lastAdded = null;
      this.lastRemoved = null;

      this.socket.onopen = function () {
        clearInterval(_this2.timer);
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

        _this2.connected = false;
        _this2.sensor.available = false;
        _this2.sensor.trackedBodies = 0;
        _this2._updateState();

        _this2.socket.close();
        _this2.socket = null;

        _this2.timer = setTimeout(function () {
          _this2.connect();
        }, 1000);
      };

      this.socket.onmessage = function (msg) {
        if (typeof msg.data === 'string') {
          var event = JSON.parse(msg.data);

          if (event.type === 'state') {
            _this2.sensor.available = event.state.available;
            _this2.sensor.trackedBodies = event.state.trackedBodies;
            _this2._updateState();
          } else if (event.type === 'bodies') {
            var bodies = [];
            event.bodies.forEach(function (compactBody) {
              bodies.push(new Body(compactBody));
            });
            _this2.emit(event.type, { type: event.type, bodies: bodies });
          } else {
            _this2.emit(event.type, event);
          }
        } else if (msg.data instanceof ArrayBuffer) {
          _this2._processBlob(msg.data);
        }
      };
    }

    /* Private methods */

  }, {
    key: '_handleNewListener',
    value: function _handleNewListener(event) {
      this.lastAdded = event;
      this._updateSessionOptions();
    }
  }, {
    key: '_handleRemoveListener',
    value: function _handleRemoveListener(event) {
      this.lastRemoved = event;
      this._updateSessionOptions();
    }
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
        'connected': this.connected,
        'available': this.sensor.available,
        'trackedBodies': this.sensor.trackedBodies
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
      var config = {};
      config.GestureEvents = this._listenersCount('gesture') > 0;
      config.BodyEvents = this._listenersCount('bodies') > 0;
      config.DepthEvents = this._listenersCount('depth') > 0;

      if (this.connected) {
        this._sendServerEvent('SessionConfig', config);
      }
    }
  }, {
    key: '_processBlob',
    value: function _processBlob(data) {
      var ba = new Uint16Array(data);

      var streamType = ba[0];
      if (streamType === Kinect.StreamType.Depth) {
        var frameDesc = { width: ba[1], height: ba[2], minDistance: ba[3], maxDistance: ba[4] };
        this.emit('depth', new Uint16Array(data, 10), frameDesc);
      }
    }
  }, {
    key: 'address',
    get: function get() {
      return this._address;
    },
    set: function set(newAddress) {
      this._address = newAddress;
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

  var body = this;

  this.trackingId = compactBody.TI;
  this.isClosest = compactBody.IC;
  this.handLeftConfidence = Kinect.TrackingConfidence[compactBody.HLC];
  this.handLeftState = Kinect.HandState[compactBody.HLS];
  this.handRightConfidence = Kinect.TrackingConfidence[compactBody.HRC];
  this.handRightState = Kinect.HandState[compactBody.HRS];
  this.leanTrackingState = Kinect.TrackingState[compactBody.LTS];
  this.lean = compactBody.LN;
  this.skeleton = {};

  compactBody.JN.forEach(function (compactJoint, type) {
    body.skeleton[Kinect.JointType[type]] = new Joint(compactJoint);
  });
};

var Joint = function Joint(compactJoint) {
  _classCallCheck(this, Joint);

  this.pos = compactJoint.P;
  this.orient = compactJoint.O;
  this.state = Kinect.TrackingState[compactJoint.S];
};

exports.default = new Kinect();