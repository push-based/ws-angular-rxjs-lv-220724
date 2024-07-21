# Contextual Template States & Error Handling

In this exercise we will get to know different techniques to maintain contextual states provided by asynchronous data
structures in the template.

![img.png](../images/contextual-template-states.png)

## Goal

The goal of this exercise is to learn how to make use of contextual template states in order to provide the users of your
application a better experience consuming it. On top of that you will learn how to implement contextual template states
in a very developer friendly way.

In this exercise we want to combine several rxjs operators to implement a dataflow that transform a network request
into a stateful stream that represents `suspense`, `error` & `next` states.

The general pattern behind it looks like this:

**Very high level**

```ts

trigger$.pipe(
  switchMap(() => fetch().pipe(
    map(), // transform into value state
    startWith(), // start with initial value -> suspend before new data arrives
    catchError() // catch errors and transform into error state
  ))
)
```

**Concrete implementation**
```ts

const state$: Observable<{ error: boolean; suspense: boolean; data: any[]}> = trigger$.pipe(
  switchMap(() => fetchData().pipe(
    map(values => ({ data: values, suspense: false, error: false })), // 👈️ values have arrived
    startWith({
      error: false,
      suspense: true,
      data: []
    }), // 👈️ start with a suspense state
    catchError(() => of({ error: true, data: [], suspense: false })) // 👈️ an error occurred
  ))
)
```

>[!NOTE]
> This exercise is made in the `src/app/movie/movie-search-page/movie-search-page.component.ts` for the sake of simplicity.
> You are reaching it by entering a search term into the search bar in the top bar of the application ;)

## 0. Create `Suspensify` interface

In `movie-search-page.component.ts`, create a new generic `interface Suspensify<T>` that should have the following properties:

* `error: boolean`
* `suspense: boolean`
* `data: T`

<details>
  <summary>interface Suspensify<T></summary>

```ts
// movie-search-page.component.ts

interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

```

</details>

Great, now type the existing `movie$` field to be `Observable<Suspensify<TMDBMovieModel[]>>`

<details>
  <summary>apply Suspensify</summary>

```ts
import { TMDBMovieModel } from '../../shared/model/movie.model';


interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

/**/
export class MovieSearchPageComponent {
  private movieService = inject(MovieService);
  private activatedRoute = inject(ActivatedRoute);
  
  //                👇️👇️👇️
  movies$: Observable<Suspensify<TMDBMovieModel[]>> = this.activatedRoute.params.pipe(
    switchMap((params) => {
      return this.movieService.searchMovies(params['query']);
    }),
  );
}

```

</details>

Well done, let's jump into the first step of this exercise!

## 1. Suspense state

As a first step, let's handle the value transformation & the suspense state of the template (the loader).

### 1.1 Stream transformation

The first goal should be to take care of emitting an initial suspense state as well as transforming
the http result to match the return value of `{ suspense: boolean; error: boolean; data: TMDBMovieModel[] }`.

Use the `map` operator to transform the result into `{ suspense: false, data: movies, error: false }`.

Use `startWith({ suspense: true, error: false, data: [] })` in order to emit the initial suspense state.

> [!NOTE]
> Apply the operators to the `inner` observable: `this.movieService.searchMovies(params['query']).pipe()`

<details>
  <summary>suspensify starting implementation</summary>

```ts

// movie-search-page.component.ts

movies$: Observable<Suspensify<TMDBMovieModel[]>> =
  this.activatedRoute.params.pipe(
    switchMap((params) => {
      return this.movieService.searchMovies(params['query']).pipe(
        map((movies) => ({
          suspense: false,
          data: movies,
          error: false,
        })),
        startWith({
          suspense: true,
          error: false,
          data: [],
        }),
      );
    }),
  );

```

</details>

### 1.2 Adjust template

Of course we also need to adjust our template. The `movies$` observable now actually returns a kind of state.
As such, we need to treat the outer `@if(movies$ | async; as state)` as a wrapper to unpack the value inside of that
very scope.

Let's name it like a `state` in the template and pass `state.movies` to the `<movie-list` component.

```html
@if (movies$ | async; as state) {
  <movie-list [movies]="state.movies" />
}
```

Of course that is only part of the solution. We want to display three different states in the template:

* `suspense`
* `error`
* `data`


Let's build an inner `@if, @else if, @else` control flow to render different templates:

```html
@if (state.suspense) {
  <!--loader-->
} @else if (state.error) {
 <!--error -->
} @else {
  <!-- values -->
  <movie-list [movies]="state.data" />
}
```

For the loader take the following template:

```html
<div class="loader"></div>
```

For the error take the following template:

```html
<h2>An error occurred</h2>
<div>
  <fast-svg size="350" name="sad" />
</div>
```


<details>
  <summary>Adjust template: access suspensify state</summary>

```html
<!-- movie-search-page.component.ts -->

@if (movies$ | async; as state) {
  @if (state.suspense) {
    <div class="loader"></div>
  } @else if (state.error) {
  <h2>An error occurred</h2>
  <div>
    <fast-svg size="350" name="sad" />
  </div>
  } @else {
    <movie-list [movies]="state.data" />
  }
}

```

</details>

## 2. Error Handling

### 2.1 Produce the error

> [!TIP]
> You can produce an error by searching for the keyword `throwError` (case sensitive) in the application.

Please produce an error!

### 2.2 Catch & display the error

You'll notice it's still uncaught inside your components state. Let's introduce a simple error logging mechanism whenever the
search raised an error. Use the `catchError` operator to catch the error.

On top of `map` & `startWith`, apply the `catchError` operator as well to the inner observable.

> [!NOTE]
> `catchError` requires you to return an `Observable`. As we only want to return a static state, use `of()` in order
> to return an `Observable` of a static value.

As we want to display the error message, we want to return the following state:

```ts
{
  error: true,
  suspense: false,
  data: []
}
```

Feel free to add any additional error logging

<details>
  <summary>Catch & display the error</summary>

```ts

// movie-search-page.component.ts


movies$: Observable<Suspensify<TMDBMovieModel[]>> =
  this.activatedRoute.params.pipe(
    switchMap((params) => {
      return this.movieService.searchMovies(params['query']).pipe(
        /* other operators */
        catchError((e) => {
          console.error('an error occurred when searching', e);
          return of({
            error: true,
            suspense: false,
            data: [],
          });
        }),
      );
    }),
  );

```

</details>

Great job! Raise the error again and see if it gets logged into the console as well as the error template is shown.
You should also try to recover from the error state. Test if your application is able to perform another search
after you've shown the error template.

## 3. Retry before showing the error template

Sometimes processes or requests can be retried in order to still get a valid result.
Try to also make use of the `retry` operator so that your failed request is repeated twice before showing the actual error template.

Play around with different configurations, you probably want to use `delay` as well as `count`.

<details>
  <summary>retry before giving up</summary>

```ts

// movie-search-page.component.ts

import { retry } from 'rxjs';


movies$ = this.activatedRoute.params.pipe(
  switchMap((params) => {
    return this.movieService.searchMovies(params['query']);
  }),
  retry({ delay: 1000, count: 2 }),
  catchError(e => {
    console.error('an error occurred when searching', e);
    return NEVER; // return NEVER, as we don't want to send data to the let directive
  })
);

```
</details>

## Full Solution

Below you find the full solution:

<details>
  <summary>Full Solution: MovieSearchPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { catchError, map, Observable, of, retry, startWith, switchMap } from 'rxjs';

import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

@Component({
  selector: 'movie-search-page',
  template: `
    @if (movies$ | async; as state) {
      @if (state.suspense) {
        <div class="loader"></div>
      } @else if (state.error) {
        <h2>An error occurred</h2>
        <div>
          <fast-svg size="350" name="sad" />
        </div>
      } @else {
        <movie-list [movies]="state.data" />
      }
    }
  `,
  standalone: true,
  imports: [MovieListComponent, AsyncPipe, FastSvgComponent],
})
export class MovieSearchPageComponent {
  private movieService = inject(MovieService);
  private activatedRoute = inject(ActivatedRoute);

  movies$: Observable<Suspensify<TMDBMovieModel[]>> =
    this.activatedRoute.params.pipe(
      switchMap((params) => {
        return this.movieService.searchMovies(params['query']).pipe(
          map((movies) => ({
            suspense: false,
            data: movies,
            error: false,
          })),
          startWith({
            suspense: true,
            error: false,
            data: [],
          }),
          retry({ count: 2, delay: 1000 }),
          catchError((e) => {
            console.error('an error occurred when searching', e);
            return of({
              error: true,
              suspense: false,
              data: [],
            });
          }),
        );
      }),
    );
}


```

</details>
