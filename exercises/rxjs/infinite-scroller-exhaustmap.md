# Infinite Scrolling with exhaustMap

We want to deepen our knowledge about higher order observables, by getting familiar with the `exhaustMap` operator.
We will use it in order to implement an infinite scroll solution that paginates http calls on scroll events.

As we don't want to over-fetch or fetch multiple pages at once, `exhaustMap` is the operator of choice. It drops
consequent requests as long as we have a request inflight.

## 1. Infinite Scrolling

> [!NOTE]
> This exercise is being implemented in the `MovieListPageComponent` (`src/app/movie/movie-list-page/movie-list-page.component.ts`)

### 1.2 The Trigger

As a first step we need a trigger that kicks off the process of re-fetching data. 
The template part acting as trigger is already implemented and ready to use. The `ElementVisibilityDirective` emits an event everytime it
is visible to the user, indicating we've reached the bottom of the list and we should start fetching a new page.

In order to have trigger in our component, create a local `paginate$: Subject<void>` and bind it
to the `(elementVisible)` output event of the `ElementVisibildityDirective`.

Create a `<div (elementVisible)="paginate$.next()"></div>` below (as a sibling) of the `<movie-list />` component
in the template of `MovieListPageComponent`.

```html
<movie-list [movies]="movies" />
<div (elementVisible)="paginate$.next()"></div>
```

<details>
  <summary>MovieListPageComponent paginate$ trigger</summary>

```ts

// movie-list-page.component.ts

readonly paginate$ = new Subject<void>();

```

```html

<!-- movie-list-page.component.ts -->

@if (movies$ | async; as movies) {
  <movie-list [movies]="movies" />
  <div (elementVisible)="paginate$.next()"></div>
} @else {
  <div class="loader"></div>
}

```

</details>

Cool, now let's implement the actual pagination logic.

### 1.2 Pagination Skeleton

For our use case, please implement a function `paginate(requestFn: (page: number) => Observable<TMDBMovieModel[]>): Observable<TMDBMovieModel[]>`.
The `paginate` method should take a function that resolves a number input into `Observable<TMDBMovieModel[]>` as input.

This is required as our component is responsible for fetching data from different services, depending on the route we are at. The input
is the function to the service that passes the current page to fetch.


<details>
  <summary>paginate skeleton</summary>

```ts

// movie-list-page.component.ts


private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  /* implementation happens here */
}

```

</details>

You can already go ahead and use the pagination function where it should be. We want to replace the movie fetching
logic within the `movie$` Observable. Instead of returning the service call directly, we call the `paginate`
method and pass the function to it.

Of course, apply the `startWith(undefined)` to each stream!

<details>
  <summary>paginate usage</summary>

```ts

// movie-list-page.component.ts


movies$: Observable<TMDBMovieModel[] | undefined> =
  this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params['category']) {
        return this.paginate((page) =>
          this.movieService.getMovieList(params['category'], page),
        ).pipe(startWith(undefined));
      } else {
        return this.paginate((page) =>
          this.movieService.getMoviesByGenre(params['id'], page),
        ).pipe(startWith(undefined));
      }
    }),
  );

```

</details>


### 1.3 Pagination Core Logic

As we don't want to over-fetch or fetch multiple pages at once, `exhaustMap` is the operator of choice. It drops
consequent requests as long as we have a request inflight.

Now, implement the core logic of the pagination. We want to subscribe to the `paginate$` trigger and `exhaustMap` to the
given `requestFn` input.

In order to accumulate the paged results into a single array, we can use a local cache.

The following steps need to be done:
* create cache: `let cache: TMDBMovieModel[] = [];`
* subscribe to paginate$ as a trigger: `return this.paginate$.pipe()`
* kick off the process immediately on subscription: `startWith(void 0)`
* apply `exhaustMap`
  * in the callback, access the `index` (second argument), as we use it as page for our pagination: `(_, index) => {}`
  * use the `index + 1` as argument for the `requestFn` and return the `cache` + the current result: `requestFn(index + 1).pipe(map((movies) => [...cache, ...movies]))`
* fill cache with latest values `tap(movies => cache = movies)`

Here is the rough concept which can be used as a starting point. It already includes the local cache part.

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  // local array to store all movies
  let cache: TMDBMovieModel[] = [];
  
  return this.paginate$.pipe(
    /* exhaustMap */
    /* -- call requestFn inside */
    tap(movies => cache = movies)
  );
}

```


<details>
  <summary>pagination core logic</summary>

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  // local array to store all movies
  let cache: TMDBMovieModel[] = [];
  return this.paginate$.pipe(
    startWith(void 0),
    exhaustMap((v, i) =>
      // call requestFn with the page parameter, use the index from `exhaustMap`
      // as the index is not 0 based
      requestFn(i + 1).pipe(
        map((movies) => [...cache, ...movies])
      )
    ),
    tap(movies => cache = movies)
  );
}

```

</details>

Open the movie list in your browser and see if your pagination is properly working.


## 2. Bonus: Use scan instead of the local cache

Try and replace the local `cache` array with a cleaner solution by using the `scan` operator.

<details>
  <summary>paginate with scan</summary>

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  return this.paginate$.pipe(
    startWith(void 0),
    exhaustMap((v, i) => requestFn(i + 1)),
    scan((allMovies, movies) => ([
      ...allMovies,
      ...movies
    ]), [] as TMDBMovieModel[])
  );
}

```

</details>

## Full Solution

<details>
  <summary>Infinite Scroller: MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  exhaustMap,
  Observable,
  scan,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    @if (movies$ | async; as movies) {
      <movie-list [movies]="movies" />
      <div (elementVisible)="paginate$.next()"></div>
    } @else {
      <div class="loader"></div>
    }
  `,
  standalone: true,
  imports: [
    MovieListComponent,
    ElementVisibilityDirective,
    AsyncPipe,
    FastSvgComponent,
  ],
})
export class MovieListPageComponent {
  private movieService = inject(MovieService);
  private activatedRoute = inject(ActivatedRoute);

  paginate$ = new Subject<void>();

  movies$: Observable<TMDBMovieModel[] | undefined> =
    this.activatedRoute.params.pipe(
      switchMap((params) => {
        if (params['category']) {
          return this.paginate((page) =>
            this.movieService.getMovieList(params['category'], page),
          ).pipe(startWith(undefined));
        } else {
          return this.paginate((page) =>
            this.movieService.getMoviesByGenre(params['id'], page),
          ).pipe(startWith(undefined));
        }
      }),
    );

  private paginate(
    requestFn: (page: number) => Observable<TMDBMovieModel[]>,
  ): Observable<TMDBMovieModel[]> {
    return this.paginate$.pipe(
      startWith(void 0),
      exhaustMap((v, i) => requestFn(i + 1)),
      scan(
        (allMovies, movies) => [...allMovies, ...movies],
        [] as TMDBMovieModel[],
      ),
    );
  }
}


```

</details>
