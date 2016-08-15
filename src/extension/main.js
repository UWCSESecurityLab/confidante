'use strict';

console.log(detectSignatures().map(reconstructMessage));

/**
 * Iterate through each element in the body and look for PGP signed messages
 * and signature blocks.
 * @return {Array} A list of DOM nodes that contain a PGP signed message block,
 *                 possibly broken up between multiple children.
 */
function detectSignatures() {
  let lastSeenHeader;
  let lastSeenTail;
  let messageRoots = [];

  let queue = [document.body];

  while (queue.length !== 0) {
    let node = queue.shift();

    if (node.tagName === 'SCRIPT') {
      continue;
    }

    if (node.childNodes.length === 0) {
      if (node.nodeValue === null) {
        continue;
      }

      if (node.nodeValue.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
        lastSeenHeader = node;
      }
      if (node.nodeValue.includes('-----END PGP SIGNATURE-----')) {
        lastSeenTail = node;
      }

      if (lastSeenHeader && lastSeenTail) {
        messageRoots.push(commonRoot(lastSeenHeader, lastSeenTail));
        lastSeenHeader = undefined;
        lastSeenTail = undefined;
      }
    } else {
      queue = [...node.childNodes].concat(queue);
    }
  }
  return messageRoots;
}

/**
 * Given two DOM nodes, finds the common root.
 * @param a {Node}
 * @param b {Node}
 * @return {Node} The deepest common node of a and b in the DOM tree.
 */
function commonRoot(a, b) {
  // Build a list of the ancestors of a.
  let arr = [];
  let current = a;
  while (current.parentNode) {
    arr.push(current.parentNode);
    current = current.parentNode;
  }

  // Iterate through the ancestors of b until it matches an ancestor of a.
  current = b;
  while (arr.indexOf(current) === -1 && current.parentNode) {
    current = current.parentNode;
  }

  if (arr.indexOf(current) !== -1) {
    return current;
  } else {
    return undefined;
  }
}

/**
 * Attempt to recursively reconstruct a PGP signed message and signature block
 * with the original line breaks.
 * @param node {Node} The root from which to reconstruct the message.
 * @return {string} The reconstructed message.
 */
function reconstructMessage(node) {
  // If it's just text, return it.
  if (node.nodeValue !== null) {
    return node.nodeValue;
  }

  // If it's invisible, return nothing.
  let style = window.getComputedStyle(node);
  if (style.visibility === 'hidden' || style.display === 'none') {
    return '';
  }

  // If it's a <br>, return a line break.
  if (node.tagName == 'BR') {
    return '\n';
  }

  let str = '';
  // Call recursively on child nodes.
  for (let child of node.childNodes) {
    str += reconstructMessage(child);
  }
  // If it's not an inline element (e.g. <p>, <div>), add line breaks at the end.
  if (window.getComputedStyle(node).display !== 'inline') {
    str += '\n\n';
  }
  return str;
}
