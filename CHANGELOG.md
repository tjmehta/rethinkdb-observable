# [2.0.0]
* Simplify logic, by using `rxjs`
* _breaking_ `observable.subscribe` now returns a `Subscription` instead of `Disposable` (`val.unsubscribe()` vs `val.dispose()`).

# [1.0.0]
* Initial implementation w/ 100% test coverage