'use strict'

var defaults = require('101/defaults')
var noop = require('101/noop')

module.exports = CursorSubscription

/**
 * Creates a cursor subscription (disposable)
 * @class
 */
function CursorSubscription (observable, callbacks) {
  this.callbacks = defaults(callbacks, {
    onCompleted: noop,
    onError: noop,
    onNext: noop
  })
  this.id = observable._subscriptions.length
  this._observable = observable
}

/**
 * Disposes the cursor
 */
CursorSubscription.prototype.dispose = function () {
  this._observable._disposeSubscription(this)
}
