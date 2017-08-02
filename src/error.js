'use strict';
/**
 * This file specifies custom error types, to make error handling cleaner.
 * The name property corresponds to the type of error, and the message is
 * a human readable error.
 */

// GoogleAuthErrors are thrown when there is an authentication issue with
// Gmail/OAuth.
class GoogleAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

// KeybaseAuthErrors are thrown when there is an authentication issue with Keybase.
class KeybaseAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'KeybaseAuthError';
  }
}

// InputErrors are thrown when the user provides invalid input.
class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

// NetworkErrors are thrown if there was some error with the network connection
// (e.g. a request fails)
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// NoPublicKeyErrors are thrown when a public key is unavailable for some
// reason.
class NoPublicKeyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoPublicKeyError';
  }
}

class NoPrivateKeyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoPrivateKeyError';
  }
}

// UnsupportedErrors are thrown when platform specific code is called, but
// aren't supported on the current platform.
class UnsupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedError';
  }
}

module.exports = {
  GoogleAuthError: GoogleAuthError,
  InputError: InputError,
  KeybaseAuthError: KeybaseAuthError,
  NetworkError: NetworkError,
  NoPrivateKeyError: NoPrivateKeyError,
  NoPublicKeyError: NoPublicKeyError,
  UnsupportedError: UnsupportedError
};
