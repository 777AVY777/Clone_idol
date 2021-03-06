# Surveillance analysis

Media Server includes a general purpose *Object Class Recognition* analysis engine, which can be trained to detect and track objects of almost any class.  The most common classes used for CCTV surveillance include people, cars, buses and bicycles and IDOL provides out-of-the-box training for these classes. Media Server also allows you to train your own. 

Alert rules can be built to analyse the location and movement of these detected objects to trigger alerts for multiple security use cases, such as:

- People counting
- Loitering
- Restricted area access
- Wrong way driving
- Illegal turning
- *and many more*.

We will:

1. use the Media Server GUI to import pre-trained models to enable recognition of common surveillance objects,
1. run a process action to create a video with overlayed tracking information for people and vehicles, and
1. watch a demo video showing how to use tripwires to alert of vehicles based on their direction of travel.

This guide assumes you have already completed the [introductory tutorial](../../README.md#introduction).

<!-- TOC -->

- [Surveillance analysis](#surveillance-analysis)
  - [Setup](#setup)
    - [Train object class recognition](#train-object-class-recognition)
      - [Enabled modules](#enabled-modules)
      - [Licensed channels](#licensed-channels)
      - [Pre-trained models](#pre-trained-models)
  - [Process configuration](#process-configuration)
  - [Run a process configuration](#run-a-process-configuration)
  - [Build configurations in the GUI](#build-configurations-in-the-gui)
  - [Next steps](#next-steps)

<!-- /TOC -->

## Setup

### Train object class recognition

Media Server must be licensed for visual analytics, as described in the [introductory tutorial](../../introduction/PART_I.md#enabling-analytics).  To reconfigure Media Server you must edit your `mediaserver.cfg` file.

#### Enabled modules

The `Modules` section is where we list the engines that will be available to Media Server on startup.  Ensure that this list contains the module `objectclassrecognition`:

```ini
[Modules]
Enable=...,objectclassrecognition,...
```

#### Licensed channels

*Reminder*: The `Channels` section is where we instruct Media Server to request license seats from License Server.  Media Server has four license *flavours*:

1. Audio
1. Surveillance
1. Visual
1. Video Management

To enable *Object Class Recognition* for this tutorial, you need to enable at least one channel of either *Surveillance* or *Visual*:

```ini
[Channels]
...
VisualChannels=1
```

> *N.B.1* A *Surveillance* type license only allows you to load the out-of-the-box "Surveillance" objects training pack.  For other training packs - and to build your own models - you will require a *Visual* type license.

> *N.B.2* For any changes you make in `mediaserver.cfg` to take effect you must restart Media Server.

#### Pre-trained models

Pre-trained *Object Class Recognition* recognizers (as well as *Image Classification* classifiers) are distributed separately from the main Media Server installer.  To obtain the training pack:

- Return to the [eSoftware/Partner portal](https://pdapi-web-pro.microfocus.com/evalportal/index.do).
- Under *Product Center*, select *IDOL* to view available software.  Select a Media Server license type, *e.g.* *IDOL Surveillance Analytics SW*, then complete the form to gain access, then:
    1. go to the *Get Software* tab
    1. download and extract the training pack `MediaServerPretrainedModels_12.8.0_COMMON.zip`

- Next, to load the surveillance recognizer, open the Media Server GUI at [`/action=gui`](http://127.0.0.1:14000/a=gui#/train/objectClassRec(tool:select)) then follow these steps:

    1. in the left column, click `Import`
    1. navigate to your extracted training pack and select `ObjectClassRecognizer_Gen2_Surveillance.dat`

        ![select-pretrained-recognizer](./figs/select-pretrained-recognizer.png)

    1. a notification will pop-up to tell you the model is uploading, then processing:

        ![processing-pretrained-recognizer](./figs/processing-pretrained-recognizer.png)

    1. (__*Important!*__) once imported, rename the recognizer to "surveillance":

        ![rename-pretrained-recognizer](./figs/rename-pretrained-recognizer.png)

> *N.B.* You have imported six classes: bicycle, bus, car, motorcycle, person and truck.  Each one contains metadata fields defining the expected real-world object dimensions.  These scales turn all detected objects into "standard candles", enabling the camera perspective to be estimated by the [Perspective](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Utilities/Perspective/_Perspective.htm) engine.

## Process configuration

Media Server configurations for Surveillance combine the base *Object Class Recognition* engine, which finds and tracks the objects, with one or more *Alert* and *Utility* engines to define scenario-based rules.  These engines are:

- [Path Alert](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Analysis/AlertPath/_AlertPath.htm): Generates an alert when an object follows a specified path through the scene.
- [Region Alert](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Analysis/AlertRegion/_AlertRegion.htm): Generates an alert when an object is present within a specified region for a specified amount of time.
- [Stationary Alert](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Analysis/AlertStationary/_AlertStationary.htm): Generates an alert when an object is stationary for a specified amount of time.
- [Tripwire Alert](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Analysis/AlertTripwire/_AlertTripWires.htm): Generates an alert when an object crosses a tripwire.
- [Traffic Lights](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Analysis/TrafficLight/_TrafficLight.htm): Determines the state of traffic lights, so that you can detect vehicles failing to stop for a red light.
- [Scene Filter](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Utilities/SceneFilter/_SceneFilter.htm): Filters out records, and therefore stops analysis, when a PTZ-capable CCTV camera has been moved away from a trained scene by the operator.
- [Perspective](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Utilities/Perspective/_Perspective.htm): Combines sizes and movement of people, buses, cars, *etc.* to estimate the perspective from which the camera views the scene. This allows Media Server to convert a position in a video frame into real-world 3D coordinates.
- [Count](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Utilities/Count/_Count.htm): Counts the number of objects that are present within the scene or a specified region of the scene.
- [Heatmap](https://www.microfocus.com/documentation/idol/IDOL_12_8/MediaServer_12.8_Documentation/Help/index.html#Configuration/Utilities/Heatmap/_Heatmap.htm): Creates an image that shows the paths of objects through the scene and identifies areas with the most activity. As objects move through the same part of the scene, their paths overlap and the heatmap turns from blue, to green, and then to red.

Configuration files combining these engines can quickly become complicated to write by hand; therefore, the Media Server GUI has been enhanced to add a *Surveillance Configuration* page, which allows you to set up most CCTV surveillance use cases with just a few clicks.

<details><summary>More on Alert engines.</summary>

Alert engines introduce additional track types over and above those discussed in the [introductory tutorial](../../introduction/PART_I.md#track-types).  Their behavior varies slightly based on the Alert type.  For a *Region* type alert, these are:

Name | Description
--- | ---
Data | Contains one record for each object that remains within the region for longer than MinimumTime, for each video frame.
Result | Contains one record for each object that remains within the region for longer than MinimumTime. If an object moves in and out of the region several times, Media Server can produce several results with the same ID.
ResultWithSource | The same as the Result track, but each record also includes the *best* source frame.
Start | The same as the Data track, except it contains only the first record of each event.
End | The same as the Data track, except it contains only the last record of each event.
Alert | The same as the Result track, except that records are created as soon as the object meets the minimum time requirement, rather than when the object exits the region.
AlertWithSource | The same as the Alert track, but each record also includes the source frame.

</details>

## Run a process configuration

You will use an example configuration to generate a video clip with overlays for each tracked person and vehicle in a test video.  You can look at the the included config file `Overlay_VideoTracking.cfg` in detail to get a sense of the process.

Paste the following parameters into [`test-action`](http://localhost:14000/a=admin#page/console/test-action) (remembering to update the path to your local copy of this repository and test video `pets2009.mp4`):

```url
action=process&source=C:/MicroFocus/idol-rich-mnow edia-tutorials/tutorials/showcase/surveillance/pets2009.mp4&configPath=C:/MicroFocus/idol-rich-media-tutorials/tutorials/showcase/surveillance/Overlay_VideoTracking.cfg
```

Click `Test Action` to start processing.

To review the resulting video clip, go to `output/surveillance`:

![tracking](./figs/tracking.png)

## Build configurations in the GUI

Please watch this demo video from IDOL's YouTube playlist to see the easy setup process for tracking vehicles in the road scene:

[![surveillance-training](https://img.youtube.com/vi/XjKjIxlKy9I/2.jpg)](https://www.youtube.com/watch?v=XjKjIxlKy9I&list=PLlUdEXI83_Xoq5Fe2iUnY8fjV9PuX61FA)

Now have a go yourself - it's easy!

## Next steps

Why not try more tutorials to explore some of the other analytics available in Media Server, linked from the [main page](../../README.md).
