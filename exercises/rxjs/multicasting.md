# Exercise: Multicasting

# Goal

The goal of this exercise is to get familiar with the concept of `multicasting`. We've introduced a severe
bug in the exercise before, let's check out what the problem is and how to fix!

## 1. Multicasting

Something is wrong with the implementation we did before, can u see what? Open your dev tools network tab
and filter for `xhr` requests. Start scrolling the movie list page and observe the requests being fired.
You will notice that there are 2 requests being made per page as you are scrolling.
This is because now there are 2 subscribers for the `movie$` Observable.

In other words, `movie$` is cold, as the producer is encapsulated within the stream. Every subscriber
starts a completely new stream.

To face this, we have the concept of `multicasting` which allows us to transform our observables from a
`cold`, to a `hot` state.

A `hot` Observable depends on a producer and shares 1 producer across multiple subscribers.

You can choose whichever solution u think fits best to achieve this. Your options are:
* `connectable`
* `connect`
* `shareReplay` -> being removed soon
* `share`

For this use case I recommend going with `share`.

Please apply any multicasting technique to the `movie$` observable in order to share its outcome
across multiple subscribers.

<details>
  <summary>Movie$ multicasting</summary>

```ts
// movie-list-page.component.ts

movie$ = /**/
  share({ connector: () => new ReplaySubject(1), resetOnRefCountZero: true })

```

</details>

Cool, repeat the process from before and see if the duplicated network request is gone.

