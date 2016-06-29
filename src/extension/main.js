'use strict';

let lastSeenHeader;
let lastSeenTail;

let signedMessages = [];

function findSignedMessages(node) {
  if (node.tagName === 'SCRIPT') {
    return;
  }
  if (node.childNodes.length === 0) {
    if (node.nodeValue === null) {
      return;
    }

    if (node.nodeValue.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
      console.log(node);
      lastSeenHeader = node;
    }
    if (node.nodeValue.includes('-----END PGP SIGNATURE-----')) {
      console.log(node);
      lastSeenTail = node;
    }

    if (lastSeenHeader && lastSeenTail) {
      signedMessages.push(commonRoot(lastSeenHeader, lastSeenTail));
      lastSeenHeader = undefined;
      lastSeenTail = undefined;
    }
  } else {
    node.childNodes.forEach(findSignedMessages);
  }
}

function commonRoot(a, b) {
  let arr = [];
  let current = a;
  while (current.parentNode) {
    arr.push(current.parentNode);
    current = current.parentNode;
  }

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

function reconstructMessage(node) {
  if (node.nodeValue !== null) {
    console.log(node.nodeValue);
    return node.nodeValue;
  }

  let style = window.getComputedStyle(node);
  if (style.visibility === 'hidden' || style.display === 'none') {
    return '';
  }

  if (node.tagName == 'BR') {
    return '\n';
  }
  let str = '';
  for (let child of node.childNodes) {
    str += reconstructMessage(child);
  }
  if (window.getComputedStyle(node).display !== 'inline') {
    str += '\n\n';
  }
  return str;
}

findSignedMessages(document.body);
console.log(signedMessages);
console.log(signedMessages.map(reconstructMessage));
