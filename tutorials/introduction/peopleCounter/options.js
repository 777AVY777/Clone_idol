/*
 *  IDOL People Counter Server options.
 */

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//  d e p e n d e n c i e s
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var path = require('path');

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//  v a r i a b l e s
//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var serverName = 'peopleCounter';

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//  p u b l i c
//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {

  // server
  serverName: serverName,
  listener: {
    host: '127.0.0.1',
    port: 4000
  },
  files: {
    log: path.resolve(serverName + '.log')
  },
  checkProgressIntervalMSec: 3000,

	// server dependencies
	mediaserver: {
    host: '127.0.0.1',
    port: 14000
  },

	// ingest
  /* WEBCAM */
  source       : 'video=HP HD Camera',
  isVideoFile  : false,
  isDevice     : true,

  /* STREAM */
  // source       : 'http://host:port/channel.m3u8',
  // isVideoFile  : false,
  // isDevice     : false,

  /* VIDEO FILE */
  // source       : "C:\\video\\clip.mp4",
  // isVideoFile  : true,
  // isDevice     : false,

	// processing
	cfgFile : path.resolve(serverName + '.tmpl.cfg'),

	// analysis
  sampleInterval : 200,       // milliseconds between analysed frames
  numParallel    : 2,         // number of video frames to process in parallel.  Requires one CPU core for each.
  minSize        : 100,       // pixel width
  colorAnalysis  : true,      // set to 'true' to activate, aiming to reduce false detections
  detectTilted   : false,     // set to 'true' to activate
  faceDirection  : 'front',   // 'front' or 'any'
  orientation    : 'upright', // 'upright' or 'any'
  region: {
    enabled : true,    // set to 'true' to activate
    left    : 50,
    top     : 50,
    width   : 50,
    height  : 50,
    unit    : 'percent' // 'percent' or 'pixel'
  }
}
