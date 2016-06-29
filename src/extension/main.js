'use strict';

let lastSeenHeader;
let lastSeenTail;

function findArmor(node) {
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
      console.log(commonRoot(lastSeenHeader, lastSeenTail));
      lastSeenHeader = undefined;
      lastSeenTail = undefined;
    }
  } else {
    node.childNodes.forEach(findArmor);
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

findArmor(document.body);
