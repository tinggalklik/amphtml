/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * Gets a string showing the index of an element within
 * the children of its parent, counting only nodes with the same tag.
 * Stop at 25, just to have a limit.
 * @param {?Element} element DOM node to get index of.
 * @return {string} '.<index>' or ''.
 */
function indexWithinParent(element) {
  if (element && element.nodeName && element.parentElement) {
    const elementParent = element.parentElement;
    const nodeName = element.nodeName.toString().toLowerCase();
    // Find my index within my parent's children
    const children = elementParent.childNodes;
    // Choose a limit that we hope will allow getting to 25
    // matching nodes.
    const limit = Math.min(children.length, 100);
    let matchingNodeCount = 0;
    for (let i = 0; i < limit && matchingNodeCount < 25; i++) {
      const child = children[i];
      // Some browsers treat childNodes differently.
      // So we'll only count nodes with the same tag.
      if (child.nodeName &&
          child.nodeName.toString().toLowerCase() === nodeName) {
        if (element === child) {
          return '.' + matchingNodeCount;
        }
        ++matchingNodeCount;
      }
    }
  }
  return '';
};


/**
 * Gets a string of concatenated element names and relative positions
 * of the DOM element and its parentElement's (up to 25).  Relative position
 * is the index of nodes with this tag within the parent's childNodes.
 * The order is from the inner to outer nodes in DOM hierarchy.
 *
 * If a DOM hierarchy is the following:
 *
 * <div id='id1' ...>
 *   <div id='id2' ...>
 *     <table ...>       // table:0
 *       <tr>            // tr:0
 *         <td>...</td>  // td:0
 *         <td>          // td:1
 *           <script>...</script>
 *         </td>
 *       </tr>
 *       <tr>...</tr>    // tr:1
 *     </table>
 *   </div>
 * </div>
 *
 * With the most nested td element passed in as parameter:
 * 'td.1,tr.0,table.0,div/id2.0,div/id1.0' is returned if
 *     opt_excludeIds is false.
 * 'td.1,tr.0,table.0,div.0,div.0' is returned if opt_excludeIds is true.
 *
 * Note: 25 is chosen arbitrarily.
 *
 * @param {?Element} element DOM node to get id of.
 * @param {boolean=} opt_excludeIds Whether to exclude ids (optional,
 *     default false)
 * @return {string} Concatenated element ids.
 */
function getDomChainElements(element, opt_excludeIds) {
  const ids = [];
  for (let level = 0; element && level < 25; ++level) {
    // Avoid using element.id if element is actually the document object itself:
    // mootools sets document.id to be some javascript function, which
    // would make the value of this function depend on a race.
    let id = '';
    if (!opt_excludeIds) {
      id = element.nodeType != /* Document */ 9 && element.id;
      if (id) {
        id = '/' + id;
      } else {
        id = '';
      }
    }
    const nodeName = element.nodeName &&
        element.nodeName.toString().toLowerCase();
    ids.push(nodeName + id +
        indexWithinParent(element));
    element = element.parentElement;
  }

  return ids.join();
};

/**
 * Calculates ad slot DOM fingerprint.  This key is intended to
 * identify "same" ad unit across many page views. This version is completely
 * based on where the ad appears within the frame's DOM structure, and where
 * the frame appears within the page's arrangement of nested frames. It
 * does not include width or height, which can now vary with resposive design.
 *
 * @param {?Window} win The window object.
 * @param {?Element} keyElement The DOM element from which to collect
 *     the DOM chain element IDs.  If null, DOM chain element IDs are not
 *     included in the hash.
 * @return {string} The ad unit hash key string.
 */
export function domFingerprint(win, element) {
  return stringHash32(getDomChainElements(element)).toString();
};

/**
 * A variant of the djb2 algorithm.
 * @param {string} str
 * @return {number} 32-bit unsigned hash of the string
 */
function stringHash32(str) {
  const length = str.length;
  let hash = 5381;
  for (let i = 0; i < length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // Convert from 32-bit signed to unsigned.
  return hash >>> 0;
};
