var windowContextCreated = new Event('windowContextCreated');

class ampContext{
  constructor() {
    this.createdEventListener = false;

    // Map message_type keys to boolean whether we should be listening to
    // that type of message
    this.listenFor = {};

    // Map message_type keys to callback functions for when we receive
    // that message
    this.callbackFor = {};

    var hashMatch = location.hash.match(/amp3pSentinel=((\d+)-\d+)/);
    if (hashMatch) {
      // Sentinel has the format of "$windowDepth-$randomNumber".
      this.sentinel = hashMatch[1];
      // Depth is measured from window.top.
      this.depth = Number(hashMatch[2]);
      this.ancestors = [];
      for (var win = window; win && win != win.parent; win = win.parent) {
	// Add window keeping the top-most one at the front.
	this.ancestors.unshift(win.parent);
      }
      this.ampWindow = this.ancestors[this.depth];
    }
    this.setupMetadata();
  }

  /**
   *  Request all of the metadata attributes for context and add them to
   *  the class.
   */
  setupMetadata(){
    this.ampWindow.postMessage({
      sentinel: this.sentinel,
      type: 'send-embed-context'
    }, '*');
    var windowContext = this;
    return this.setupEventListener('embed-context', function(metadata){
      windowContext.location = metadata.location;
      windowContext.canonicalUrl = metadata.canonicalUrl;
      windowContext.clientId = metadata.clientId;
      windowContext.pageViewId = metadata.pageViewId;
      windowContext.sentinel = metadata.sentinel;
      windowContext.startTime = metadata.startTime;
      windowContext.referrer = metadata.referrer;
    });
  }

  /**
   * Sets up event listener for post messages of the desired type.
   *   The actual implementation only uses a single event listener for all of
   *   the different messages, and simply diverts the message to be handled
   *   by different callbacks.
   * @param {string} message_type The type of the message that we want to
   *    listen for
   * @param {function} callback Function to call when message with type of
   *    message_type is received
   * @return {function} A function which when called stops the listening for
   *    the given message_type
   */
  setupEventListener(message_type, callback){
    this.listenFor[message_type] = true;
    this.callbackFor[message_type] = callback;
    if (!this.createdEventListener){
      this.createdEventListener = true;
      var context = this;
      window.addEventListener('message', function(message) {
	// Does it look a message from AMP?
	if (message.source == context.ampWindow && message.data &&
            message.data.indexOf('amp-') == 0) {
	  var changes;
	  var embedState;
	  // See if we can parse the payload.
	  try {
            var payload = JSON.parse(message.data.substring(4));
            // Check the sentinel as well.
            if (payload.sentinel == context.sentinel) {
              // Is it an intersection update?
              if (context.listenFor[payload.type] == true) {
		context.callbackFor[payload.type](payload);
              }
            }
	  } catch (e) {
            // JSON parsing failed. Ignore the message.
	  }
	}
      });
    }
    return () => {
      this.listenFor[message_type] = false;
      this.callbackFor[message_type] = undefined;
    };
  };
};

ampContext.prototype.metadata = function(callback){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-embed-context'
  }, '*');
  return this.setupEventListener('embed-context', callback);
};

ampContext.prototype.observePageVisibility = function(callback){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-embed-state'
  }, '*');

  return this.setupEventListener('embed-state', callback);
};

ampContext.prototype.observeIntersection = function(callback) {
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-intersections'
  }, '*');

  return this.setupEventListener('intersection', callback);
};

ampContext.prototype.resizeAd = function(height, width){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'embed-size',
    width: width,
    height: height
  }, '*');
};

if (!window.context){
  window.context = new ampContext();
}
window.dispatchEvent(windowContextCreated);
