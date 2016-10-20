import '../../../3p/polyfills';
import {listen} from '../../../src/event-helper';


var windowContextCreated = new Event('windowContextCreated');

window.context = window.context || (function() {
  var SEND_EMBED_STATE = 'send-embed-state';
  var EMBED_STATE = 'embed-state';
  var SEND_EMBED_CONTEXT = 'send-embed-context';
  var EMBED_CONTEXT = 'embed-context';
  var SEND_INTERSECTIONS = 'send-intersections';
  var INTERSECTION = 'intersection';
  var EMBED_SIZE = 'embed-size';

  class AmpContext{
    // Make MessageType string enum
    constructor() {

      /**
       * Event listener to trigger context creation.
       * @private {boolean}
       */
      this.createdEventListener_ = false;

      /** Map message_type keys to boolean whether we should be listening to
       *  that type of message
       *  @private {object}
       */
      this.listenFor = {};

      /** Map message_type keys to callback functions for when we receive
       *  that message
       *  @private {object}
       */
      this.callbackFor = {};

      // Do we want to pass sentinel via hash?  or name attribute?
      var hashMatch = window.location.hash.match(/amp3pSentinel=((\d+)-\d+)/);
      if (hashMatch) {
	// Sentinel has the format of "$windowDepth-$randomNumber".
	this.sentinel = hashMatch[1];
	// Depth is measured from window.top.
	this.depth = Number(hashMatch[2]);
	this.ancestors = [];
	for (let win = window; win && win != win.parent; win = win.parent) {
	  // Add window keeping the top-most one at the front.
	  this.ancestors.unshift(win.parent);
	}
	this.ampWindow = this.ancestors[this.depth];
      } else {
	// I'm broken?  Send ping?
      }
      this.setupEventListener();
      this.setupMetadata();
    }

    /**
     *  Request all of the metadata attributes for context and add them to
     *  the class.
     *  IDEALLY THIS IS PASSED TO IFRAME ALONG WITH SENTINEL
     */
    setupMetadata(){
      // Always register listener before starting handshake
      var windowContext = this;
      this.registerCallback(EMBED_CONTEXT, function(metadata){
	// Any need to verify "correctness" of metadata?
	windowContext.location = metadata.location;
	windowContext.canonicalUrl = metadata.canonicalUrl;
	windowContext.clientId = metadata.clientId;
	windowContext.pageViewId = metadata.pageViewId;
	windowContext.sentinel = metadata.sentinel;
	windowContext.startTime = metadata.startTime;
	windowContext.referrer = metadata.referrer;
      });
      this.ampWindow.postMessage({
	sentinel: this.sentinel,
	type: SEND_EMBED_CONTEXT
      }, '*');
    }

    /**
     *
     */
    registerCallback(message_type, callback) {
      // implicitly this causes previous callback to be dropped!
      // Should it be an array?  See what current window.context does
      this.callbackFor[message_type] = callback;
      return () => { delete this.callbackFor[message_type]; };
    }

    /**
     * Sets up event listener for post messages of the desired type.
     *   The actual implementation only uses a single event listener for all of
     *   the different messages, and simply diverts the message to be handled
     *   by different callbacks.
     */
    setupEventListener(){
      listen(window, 'message', message => {
	// Does it look a message from AMP?
	if (message.source == this.ampWindow && message.data &&
            message.data.indexOf('amp-') == 0) {
	  var changes;
	  var embedState;
	  // See if we can parse the payload.
	  try {
            var payload = JSON.parse(message.data.substring(4));
            // Check the sentinel as well.
            if (payload.sentinel == this.sentinel && this.callbackFor[payload.type]) {
	      try {
	        // We should probably report exceptions within callback
		this.callbackFor[payload.type](payload);
	      } catch (err) {
		user().error(`Error in registered callback ${payload.type}`, err);
	      }
            }
	  } catch (e) {
            // JSON parsing failed. Ignore the message.
	  }
	}
      });
    };
  };

  /**
   *  Send message to runtime to start sending page visibility messages.
   *  @param {function} callback Function to call every time we receive a
   *    page visibility message.
   *  @returns {function} that when called stops triggering the callback
   *    every time we receive a page visibility message.
   */
  AmpContext.prototype.observePageVisibility = function(callback){
    var stopObserveFunc = this.registerCallback(EMBED_STATE, callback);
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: SEND_EMBED_STATE
    }, '*');

    return stopObserveFunc;
  };

  /**
   *  Send message to runtime to start sending intersection messages.
   *  @param {function} callback Function to call every time we receive an
   *    intersection message.
   *  @returns {function} that when called stops triggering the callback
   *    every time we receive an intersection message.

   */
  AmpContext.prototype.observeIntersection = function(callback) {
    var stopObserveFunc = this.registerCallback(INTERSECTION, callback);
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: SEND_INTERSECTIONS
    }, '*');

    return stopObserveFunc;
  };

  /**
   *  Send message to runtime requesting to resize ad to height and width.
   *    This is not guaranteed to succeed. All this does is make the request.
   *  @param (int) height The new height for the ad we are requesting.
   *  @param (int) width The new width for the ad we are requesting.
   */
  AmpContext.prototype.resizeAd = function(height, width){
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: EMBED_SIZE,
      width: width,
      height: height
    }, '*');
  };

  return new AmpContext();
})();

window.dispatchEvent(windowContextCreated);
