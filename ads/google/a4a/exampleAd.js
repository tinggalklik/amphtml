// Step 1: check if the sentinel for AMP communication exists and parse it.


  // Step 3: register listener.
  window.addEventListener('message', function(message) {
    // Does it look a message from AMP?
    if (message.source == ampWindow && message.data &&
        message.data.indexOf('amp-') == 0) {
      var changes;
      var embedState;
      // See if we can parse the payload.
      try {
        var payload = JSON.parse(message.data.substring(4));
        // Check the sentinel as well.
        if (payload.sentinel == sentinel) {
          // Is it an intersection update?
          if (payload.type == 'intersection') {
            changes = payload.changes;
          }
          if (payload.type == 'embed-state') {
            embedState = payload;
          }
          if (payload.type == 'embed-size-changed') {
            console.log('embed-size succeeded', payload);
          }
          if (payload.type == 'embed-size-denied') {
            console.log('embed-size failed', payload);
          }
          if (payload.type == 'embed-context') {
            console.log('context', payload);
          }
        }
      } catch (e) {
        // JSON parsing failed. Ignore the message.
      }

      if (changes) {
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
      if (embedState) {
        console.log('embed-state message', embedState);
      }
    }
  });

  window.resizeAd = function() {
    ampWindow.postMessage({
      sentinel: sentinel,
      type: 'embed-size',
      width: 600,
      height: 500
    }, '*');
  }

  window.metadata = function() {
    ampWindow.postMessage({
      sentinel: sentinel,
      type: 'send-embed-context'
    }, '*');
  }
}
