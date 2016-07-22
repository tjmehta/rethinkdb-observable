'use strict'

require('es6-promise').polyfill()

var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it

var expect = require('chai').expect
var noop = require('101/noop')
var sinon = require('sinon')

var rethinkdbObservable = require('../index.js')

describe('rethinkdb-observable unit tests', function () {
  beforeEach(function () {
    this.cursor = {
      each: sinon.stub(),
      close: sinon.stub()
    }
  })

  it('should create an observable', function () {
    var observable = rethinkdbObservable(this.cursor)
    expect(observable.subscribe).to.exist
  })

  describe('subscribe', function () {
    beforeEach(function () {
      var callbacks = this.callbacks = []
      this.createCallbackStubs = function () {
        var ret = {
          onCompleted: sinon.stub(),
          onError: sinon.stub(),
          onNext: sinon.stub()
        }
        callbacks.push(ret)
        return ret
      }
    })

    it('should allow subscriptions', function () {
      var observable = rethinkdbObservable(this.cursor)
      var subscription = observable.subscribe(noop)
      expect(subscription.unsubscribe).to.exist
      sinon.assert.calledOnce(this.cursor.each)
    })

    it('should NOT allow multiple subscriptions', function () {
      // to subscribe multiple times.. use connectable observable by calling publish()...
      var observable = rethinkdbObservable(this.cursor)
      observable.subscribe(noop)
      expect(function () {
        observable.subscribe(noop)
      }).to.throw(/subscribed to once/)
    })

    it('should invoke onNext', function () {
      var observable = rethinkdbObservable(this.cursor)
      var onNext = sinon.stub()
      var onError = sinon.stub()
      var onCompleted = sinon.stub()
      // subscribe
      observable.subscribe(onNext, onError, onCompleted)
      // mock cursor next
      var next = {}
      this.cursor.each.firstCall.args[0](null, next)
      sinon.assert.calledOnce(onNext)
      sinon.assert.calledWith(onNext, next)
      sinon.assert.notCalled(onError)
      sinon.assert.notCalled(onCompleted)
    })

    it('should invoke onError', function () {
      var observable = rethinkdbObservable(this.cursor)
      var onNext = sinon.stub()
      var onError = sinon.stub()
      var onCompleted = sinon.stub()
      // subscribe
      observable.subscribe(onNext, onError, onCompleted)
      // mock cursor error
      var err = new Error('err')
      this.cursor.each.firstCall.args[0](err)
      sinon.assert.calledOnce(onError)
      sinon.assert.calledWith(onError, err)
      sinon.assert.notCalled(onNext)
      sinon.assert.notCalled(onCompleted)
    })

    it('should invoke onCompleted', function () {
      var observable = rethinkdbObservable(this.cursor)
      var onNext = sinon.stub()
      var onError = sinon.stub()
      var onCompleted = sinon.stub()
      // subscribe
      observable.subscribe(onNext, onError, onCompleted)
      // mock cursor completed
      this.cursor.each.firstCall.args[1]()
      sinon.assert.notCalled(onNext)
      sinon.assert.notCalled(onError)
      sinon.assert.calledOnce(onCompleted)
    })
  })

  describe('subscription.dispose', function () {
    it('should dispose subscription', function () {
      var observable = rethinkdbObservable(this.cursor)
      var onNext = sinon.stub()
      var subscription = observable.subscribe(onNext)
      // dispose this cursor
      subscription.unsubscribe()
      sinon.assert.calledOnce(this.cursor.close)
      // mock cursor next
      var next = {}
      this.cursor.each.firstCall.args[0](null, next)
      sinon.assert.notCalled(onNext)
    })
  })
})
