'use strict'

var assert = require('assert')

var CursorSubscription = require('./cursor-subscription.js')

module.exports = CursorObservable

/**
 * Cursor observables facilitate subscriptions to a cursor, 
 * keep track of all subscriptions to a cursor, and closes 
 * the cursor when all subscriptions have been disposed.
 * @class
 * @param {RethinkdbCursor} cursor
 */
function CursorObservable (cursor) {
  if (!(this instanceof CursorObservable)) {
    return new CursorObservable(cursor)
  }
  this._cursor = cursor
  this._cursorAttached = false
  this._cursorClosed = false
  this._subscriptions = []
  this._subscriptionCount = 0
}

/**
 * Attach cursor by connecting forEach handler to callbacks
 */
CursorObservable.prototype._attachCursor = function () {
  var self = this
  this._cursorAttached = true
  var subscriptions = this._subscriptions
  this._cursor.forEach(function (err, next) {
    if (err) {
      return subscriptions.forEach(self._invokeCallbacks('onError', err))
    }
    subscriptions.forEach(self._invokeCallbacks('onNext', next))
  }, function () {
    return subscriptions.forEach(self._invokeCallbacks('onCompleted'))
  })
}

/**
 * Dispose a subscription. Called by "subscription.dispose()"
 * If all subscriptions have been disposed, it will close the cursor
 * @param {CursorSubscription} subscription to be disposed
 */
CursorObservable.prototype._disposeSubscription = function (subscription) {
  assert(
    this._subscriptions[subscription.id] === subscription, 
    'subscription already disposed'
  )
  delete this._subscriptions[subscription.id]
  this._subscriptionCount--
  if (this._subscriptionCount === 0 && !this._cursorClosed) {
    this._cursor.close() 
    this._cursorClosed = true
  }
}

CursorObservable.prototype._invokeCallbacks = function (method) {
  var self = this
  var args = Array.prototype.slice.call(arguments, 1)
  return function (subscription, i, all) {
    subscription.callbacks[method].apply(null, args)
    if (
      i === (all.length - 1) &&
      (method === 'onCompleted' || method === 'onError')
    ) {
      self._cursorClosed = true
    }
  }
}

/**
 * Subscribe to a cursor
 * @param {Object} callbacks
 * @param {Function} [callbacks.onCompleted]
 * @param {Function} [callbacks.onError]
 * @param {Function} [callbacks.onNext]
 */
CursorObservable.prototype.subscribe = function (callbacks) {
  assert(!this._cursorClosed, 'cursor is closed')
  var subscription = new CursorSubscription(this, callbacks)
  this._subscriptions.push(subscription)
  this._subscriptionCount++
  if (!this._cursorAttached) {
    this._attachCursor()
  }
  return subscription
}
