import '../../../3p/polyfills';
import {listen} from '../../../src/event-helper';


window.context = window.context || (function() {
  // end private stuff in _
  // const all this stuff
  const MessageType_ = {
    SEND_EMBED_STATE: 'send-embed-state',
    EMBED_STATE: 'embed-state',
    SEND_EMBED_CONTEXT: 'send-embed-context',
    EMBED_CONTEXT: 'embed-context',
    SEND_INTERSECTIONS: 'send-intersections',
    INTERSECTION: 'intersection',
    EMBED_SIZE: 'embed-size',
  };

  const windowContextCreated = new Event('windowContextCreated');

  class AmpContext {
    // Make MessageType string enum
    constructor() {
      /** Map messageType keys to callback functions for when we receive
       *  that message
       *  @private {object}
       */
      this.callbackFor_ = {};

      /**
       *  Indicates when this object is actually ready to be used. Not true
       *  until the metadata has been populated.
       *
       *  !!!!!!!!!!!!!!!!!!!           TODO      !!!!!!!!!!!!!!!!!!!!!!!!!!
       *  Do we need to modify the old window.context to always
       *  have this as true?? Or should we have something that says this is
       *  is the new version? Right now, this will break the old one if
       *  creatives start always checking this property, as it does not
       *  exist on the old one.
       *  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
       */
      this.isReady = false;

      // Do we want to pass sentinel via hash?  or name attribute?
      const hashMatch = window.location.hash.match(/amp3pSentinel=((\d+)-\d+)/);
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
      this.setupEventListener_();
      this.setupMetadata_();
    }

    /**
     *  Request all of the metadata attributes for context and add them to
     *  the class.
     *  IDEALLY THIS IS PASSED TO IFRAME ALONG WITH SENTINEL
     *  @private
     */
    setupMetadata_() {
      // Always register listener before starting handshake
      this.registerCallback_(MessageType_.EMBED_CONTEXT, metadata => {
        // Any need to verify "correctness" of metadata?
        this.location = metadata.location;
        this.canonicalUrl = metadata.canonicalUrl;
        this.clientId = metadata.clientId;
        this.pageViewId = metadata.pageViewId;
        this.sentinel = metadata.sentinel;
        this.startTime = metadata.startTime;
        this.referrer = metadata.referrer;
        this.isReady = true;
        window.dispatchEvent(windowContextCreated);
      });
      this.ampWindow.postMessage({
        sentinel: this.sentinel,
        type: MessageType_.SEND_EMBED_CONTEXT,
      }, '*');
    }

    /**
     *
     */
    registerCallback_(messageType, callback) {
      // implicitly this causes previous callback to be dropped!
      // Should it be an array?  See what current window.context does
      this.callbackFor_[messageType] = callback;
      return () => { delete this.callbackFor_[messageType]; };
    }

    /**
     * Sets up event listener for post messages of the desired type.
     *   The actual implementation only uses a single event listener for all of
     *   the different messages, and simply diverts the message to be handled
     *   by different callbacks.
     * @private
     */
    setupEventListener_() {
      listen(window, 'message', message => {
        // Does it look a message from AMP?
        if (message.source == this.ampWindow && message.data &&
            message.data.indexOf('amp-') == 0) {
          // See if we can parse the payload.
          try {
            const payload = JSON.parse(message.data.substring(4));
            // Check the sentinel as well.
            if (payload.sentinel == this.sentinel &&
		this.callbackFor_[payload.type]) {
              try {
                // We should probably report exceptions within callback
                this.callbackFor_[payload.type](payload);
              } catch (err) {
                user().error(`Error in registered callback ${payload.type}`,
			err);
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
  AmpContext.prototype.observePageVisibility = function(callback) {
    const stopObserveFunc = this.registerCallback_(MessageType_.EMBED_STATE,
						 callback);
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: MessageType_.SEND_EMBED_STATE,
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
    const stopObserveFunc = this.registerCallback_(MessageType_.INTERSECTION,
						 callback);
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: MessageType_.SEND_INTERSECTIONS,
    }, '*');

    return stopObserveFunc;
  };

  /**
   *  Send message to runtime requesting to resize ad to height and width.
   *    This is not guaranteed to succeed. All this does is make the request.
   *  @param (int) height The new height for the ad we are requesting.
   *  @param (int) width The new width for the ad we are requesting.
   */
  AmpContext.prototype.resizeAd = function(height, width) {
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: MessageType_.EMBED_SIZE,
      width,
      height,
    }, '*');
  };

  return new AmpContext();
})();
