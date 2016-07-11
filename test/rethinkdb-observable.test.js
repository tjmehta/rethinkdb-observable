'use strict'

var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it

var expect = require('chai').expect
var noop = require('101/noop')
var sinon = require('sinon')

var rethinkdbObservable = require('../index.js')

describe('rethinkdb-observable', function () {
  beforeEach(function () {
    this.cursor = {
      forEach: sinon.stub(),
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
      var disposable = observable.subscribe({
        onNext: noop
      })
      expect(disposable.dispose).to.exist
      sinon.assert.calledOnce(this.cursor.forEach)
    })
    
    it('should call all subscriptions onNext upon receiving next cursor item', function () { 
      var observable = rethinkdbObservable(this.cursor)
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      // mock cursor next event
      var next = {}
      this.cursor.forEach.firstCall.args[0](null, next)
      // assertions
      this.callbacks.forEach(function (obj) {
        sinon.assert.calledOnce(obj.onNext)
        sinon.assert.calledWith(obj.onNext, next)
        sinon.assert.notCalled(obj.onError)
        sinon.assert.notCalled(obj.onCompleted)
      })
    })
    
    it('should call all subscriptions onError if cursor errors', function () {
      var observable = rethinkdbObservable(this.cursor)
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      // mock cursor next event
      var err = new Error('boom')
      this.cursor.forEach.firstCall.args[0](err)
      // assertions
      this.callbacks.forEach(function (obj) {
        sinon.assert.calledOnce(obj.onError)
        sinon.assert.calledWith(obj.onError, err)
        sinon.assert.notCalled(obj.onNext)
        sinon.assert.notCalled(obj.onCompleted)
      })
      expect(function () {
        observable.subscribe({})
      }).to.throw(/closed/)
    })
    
    it('should call all subscriptions onCompleted if cursor finishes', function () {
      var observable = rethinkdbObservable(this.cursor)
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      observable.subscribe(this.createCallbackStubs())
      // mock cursor next event
      this.cursor.forEach.firstCall.args[1]()
      // assertions
      this.callbacks.forEach(function (obj) {
        sinon.assert.calledOnce(obj.onCompleted)
        sinon.assert.notCalled(obj.onError)
        sinon.assert.notCalled(obj.onNext)
      })
      expect(function () {
        observable.subscribe({})
      }).to.throw(/closed/)
    })
  })
  
  describe('subscription.dispose', function () {
    it('should dispose subscription', function () {
      var observable = rethinkdbObservable(this.cursor)
      var disposable = observable.subscribe({
        onNext: sinon.stub()
      })
      var disposable2 = observable.subscribe({
        onNext: sinon.stub()
      })
      // dispose first cursor
      disposable.dispose()
      sinon.assert.notCalled(this.cursor.close)
      // mock cursor next 
      var next = {}
      this.cursor.forEach.firstCall.args[0](null, next)
      // assert only disposable2 callbacks are called
      sinon.assert.notCalled(disposable.callbacks.onNext)
      sinon.assert.calledOnce(disposable2.callbacks.onNext)
    })
    
    it('should not dispose twice', function () {
      var observable = rethinkdbObservable(this.cursor)
      var disposable = observable.subscribe({
        onNext: sinon.stub()
      })
      disposable.dispose()
      // assertions
      expect(function () {
        disposable.dispose()
      }).to.throw(/dispose/)
    })
    
    it('should close the cursor after all subscriptions are disposed', function () {
      var observable = rethinkdbObservable(this.cursor)
      var disposable = observable.subscribe({
        onNext: noop
      })
      disposable.dispose()
      // assertions
      sinon.assert.calledOnce(this.cursor.close)
      expect(function () {
        observable.subscribe({})
      }).to.throw(/closed/)
    })
    
    it('should NOT close the cursor twice', function () {
      var observable = rethinkdbObservable(this.cursor)
      var disposable = observable.subscribe({
        onNext: noop
      })
      // trigger onCompleted event
      this.cursor.forEach.firstCall.args[1]()
      // dispose
      disposable.dispose()
      // assertions
      sinon.assert.notCalled(this.cursor.close)
      expect(function () {
        observable.subscribe({})
      }).to.throw(/closed/)
    })
  })
})