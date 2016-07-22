'use strict'

require('es6-promise').polyfill()

var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it

var callbackCount = require('callback-count')
var expect = require('chai').expect
var ignore = require('ignore-errors')
var pick = require('101/pick')
var r = require('rethinkdb')
var sinon = require('sinon')

var TABLE = 'rethinkdb_observable_test'
var sortBy = function (key) {
  return function (a, b) {
    return (a[key] < b[key])
      ? -1
      : (a[key] > b[key])
        ? 1
        : 0
  }
}

var rethinkdbObservable = require('../index.js')

describe('rethinkdb-observable functional tests', function () {
  describe('query cursor', function () {
    beforeEach(function () {
      var self = this
      this.rows = [
        { foo: 1 },
        { foo: 2 },
        { foo: 3 },
        { foo: 4 }
      ]
      return r.connect({ host: 'localhost', db: 'test' }).then(function (conn) {
        self.conn = conn
      }).then(function () {
        return r.tableDrop(TABLE).run(self.conn).catch(ignore(/exist/))
      }).then(function () {
        return r.tableCreate(TABLE).run(self.conn).catch(ignore(/exist/))
      }).then(function () {
        return Promise.all(self.rows.map(function (row) {
          return r.table(TABLE).insert(row).run(self.conn)
        }))
      })
    })

    it('should subscribe, next all rows, and complete', function (done) {
      var self = this
      r.table(TABLE).run(this.conn).then(function (cursor) {
        var results = []
        var subscription = rethinkdbObservable(cursor).subscribe(
          // onNext
          function (row) {
            return results.push(row)
          },
          // onError
          done,
          // onComplete
          function () {
            expect(subscription.unsubscribe).to.be.a('function')
            expect(results.sort(sortBy('foo')).map(pick('foo'))).to.deep.equal(self.rows)
            done()
          }
        )
      }).catch(done)
    })

    it('should unsubscribe', function (done) {
      var self = this
      r.table(TABLE).run(this.conn).then(function (cursor) {
        self.cursor = cursor
        sinon.spy(cursor, 'close')
        var results = []
        var subscription = rethinkdbObservable(cursor).subscribe(
          // onNext
          function (row) {
            unsubscribeAndFinish()
            return results.push(row)
          },
          // onError
          done,
          // onComplete
          done.bind(null, new Error('should not complete'))
        )
        function unsubscribeAndFinish () {
          // async assert to make extra sure onComplete is not called..
          subscription.unsubscribe()
          sinon.assert.calledOnce(self.cursor.close)
          setTimeout(function () {
            expect(subscription.unsubscribe).to.be.a('function')
            expect(results.length).to.equal(1)
            done()
          }, 1)
        }
      }).catch(done)
    })

    describe('connectable observable', function () {
      it('should subscribe TWICE, next all rows, and complete', function (done) {
        require('rxjs/add/operator/publish')
        var self = this
        r.table(TABLE).run(this.conn).then(function (cursor) {
          var results = []
          var results2 = []
          var count = callbackCount(finish)
          var observable = rethinkdbObservable(cursor).publish().refCount()
          observable.subscribe(
            // onNext
            function (row) {
              return results.push(row)
            },
            // onError
            count.next,
            // onComplete
            count.inc().next
          )
          observable.subscribe(
            // onNext
            function (row) {
              return results2.push(row)
            },
            // onError
            count.next,
            // onComplete
            count.inc().next
          )
          function finish (err) {
            if (err) { return done(err) }
            expect(results.sort(sortBy('foo')).map(pick('foo'))).to.deep.equal(self.rows)
            expect(results2.sort(sortBy('foo')).map(pick('foo'))).to.deep.equal(self.rows)
            done()
          }
        }).catch(done)
      })

      it('should unsubscribe TWICE', function (done) {
        require('rxjs/add/operator/publish')
        var self = this
        r.table(TABLE).run(this.conn).then(function (cursor) {
          self.cursor = cursor
          sinon.spy(cursor, 'close')
          var results = []
          var results2 = []
          var observable = rethinkdbObservable(cursor).publish().refCount()
          var subscription = observable.subscribe(
            // onNext
            function (row) {
              if (results.length === 1) {
                unsubscribeAndFinish()
              }
              return results.push(row)
            },
            // onError
            done,
            // onComplete
            done.bind(null, new Error('should not complete'))
          )
          var subscription2 = observable.subscribe(
            // onNext
            function (row) {
              return results2.push(row)
            },
            // onError
            done,
            // onComplete
            done.bind(null, new Error('should not complete'))
          )
          function unsubscribeAndFinish () {
            // async assert to make extra sure onComplete is not called..
            subscription.unsubscribe()
            sinon.assert.notCalled(self.cursor.close)
            subscription2.unsubscribe()
            sinon.assert.calledOnce(self.cursor.close)
            setTimeout(function () {
              expect(results.length).to.equal(2)
              expect(results2.length).to.equal(1)
              done()
            }, 1)
          }
        }).catch(done)
      })
    })
  })
})
