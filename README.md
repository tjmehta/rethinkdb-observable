# rethinkdb-observable [![Build Status](https://travis-ci.org/tjmehta/rethinkdb-observable.svg?branch=master)](https://travis-ci.org/tjmehta/rethinkdb-observable) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
Convert a rethinkdb cursor into an observable

# Installation
```js
npm i --save rethinkdb-observable
npm i --save rxjs # peer dependency
```

# Usage
#### Example: observable w/ single subscribe/unsubscribe
```js
var createObservable = require('rethinkdb-observable')
var r = require('rethinkdb')

rethinkdb.table('test').run(conn).then(function (cursor) {
  // Note: this is a basic observable and only allows ONE subscription. for multiple, see example below.
  var observable = createObservable(cursor)
  // subscribe usage
  var subscription = observable.subscribe(
    function onNext (next) {
      // onNext will be passed each item as they are recieved from the cursor
    },
    function onError (err) {
      // onError will trigger for any cursor errors
    },
    function onCompleted () {
      // on complete will trigger after last "next" has been pushed
      // and cursor has closed successfully
    }
  )
  // unsubscribe usage
  subscription.unsubscribe()
  // unsubscribe will detach the subscription callbacks and close the cursor
})
```

#### Example: observable w/ multiple subscriptions
Uses [rxjs](https://github.com/ReactiveX/rxjs) ConnectableObservable by using `publish`.
To learn more about ReactiveX observables checkout: [reactivex.io](http://reactivex.io) or [intro to rx](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754)
```js
var createObservable = require('rethinkdb-observable')
var r = require('rethinkdb')
// required to use publish
require('rxjs/add/operator/publish')

rethinkdb.table('test').run(conn).then(function (cursor) {
  // `publish` creates a connectable observable (multiple subscriptions)
  // `refCount` invokes subscribe on the first subscription
  var observable = rethinkdbObservable(cursor).publish().refCount()
  // subscribe usage
  var subscription = observable.subscribe(
    function onNext (next) {
      // onNext will be passed each item as they are recieved from the cursor
    },
    function onError (err) {
      // onError will trigger for any cursor errors
    },
    function onCompleted () {
      // on complete will trigger after last "next" has been pushed
      // and cursor has closed successfully
    }
  )
  // unsubscribe usage
  subscription.unsubscribe()
  // unsubscribe will detach the subscription callbacks and close the cursor
})
```


# License
MIT
