'use strict'

var assert = require('assert')
var util = require('util')

var Observable = require('rxjs/Observable').Observable
var Subscription = require('rxjs/Subscription').Subscription

module.exports = CursorObservable

function CursorObservable (cursor) {
  if (!(this instanceof CursorObservable)) {
    return new CursorObservable(cursor)
  }
  this._cursor = cursor
  this.__subscribed = false
  Observable.call(this, this._subscribe)
}

// inherit from base observable
util.inherits(CursorObservable, Observable)

/**
 * subscribe to this observable
 * @param  {SubscriptionObserver} observer Subscription observer wraps the original given callbacks w/ "safe" versions
 * @return {Subscription} subscription { unsubscribe: fn }
 */
CursorObservable.prototype._subscribe = function (observer) {
  console.log('subscribe')
  assert(!this.__subscribed, 'CursorObservable can only be subscribed to once. To subscribe multiple times see docs (.publish().refCount()).')
  var self = this
  this.__subscribed = true
  this._cursor.each(function (err, next) {
    // each callback
    if (err) {
      observer.error(err)
      return
    }
    observer.next(next)
  }, function () {
    console.log('complete')
    // completed callback
    observer.complete()
  })
  return new Subscription(function () {
    console.log('unsubscribe')
    this.__subscribed = false
    self._cursor.close()
  })
}
