# PART II - More face analytics

We will:

1. chain analytics, *i.e.* use the output of face detection as input to other analytics
1. filter analysis output tracks using event processing to control the input rate to other analytics
1. use the encoding engines to extract images and record video of faces
1. train faces and use the face recognition analysis engine to match them

<!-- TOC -->

- [Analysis chaining](#analysis-chaining)
  - [Controlling event rates](#controlling-event-rates)
  - [Event processing](#event-processing)
  - [Run face and clothing analysis](#run-face-and-clothing-analysis)
- [Transformation and encoding](#transformation-and-encoding)
  - [Run face image encoding](#run-face-image-encoding)
  - [Producing video](#producing-video)
  - [Run blurred faces video encoding](#run-blurred-faces-video-encoding)
- [Alternatives for video encoding](#alternatives-for-video-encoding)
  - [Run MJPEG streaming](#run-mjpeg-streaming)
- [PART III - Face recognition](#part-iii---face-recognition)

<!-- /TOC -->

## Analysis chaining

Once a face has been detected, Media Server can perform further analytics, including gender estimation and clothing color determination.

For example, to enable face demographics analysis on tracked faces, we could include the following configuration lines:

```ini
[Session]
...
Engine1 = FaceDetection
Engine2 = FaceDemographics

...

[FaceDetection]
Type = FaceDetect

[FaceDemographics]
Type = Demographics
Input = FaceDetection.ResultWithSource
```

So we see that the output from one analysis engine is fed to another by setting the `Input` property of the downstream engine to one of the output tracks of the upstream engine.

This is only possible if the data output from the upstream engine contains the information required by the downstream engine, *i.e.* contains the same *data types*.  To list the input and output track data types, use the [`listEngines`](http://127.0.0.1:14000/a=ListEngines) action, which returns, *e.g.* for `FaceDetect` and `Demographics`, the following information:

```xml
<engine>
  <type>FaceDetect</type>
  <input name="Input" type="ImageData"/>
  <output name="Data" type="CustomData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="DataWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="Result" type="CustomData,FaceData,RegionData,UUIDData" isOutput="true"/>
  <output name="ResultWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="Start" type="CustomData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="End" type="CustomData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="SegmentedResult" type="CustomData,FaceData,RegionData,UUIDData" isOutput="true"/>
  <output name="SegmentedResultWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="Event" type="CustomData,UUIDData,TrackingEventData" isOutput="true"/>
</engine>
<engine>
  <type>Demographics</type>
  <input name="Input" type="ImageData,FaceData,RegionData,UUIDData"/>
  <output name="Data" type="CustomData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="DataWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="Result" type="CustomData,FaceData,RegionData,UUIDData" isOutput="true"/>
  <output name="ResultWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
  <output name="SegmentedResult" type="CustomData,FaceData,RegionData,UUIDData" isOutput="true"/>
  <output name="SegmentedResultWithSource" type="CustomData,ImageData,FaceData,RegionData,UUIDData" isOutput="false"/>
</engine>
```

You can see that `Demographics` requires `ImageData`, `FaceData`, `RegionData` and `UUIDData` as inputs.  Hence, in our process configuration we are allowed to pass the `ResultWithSource` output from face detection as input to demographics because it includes all of the required data types (as well as `CustomData`, which is a catch-all term for any analysis-specific properties).

In out next test we will chain the following analytics together:

- Face detection &rarr; Face demographics
- Face detection &rarr; Face state
- Face detection &rarr; Clothing detection &rarr; Color Analysis

### Controlling event rates

So back to running some analytics. We don't want to keep covering the webcam to trigger chained analytics.  To get more frequent results automatically we will tap into the `SegmentedResultWithSource` track to get updates from any ongoing tracks at intervals of `SegmentDuration`.

To enable this, *e.g.* to limit the rate of data for demographics analysis, we could include the following:

```ini
[Session]
...
Engine1 = FaceDetection
Engine2 = FaceDemographics

[FaceDetection]
Type = FaceDetect
SegmentDuration = 5s

[FaceDemographics]
Type = Demographics
Input = FaceDetection.SegmentedResultWithSource
```

### Event processing

As well as limiting the rate of events to deal with, we can also can make additional filters by taking advantage of event processing engines. In this case we will restrict our face analysis only to faces that we detect are looking forwards. This can improve the accuracy of those downstream analytics.

To enable this, *e.g.* for demographics analysis, we could include the following:

```ini
[Session]
...
Engine1 = FaceDetection
Engine2 = FaceForward
Engine3 = FaceDemographics

...

[FaceForward]
Type = Filter
Input = FaceDetection.ResultWithSource
LuaScript = frontalFace.lua

[FaceDemographics]
Type = Demographics
Input = FaceForward.Output
```

*N.B.* Notice that the name of the event processing output track variant is always `Output`.

Many logical operators are available in addition to `Filter`, which include the capability to compare or combine records from multiple tracks. See the [reference guide](https://www.microfocus.com/documentation/idol/IDOL_12_1/MediaServer/Help/index.html#Configuration/ESP/ESP.htm) for more details.

Most of these operators provide additional flexibility through Lua scripting that allow you to create more complex logic.  Media Server ships with a number of example scripts, which can be found in the `configurations/lua` directory.  Here was have used the included `frontalFace.lua` script, which contains the following code

```lua
-- return if face is forward-facing (i.e. non-profile) and mostly within image
function pred(record)
	local oopangle = record.FaceData.outofplaneanglex
	return oopangle ~= 90 and oopangle ~= -90 and record.FaceData.percentageinimage > 95
end
```

, which applies the following additional filters:

1. the angle of the face to the camera must be less than 90 degrees, *i.e.* the face must not be in profile,
1. almost all of the face must be visible in the view of the frame.

If the function `pred()` returns `true`, then this record will be kept, otherwise it will be discarded.

See [tips on Lua scripting](../appendix/Lua_tips.md) for more information.

### Run face and clothing analysis

Copy the `faceAnalysis2.cfg` process configuration file into your `configurations/tutorials` directory as before, then paste the following parameters into [`test-action`](http://127.0.0.1:14000/a=admin#page/console/test-action) (again remembering to update the webcam name from `HP HD Camera` to match yours):

```url
action=process&source=video%3DHP%20HD%20Camera&configName=tutorials/faceAnalysis2
```

Click `Test Action` to start processing.

![clothing-region](./figs/clothing-region.png)

Review the results with [`activity`](http://127.0.0.1:14000/a=activity), then stop processing with [`stop`](http://127.0.0.1:14000/a=queueInfo&queueAction=stop&queueName=process).

## Transformation and encoding

Media Server can encode video, images and audio.  We will now create a configuration to save cropped images of faces detected in your webcam.

To enable cropping and to draw overlays, we could include the following:

```ini
// ======================= Transform ==============================
[Session]
...
Engine1 = FaceDetection
Engine2 = FaceDemographics
Engine3 = FaceCrop
Engine4 = FaceDraw

...

[FaceCrop]
Type = Crop
Input = FaceDetection.ResultWithSource
Border = 15
BorderUnit = Percent

[FaceDraw]
Type = Draw
Input = FaceDemographics.ResultWithSource
LuaScript = draw.lua
```

*N.B.* Lua scripts can be used to provide flexibility.  The included script `draw.lua` sets the overlay color based on the detected gender of the face:

```lua
ResultsProcessor = {
    ...
    colours = { -- colours for each analysis type
        ...
        demographic = {
            male = rgb(255, 128, 0), -- orange
            female = rgb(64, 0, 128), -- purple
            unknown = rgb(128, 128, 128) }, -- grey
        },
        ...
    },
    ...
}
```

To encode these cropped images:

```ini
// ======================= Encoding ===============================
[Session]
...
Engine2 = FaceCrop
Engine3 = FaceDraw
Engine4 = FaceCropEncoder
Engine5 = FaceDrawEncoder

...

[FaceCropEncoder]
Type = ImageEncoder
ImageInput = FaceCrop.Output
OutputPath = output/faces3/%record.startTime.timestamp%_crop.png

[FaceDrawEncoder]
Type = ImageEncoder
ImageInput = FaceDraw.Output
OutputPath = output/faces3/%record.startTime.timestamp%_overlay.png
```

*N.B.* We can access parameter values from the alert record using *macros* to generate the image `OutputPath`.  See the [reference guide](https://www.microfocus.com/documentation/idol/IDOL_12_1/MediaServer/Help/index.html#Configuration/Macros.htm) for details.

### Run face image encoding

Copy the `faceAnalysis3.cfg` process configuration file into `configurations/tutorials` then paste the following parameters into [`test-action`](http://127.0.0.1:14000/a=admin#page/console/test-action) (again remembering to update the webcam name from `HP HD Camera` to match yours):

```url
action=process&source=video%3DHP%20HD%20Camera&configName=tutorials/faceAnalysis3
```

Click `Test Action` to start processing.

Review the results with [`activity`](http://127.0.0.1:14000/a=activity), then open the folder `output/faces3` to see the encoded images. These images will be used in the face recognition module. Images will accumulate, so don't run for too long without stopping.

Stop processing with [`stop`](http://127.0.0.1:14000/a=queueInfo&queueAction=stop&queueName=process).

### Producing video

We will now create a process configuration to save video from your webcam, in which we will blur out any detected faces.

Just as we drew the overlays on images of faces, we will use a transform engine to blur faces in the video frames.  Encoding video introduces the following complications:

1. we must analyse every frame that we want to encode, otherwise we risk missing faces on un-sampled video frames
1. we must combine face detection records for each frame, whether there are zero, one or many faces detected in that frame

Face detection should be run at a sensible frame rate for our laptops.  This analysis rate will restrict the maximum output rate of the encoded video such that all frames can be analysed and combined.

We should therefore restrict the ingest rate of the input stream with an event processing filter:

```ini
[Session]
Engine0 = WebcamIngest
Engine1 = RateLimitedIngest

...

[RateLimitedIngest]
Type = Deduplicate
Input = Default_Image
MinTimeInterval = 200ms
PredicateType = Always
```

As a result, the `FaceDetect` analysis can be configured with unlimited sampling rate by including the following changes:

```ini
[FaceDetection]
Type = FaceDetect
Input = RateLimitedIngest.Output
SampleInterval = 0
```

To combine zero, one or many faces with the rate-limited source video, we will use an event processing `Combine` engine as follows:

```ini
[CombineFaces]
Type = Combine
Input0 = RateLimitedIngest.Output
Input1 = FaceDetection.Data
```

Then to enable blurring of the detected faces, we will include the following:

```ini
[FaceImageBlur]
Type = Blur
Input = CombineFaces.Output
```

Finally, to encode the video to disk (in one minute segments), we will include the following:

```ini
[BlurredFacesVideo]
Type = Mpeg
ImageInput = FaceImageBlur.Output
OutputPath = output/faces4/%currentTime.timestamp%_blur.mp4
UseTempFolder = True
Segment = True
SegmentDuration = 1m
```

### Run blurred faces video encoding

Copy the `faceAnalysis4.cfg` process configuration file into `configurations/tutorials` then paste the following parameters into [`test-action`](http://127.0.0.1:14000/a=admin#page/console/test-action) (again remembering to update the webcam name from `HP HD Camera` to match yours):

```url
action=process&source=video%3DHP%20HD%20Camera&configName=tutorials/faceAnalysis4
```

Click `Test Action` to start processing.

Review the results with [`activity`](http://127.0.0.1:14000/a=activity), then open the folder `output/faces4` to see the encoded videos.  Let this process run for long enough to allow a few `.mp4` files to be generated.

![video-blur](./figs/video-blur.gif)

Stop processing with [`stop`](http://127.0.0.1:14000/a=queueInfo&queueAction=stop&queueName=process).

## Alternatives for video encoding

Media Server offers more options that just encoding video to files:

- (Evidential) Rolling Buffer
- UDP streaming with the MPEG encoder
- MJPEG streaming

The easiest to set up and connect to is the MJPEG option.  To enable that method, you can add the following configuration:

```ini
[DrawnFacesStream]
Type = Mjpeg
ImageInput = FaceImageDraw.Output
Port = 3000
```

### Run MJPEG streaming

Copy the `faceAnalysis5.cfg` process configuration file into `configurations/tutorials` then paste the following parameters into [`test-action`](http://127.0.0.1:14000/a=admin#page/console/test-action) (again remembering to update the webcam name from `HP HD Camera` to match yours):

```url
action=process&source=video%3DHP%20HD%20Camera&configName=tutorials/faceAnalysis5
```

Click `Test Action` to start processing.

Review the results with [`activity`](http://127.0.0.1:14000/a=activity), then open your web browser (tested in Google Chrome) to <http://127.0.0.1:3000/> to watch the stream.

![video-draw](./figs/video-draw.gif)

Stop processing with [`stop`](http://127.0.0.1:14000/a=queueInfo&queueAction=stop&queueName=process).

## PART III - Face recognition

Start [here](PART_III.md).

_*END*_