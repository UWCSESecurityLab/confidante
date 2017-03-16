'use strict';
/**
 * This file specifies custom error types, to make error handling cleaner.
 * The name property corresponds to the type of error, and the message is
 * a human readable error.
 */
class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

class UnsupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedError';
  }
}

module.exports = {
  AuthError: AuthError,
  InputError: InputError,
  NetworkError: NetworkError,
  UnsupportedError: UnsupportedError
};
