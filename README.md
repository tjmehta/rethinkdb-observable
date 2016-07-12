# rethinkdb-observable
Convert a rethinkdb cursor into an observable

# Installation
```js
npm i --save rethinkdb-observable
```

# Usage
Example
```js
var createObservable = require('rethinkdb-observable')
var r = require('rethinkdb')

rethinkdb.table('test').then(function (cursor) {
  var observable = createObservable(cursor)
  // subscribe usage
  var disposable = observable.subscribe({
    onNext: function (next) {
      // onNext will be passed each item as they are recieved from the cursor
    },
    onError: function (err) {
      // onError will trigger for any cursor errors
    },
    onComplete: function () {
      // on complete will trigger after last next has been pushed 
      // and cursor has closed successfully
    }
  })
  // dispose usage
  disposable.dispose()
  // dispose will detach the subscription callbacks
  // if dispose detaches the last subscription, the cursor will be closed
})
```

# License
MIT
