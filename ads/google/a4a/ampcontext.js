var windowContextCreated = new Event('windowContextCreated');

class ampContext{
  constructor() {
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
  }

  setupEventListener(message_type, callback){
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
            if (payload.type == message_type) {
	      callback(payload);
            }
          }
	} catch (e) {
          // JSON parsing failed. Ignore the message.
	}
      }
    });
  };
};

ampContext.prototype.metadata = function(callback){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-embed-context'
  }, '*');
  this.setupEventListener('embed-context', callback);
};

ampContext.prototype.observePageVisibility = function(callback){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-embed-state'
  }, '*');

  this.setupEventListener('embed-state', callback);
};

ampContext.prototype.observeIntersection = function(callback) {
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'send-intersections'
  }, '*');

  this.setupEventListener('intersection', callback);
};

ampContext.prototype.resizeAd = function(width, height){
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: 'embed-size',
    width: width,
    height: height
  }, '*');
};


function intersectionCallback(payload){
  changes = payload.changes;
  // Step 4: Do something with the intersection updates!
  // Code below is simply an example.
  var latestChange = changes[changes.length - 1];

  // Amp-ad width and height.
  var w = latestChange.boundingClientRect.width;
  var h = latestChange.boundingClientRect.height;

  // Visible width and height.
  var vw = latestChange.intersectionRect.width;
  var vh = latestChange.intersectionRect.height;

  // Position in the viewport.
  var vx = latestChange.boundingClientRect.x;
  var vy = latestChange.boundingClientRect.y;

  // Viewable percentage.
  var viewablePerc = (vw * vh) / (w * h) * 100;

  console.log(viewablePerc, w, h, vw, vh, vx, vy);

}

function dummyCallback(changes){
  console.log(changes);
}

if (!window.context){
  window.context = new ampContext();
}
window.dispatchEvent(windowContextCreated);
