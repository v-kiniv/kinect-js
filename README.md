# kinect.js
It is a communication bridge between Kinect and Web. 
kinect.js receive data from Kinect through Host Application(Server) deployed on Windows machine.
The server listens for incoming connections on default `8181` port on all interfaces.

# Setup
Include kinect.js library:
```
#!html

<script type="text/javascript" src="../src/kinect.js"></script>
```

Create client instance and call connect method:
```
#!js
var kinect = new Kinect();
kinect.connect(); // 127.0.0.1 by default
```
***
To be able to use helper module that provide connection state monitor, include helper.js:
```

#!html

<script type="text/javascript" src="../src/helper.js"></script>
```
Add state view container to body:
```
#!html
<body>
<div id="k_state_view" src="../assets/state_view.html"></div>
<!-- ... -->
</body>
```

Pass client instance to KinectHelper constructor:
```
#!js
var kinect = new Kinect();
var kinect_helper = new KinectHelper(kinect);
kinect.connect("192.168.0.1");
```

# Events

| Type         | Description
| ------------ | ------------------
| [`state`](#markdown-header-state-event)     | Connection or sensor state has changed.
| [`gesture`](#markdown-header-gesture-event) | Gesture detected.
| [`bodies`](#markdown-header-bodies-event)   | Tracked bodies data updated.

## Event subscription
To start receiving Kinect events, register event listeners:
```
#!js
var kinect = new Kinect();
...
// Listen for gesture events
kinect.addEventListener("gesture", event => {
  if(event.gesture == "Swipe_Left") {
    // Do something
  }
});

// Listen for state events
kinect.addEventListener("state", event => {
  if(event.connected) {
    // Do something
  }
});
```

The server is aware of active event listeners and sends only needed events to the browser. For instance, if you do not need user skeleton data, do not leave empty [`bodies`](#markdown-header-bodies-event) event listener, remove addEventListener statement. You can also unsubscribe from the event at runtime:
```
#!js
kinect.removeEventListener("bodies", func_ref);

```

## State event
### Sample
```
#!json
{
  "connected": true,
  "available": true,
  "trackedBodies": 2
}
```

### Members

| Member  | Description
|---------|-----------
| `connected`     | Client - Host WebSockets connection state.
| `available`     | Host - Kinect sensor connection state.
| `trackedBodies` | Number of bodies tracked by the sensor at the current time.


## Gesture event
### Sample
```
#!json
{
  "gesture": "ThumbUp",
  "body": {
    "isClosest": true,
    "trackingId": 72057594037930130
  }
}
```
### Members

| Member    | Description
|-----------|------------
| `gesture` | Gesture name as stated in gestures database.
| `body`    | Compact version of [`Body`](#markdown-header-body) object.

### Gestures list
Current default database contain basic gestures:

+ `Swipe_Left`
+ `Swipe_Right`
+ `Tap`
+ `HandsUp`
+ `ThumbUp`

> List of gestures above is subject to change as it is related to Kinect gestures database
> used by the host application.

## Bodies event
### Sample
```
#!js
{
  "bodies": [{
          "trackingId": 72057594037928860,
          "isClosest:": true,
          "handLeftConfidence": "High",
          "handLeftState": "Open",
          "handRightConfidence": "High",
          "handRightState": "Lasso",
          "leanTrackingState": "Tracked",
          "lean": {
              "x": 0.0,
              "y": 0.0
          },
          "skeleton": {
            "Head": {
                  "pos": {
                      "x": 0.0,
                      "y": 0.0,
                      "z": 0.0,
                  },
                  "orient": {
                      "w": 0.0,
                      "x": 0.0,
                      "y": 0.0,
                      "z": 0.0,
                  },
                  "state": "Tracked"
              },
              "Neck": {
                  "pos": {
                      "x": 0.0,
                      "y": 0.0,
                      "z": 0.0,
                  },
                  "orient": {
                      "w": 0.0,
                      "x": 0.0,
                      "y": 0.0,
                      "z": 0.0,
                  },
                  "state": "Inferred"
              },
              // ... 25 joints total
          }
      },
      // ... up to 6 bodies total
  ],
  "floorClipPlane": {
     "w": 0.0,
     "x": 0.0,
     "y": 0.0,
     "z": 0.0,
  }
}
```

### Members
| Member  | Description
|---------|------------
| bodies  | Array of [Body](#markdown-header-body) objects, each represent tracked user skeleton.
| floorClipPlane | [Vector4](#markdown-header-vector4) object. Gets the floor clip plane of the body frame in hessian normal form. The (x,y,z) components are a unit vector indicating the normal of the plane, and w is the distance from the plane to the origin in meters. |


# Reference

## Body
###### object

### Properties
| Member              | Type                                                      | Description
|---------------------|-----------------------------------------------------------|---------------------
| trackingId          | long integer                                              | Unique body ID. 
| isClosest           | boolean                                                   | Indicate whenever body is closest to the sensor. 
| handLeftConfidence  | [TrackingConfidence](#markdown-header-trackingconfidence) | Left hand tracking confidence.
| handLeftState       | [HandState](#markdown-header-handstate)                   | Left hand state.
| handRightConfidence | [TrackingConfidence](#markdown-header-trackingconfidence) | Right hand tracking confidence.
| handRightState      | [HandState](#markdown-header-handstate)                   | Right hand state.
| leanTrackingState   | [TrackingState](#markdown-header-trackingstate)           | Lean tracking state.
| lean                | [Point](#markdown-header-point)                           | The lean vector of the body.
| skeleton            | [Skeleton](#markdown-header-skeleton)                     | Array of joints.

## Skeleton
###### object
Represent joint position and orientation.

Member          |	Type						  | Description
----------------|---------------------------------|-------------------------
`AnkleLeft`		| [Joint](#markdown-header-joint) | Left ankle
`AnkleRight`	| [Joint](#markdown-header-joint) | Right ankle
`ElbowLeft`		| [Joint](#markdown-header-joint) | Left elbow
`ElbowRight`	| [Joint](#markdown-header-joint) | Right elbow
`FootLeft`		| [Joint](#markdown-header-joint) | Left foot
`FootRight`		| [Joint](#markdown-header-joint) | Right foot
`HandLeft`		| [Joint](#markdown-header-joint) | Left hand
`HandRight`		| [Joint](#markdown-header-joint) | Right hand
`HandTipLeft`	| [Joint](#markdown-header-joint) | Tip of the left hand
`HandTipRight`| [Joint](#markdown-header-joint) | Tip of the right hand
`Head`			  | [Joint](#markdown-header-joint) | Head
`HipLeft`		  | [Joint](#markdown-header-joint) | Left hip
`HipRight`		| [Joint](#markdown-header-joint) | Right hip
`KneeLeft`		| [Joint](#markdown-header-joint) | Left knee
`KneeRight`		| [Joint](#markdown-header-joint) | Right knee
`Neck`			  | [Joint](#markdown-header-joint) | Neck
`ShoulderLeft`	| [Joint](#markdown-header-joint) | Left shoulder
`ShoulderRight`	| [Joint](#markdown-header-joint) | Right shoulder
`SpineBase`		| [Joint](#markdown-header-joint) | Base of the spine
`SpineMid`		| [Joint](#markdown-header-joint) | Middle of the spine
`SpineShoulder`	| [Joint](#markdown-header-joint) | Spine
`ThumbLeft`		| [Joint](#markdown-header-joint) | Left thumb
`ThumbRight`	| [Joint](#markdown-header-joint) | Right thumb
`WristLeft`		| [Joint](#markdown-header-joint) | Left wrist
`WristRight`	| [Joint](#markdown-header-joint) | Right wrist

## Joint
###### object
Represent joint position and orientation.

Member         | Type                                                    | Description
---------------|---------------------------------------------------------|-------------------
`pos`          | [CameraSpacePoint](#markdown-header-cameraspacepoint)   | Joint position.
`orient`	     | [Vector4](#markdown-header-vector4)                     | Joint orientation.
`state`        | [TrackingState](#markdown-header-trackingstate)         | Joint tracking state.

## Point
###### object
Represents point in 2D space.

Member   | Type   | Description
---------|--------|---------------------
`x`      | double | The x-coordinate.
`y`	     | double | The y-coordinate.

## CameraSpacePoint
###### object
Represents point in camera 3D space.

Camera space refers to the 3D coordinate system used by Kinect. The coordinate system is defined as follows:

- The origin (x=0, y=0, z=0) is located at the center of the IR sensor on Kinect
- X grows to the sensor’s left
- Y grows up (note that this direction is based on the sensor’s tilt)
- Z grows out in the direction the sensor is facing
- 1 unit = 1 meter

Member  | Type   | Description
--------|--------|---------------------
`x`     | double | The X coordinate of the point, in meters.
`y`	    | double | The Y coordinate of the point, in meters.
`z`	    | double | The Z coordinate of the point, in meters.

## Vector4
###### object
The Vector4 structure is a flexible type that is used to represent a four component vector of skeleton or stream (color, depth, infrared) data. This structure is similar to the XMVECTOR structure in the XNA math library.
Represents a 4-element (X,Y,Z,W) vector.

Member  | Type   | Description
--------|--------|---------------------
`x`     | double | The x-coordinate.
`y`	    | double | The y-coordinate.
`z`	    | double | The z-coordinate.
`w`     | double | For the floor plane, the w value is the distance from the plane to the origin.


## HandState
###### enum
Possible hand states.

Value        | Description
-------------|---------------------------
`Closed`     | The hand is closed.
`Lasso`	     | The hand is in the lasso state.
`NotTracked` | Hand state is not tracked.
`Open`       | The hand is open.
`Unknown`    | The state of the hand is unknown.

## TrackingConfidence
###### enum
Value      | Description
-----------|---------------------------
`High`     | Fully tracked.
`Low`	     | Not tracked.

## TrackingState
###### enum
Value          | Description
---------------|---------------------------
`Inferred`     | The joint data is inferred and confidence in the position data is lower than if it were Tracked.
`NotTracked`	 | The joint data is not tracked and no data is known about this joint.
`Tracked`	     | The joint data is being tracked and the data can be trusted.