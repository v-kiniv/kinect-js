import EventEmitter from 'events';

class Kinect extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.socket = null;
    this.timer = null;
    this._address = '127.0.0.1';
    this.sensor = {
      available: true,
      trackedBodies: 0
    };

    this.on('newListener', event => this._handleNewListener(event));
    this.on('removeListener', event => this._handleRemoveListener(event));
  }

  get address() {
    return this._address;
  }

  set address(newAddress) {
    this._address = newAddress;
  }

  connect(address) {
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

    this.socket.onopen = () => {
      clearInterval(this.timer);
      this.timer = null;

      this.connected = true;
      this._updateSessionOptions();
      this._updateState();
    };

    this.socket.onclose = () => {
      if (this.socket.readyState === WebSocket.OPEN) {
        // Previous connection closed.
        return;
      }

      this.connected = false;
      this.sensor.available = false;
      this.sensor.trackedBodies = 0;
      this._updateState();

      this.socket.close();
      this.socket = null;

      this.timer = setTimeout(() => {
        this.connect();
      }, 1000);

    };

    this.socket.onmessage = msg => {
      if (typeof msg.data === 'string') {
        var event = JSON.parse(msg.data);

        if (event.type === 'state') {
          this.sensor.available = event.state.available;
          this.sensor.trackedBodies = event.state.trackedBodies;
          this._updateState();
        }
        else if (event.type === 'bodies') {
          var bodies = [];
          event.bodies.forEach(compactBody => {
            bodies.push(new Body(compactBody));
          });
          this.emit(event.type, { type: event.type, bodies: bodies });
        }
        else {
          this.emit(event.type, event);
        }
      }
      else if (msg.data instanceof ArrayBuffer) {
        this._processBlob(msg.data);
      }
    };
  }

  /* Private methods */
  _handleNewListener(event) {
    this.lastAdded = event;
    this._updateSessionOptions();
  }

  _handleRemoveListener(event) {
    this.lastRemoved = event;
    this._updateSessionOptions();
  }

  _sendServerEvent(eventType, data) {
    var event = { Type: eventType, Data: JSON.stringify(data) };
    this.socket.send(JSON.stringify(event));
  }

  _updateState() {
    var state = {
      'connected': this.connected,
      'available': this.sensor.available,
      'trackedBodies': this.sensor.trackedBodies
    };
    this.emit('state', state);
  }

  _listenersCount(event) {
    let count = this.listenerCount(event);
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

  _updateSessionOptions() {
    var config = {};
    config.GestureEvents = this._listenersCount('gesture') > 0;
    config.BodyEvents = this._listenersCount('bodies') > 0;
    config.DepthEvents = this._listenersCount('depth') > 0;

    if (this.connected) {
      this._sendServerEvent('SessionConfig', config);
    }
  }

  _processBlob(data) {
    var ba = new Uint16Array(data);

    let streamType = ba[0];
    if (streamType === Kinect.StreamType.Depth) {
      let frameDesc = {width: ba[1], height: ba[2], minDistance: ba[3], maxDistance: ba[4]};
      this.emit('depth', new Uint16Array(data, 10), frameDesc);
    }

  }
}

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

class Body {
  constructor(compactBody) {
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

    compactBody.JN.forEach((compactJoint, type) => {
      body.skeleton[Kinect.JointType[type]] = new Joint(compactJoint);
    });
  }
}

class Joint {
  constructor(compactJoint) {
    this.pos = compactJoint.P;
    this.orient = compactJoint.O;
    this.state = Kinect.TrackingState[compactJoint.S];
  }
}

export default new Kinect();
