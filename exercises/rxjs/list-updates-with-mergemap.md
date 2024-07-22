# List Updates w/ mergeMap

We want to display and manipulate the `favorite` state of a movie in the `MovieListPageComponent`.

## 0. Prepare triggers and state

Our final goal is to display a `loading` & `isFavorite` state for each movie in our list. We need two container state
hold our state as well as a trigger that kicks off the process on user interaction.

Create three fields in the `MovieListPageComponent`:

* trigger to kick off state manipulation: `toggleFavorite$ = new Subject<TMDBMovieModel>();`
* state container to show loading state: `favoritesLoading$ = new BehaviorSubject<Set<string>>(new Set<string>());`
* state container to show favorite state: `favoriteIds$ = new BehaviorSubject<Set<string>>(new Set<string>());`

<details>
  <summary>State & Trigger setup: MovieListPageComponent</summary>

```ts
// movie-list-page.component.ts


// trigger to kick off state manipulation
toggleFavorite$ = new Subject<TMDBMovieModel>();

// state container to show loading state
favoritesLoading$ = new BehaviorSubject<Set<string>>(new Set<string>());
// state container to show favorite state
favoriteIds$ = new BehaviorSubject<Set<string>>(new Set<string>());
```

</details>

You can also connect the state & triggers to the template already.

Put the following inputs/outputs to the `movie-list` component in your template:
* `[favoritesLoading]="(favoritesLoading$ | async)!" the `!` in the end is because the async pipe has `| null` typing...
* `[favoriteMovieIds]="(favoriteIds$ | async)!"` the `!` in the end is because the async pipe has `| null` typing...
* `(favoriteToggled)="toggleFavorite$.next($event)"`

<details>
  <summary>Connect state & triggers to template</summary>

```html
<!-- movie-list-page.component.ts -->

@if (movies$ | async; as movies) {
  <movie-list
    [movies]="movies"
    (favoriteToggled)="toggleFavorite$.next($event)"
    [favoritesLoading]="(favoritesLoading$ | async)!"
    [favoriteMovieIds]="(favoriteIds$ | async)!"
  />
  <div (elementVisible)="paginate$.next()"></div>
} @else {
  <div class="loader"></div>
}

```

</details>

Great, you are all set to implement to RxJS fun ;)

## 1. Favorite Movie Id Storage

The `MovieService` already offers APIs in order to receive and update favorite movies. The API is a mocked asynchronous backend,
so expect some delay when interacting with it. 

We can use:

* `movieService.toggleFavorite(movie)` -> returns `Observable<boolean>` -> true means is now a favorite. False means, isn't a favorite anymore
* `movieService.getFavoriteMovies()` -> returns `Observable<TMDBMovieModel[]>`

In order to display the currently stored favorite movies, we need to fetch the favorite list from the `MovieService`.
We want to fill the `favoriteIds$` with the data coming from the `getFavoriteMovies()` API from the `MovieService`.

Call the `movieService.getFavoriteMovies()` in the constructor. Subscribe to it and transform the result into a `Set<string>`.

This is the transformation function:

```ts
(favorites) => {
    this.favoriteIds$.next(new Set(favorites.map((favorite) => favorite.id)));
}
```

<details>
  <summary>fetch data & fill state</summary>

```ts
// movie-list-page.component.ts

favoriteIds$ = new BehaviorSubject<Set<string>>(new Set<string>());

constructor() {
  this.movieService.getFavoriteMovies().subscribe((favorites) => {
    this.favoriteIds$.next(new Set(favorites.map((favorite) => favorite.id)));
  });
}
```

</details>

Cool, you can inspect the console and see if the call is being made. Note, that this is not a real http call, it's just a delay ;).

## 2. Toggle Favorite Movie State

As for now, the favorite state is read only. Let's implement functionality to let users also update the favorite state.
We need to add one more thing to make it happen, as the trigger is already implemented.

Add a subscription that updates the value at service level as well as the local state for displaying purposes.

We want to subscribe to the trigger and call the `toggleFavorite()` method of the `MovieService`. As soon as the callback
returns a result, we update our local `favoriteIds$` to reflect the state change.

> [!NOTE]
> `toggleFavorite()` returns a boolean indicating if the given movie was added or removed from the favorites.

As the updates for the list items should not abort or wait on each other, we want to make use of `mergeMap` to let all triggered events
run in parallel.

Long story short, we want to transform `this.toggleFavorite$: Observable<TMDBMovieModel>` into `Observable<{ favoriteIds: Set<string> }>`.

Perform the following steps:

* in the constructor, call `this.toggleFavorite$.subscribe()`
* apply the `mergeMap` pipe and return `this.movieService.toggleFavorite(movie)`
  * use the `map` operator to transform the result into `{ favoriteIds: Set<string> }` based on the toggleFavorite response.
  * true -> `this.favoriteIds$.getValue().add(movie.id)`
  * false -> `this.favoriteIds$.getValue().delete(movie.id)`
  * `return { favoriteIds: new Set(this.favoriteIds$.getValue()) }`
* `subscribe(({ favoriteIds }) => this.favoriteIds$.next(favoriteIds))`

U might want to use the following skeleton as starting point:

<details>
  <summary>MovieListPageComponent: </summary>

```ts

// movie-list-page.component.ts

constructor() {
  this.toggleFavorite$.pipe(
    mergeMap(movie => this.movieService.toggleFavorite(movie).pipe(
      /* compute new favorites based on the result */
      /* if you need help, take a look at the next help block */
      /* return { favoriteIds: Set<string> } */
    ))
  ).subscribe(({ favoriteIds }) => this.favoriteIds$.next(favoriteIds))
}
```

</details>

Apply the `map` operator to calculate the new Set after the response has arrived.

<details>
  <summary>Transformation of toggleFavorite Result</summary>

This is the transformation function to build the new favoritesMap after receiving the update from the MovieService

```ts

map((isFavorite) => {
  const favorites = this.favoriteIds$.getValue();
  if (isFavorite) {
    favorites.add(movie.id);
  } else {
    favorites.delete(movie.id);
  }
  return {
    favorites: new Set(favorites)
  };
}),

```
</details>

Nice, run the application and test out your result :). You should be able to manipulate the favorite state
of movies. It should also be possible to process multiple updates at once.

Note what happens when rage clicking, though ;)

The fix is waiting in the next exercise!

## 3. Loading State

We've also added a state container holding information what movies are currently in a loading process.

Finally, we also want to give users an idea about that something is actually going on.

For this, we need to do small adjustments to the state flow we have introduced before.
Instead of only calculation the `favoriteIds`, we can simultaneously calculate the `favoritesLoading` set as well.

### 3.1 reset loading state after response

We know for sure that we want to reset the loading state for a given movie whenever we've received a response from
the `toggleFavorite` method.

Instead of returning only `{ favoriteIds: Set<string> }` we want to return `{ favoriteIds: Set<string>; favoritesLoading: Set<string>; }`, so that we can
update `this.favoritesLoading$` from within the subscription.

Let's introduce the state update within the `map` and return `{ favoriteIds: Set<string>; favoritesLoading: Set<string>; }`.

Use the `.delete(movie.id)` method on the `this.favoritesLoading$.getValue()` set.

```ts
// compute new favoritesLoading set & new return value snippet

const favoritesLoading = this.favoritesLoading$.getValue();
favoritesLoading.delete(movie.id);
return {
  favoriteIds: new Set(favorites),
  favoritesLoading: new Set(favoritesLoading),
};
```

Also adjust the `.subscribe` callback to also call `this.favoritesLoading$.next(favoritesLoading);`

```ts
({ favoriteIds, favoritesLoading }) => {
  this.favoriteIds$.next(favoriteIds);
  this.favoritesLoading$.next(favoritesLoading);
}
```


<details>
  <summary>Solution: reset loading state after response</summary>

```ts

// movie-list-page.component.ts

constructor() {
  this.toggleFavorite$
    .pipe(
      mergeMap((movie) =>
        this.movieService.toggleFavorite(movie).pipe(
          map((isFavorite) => {
            const favorites = this.favoriteIds$.getValue();
            if (isFavorite) {
              favorites.add(movie.id);
            } else {
              favorites.delete(movie.id);
            }
            const favoritesLoading = this.favoritesLoading$.getValue();
            favoritesLoading.delete(movie.id);
            return {
              favoriteIds: new Set(favorites),
              favoritesLoading: new Set(favoritesLoading),
            };
          })
        ),
      ),
    )
    .subscribe(({ favoriteIds, favoritesLoading }) => {
      this.favoriteIds$.next(favoriteIds);
      this.favoritesLoading$.next(favoritesLoading);
    });
}

```

</details>

### 3.2 set loading state on each trigger

We know that we want to set a movie to a loading state on each trigger.
Let's introduce a `startWith` pipe right after the `map` to kick off each process with a `{ favoritesLoading: Set<string> }` value.

We of course always want to send the updated set with the new movie.id being added. Use the `.add(movie.id)` method.

```ts
startWith({
  favoritesLoading: new Set(
    this.favoritesLoading$.getValue().add(movie.id),
  ),
}),
```

> [!WARNING]
> Typescripts strict mode will warn us about a type mismatch.

Typescript now infers the following type automatically:

```ts
{
  favoritesLoading: Set<string>
} | { favoritesLoading: Set<string>; favoriteIds: Set<string> }

```

Thus, it's not letting us access `favoriteIds` safely. Fix it by telling `startWith` it's of type:

```ts
{
  favoritesLoading: Set<string>;
  favoriteIds?: Set<string>;
}
```

```ts
startWith<{
  favoritesLoading: Set<string>;
  favoriteIds?: Set<string>;
}>({
  favoritesLoading: new Set(
    this.favoritesLoading$.getValue().add(movie.id),
  ),
}),
```

Of course, it's entirely true now, that `results` can be `undefined` at times. We need to account for that
in the subscription callback:

```ts
({ favoriteIds, favoritesLoading }) => {
  if (favoriteIds) {
    this.favoriteIds$.next(favoriteIds);
  }
  this.favoritesLoading$.next(favoritesLoading);
}
```

<details>
  <summary>solution: startWith loading state</summary>

```ts

// movie-list-page.component.ts

constructor() {
  this.toggleFavorite$
    .pipe(
      mergeMap((movie) =>
        this.movieService.toggleFavorite(movie).pipe(
          map((isFavorite) => {
            const favorites = this.favoriteIds$.getValue();
            if (isFavorite) {
              favorites.add(movie.id);
            } else {
              favorites.delete(movie.id);
            }
            const favoritesLoading = this.favoritesLoading$.getValue();
            favoritesLoading.delete(movie.id);
            return {
              favoriteIds: new Set(favorites),
              favoritesLoading: new Set(favoritesLoading),
            };
          }),
          startWith<{
            favoritesLoading: Set<string>;
            favoriteIds?: Set<string>;
          }>({
            favoritesLoading: new Set(
              this.favoritesLoading$.getValue().add(movie.id),
            ),
          }),
        ),
      ),
    )
    .subscribe(({ favoriteIds, favoritesLoading }) => {
      if (favoriteIds) {
        this.favoriteIds$.next(favoriteIds);
      }
      this.favoritesLoading$.next(favoritesLoading);
    });
}

```

</details>

Great job!! See the final result by launching your application. You should now see loading animations per movie
card that you've triggered.

The rage clicking issue still persists though. Going to fix it soon 🤞

## Full Solution

<details>
  <summary>MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  BehaviorSubject,
  exhaustMap,
  map,
  mergeMap,
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
      <movie-list
        [movies]="movies"
        (favoriteToggled)="toggleFavorite$.next($event)"
        [favoritesLoading]="(favoritesLoading$ | async)!"
        [favoriteMovieIds]="(favoriteIds$ | async)!"
      />
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
  toggleFavorite$ = new Subject<TMDBMovieModel>();

  favoritesLoading$ = new BehaviorSubject<Set<string>>(new Set<string>());
  favoriteIds$ = new BehaviorSubject<Set<string>>(new Set<string>());

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

  constructor() {
    this.movieService.getFavoriteMovies().pipe(takeUntilDestroyed()).subscribe((favorites) => {
      this.favoriteIds$.next(new Set(favorites.map((favorite) => favorite.id)));
    });
    this.toggleFavorite$
      .pipe(
        mergeMap((movie) =>
          this.movieService.toggleFavorite(movie).pipe(
            map((isFavorite) => {
              const favorites = this.favoriteIds$.getValue();
              if (isFavorite) {
                favorites.add(movie.id);
              } else {
                favorites.delete(movie.id);
              }
              const favoritesLoading = this.favoritesLoading$.getValue();
              favoritesLoading.delete(movie.id);
              return {
                favoriteIds: new Set(favorites),
                favoritesLoading: new Set(favoritesLoading),
              };
            }),
            startWith<{
              favoritesLoading: Set<string>;
              favoriteIds?: Set<string>;
            }>({
              favoritesLoading: new Set(
                this.favoritesLoading$.getValue().add(movie.id),
              ),
            }),
          ),
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ favoriteIds, favoritesLoading }) => {
        if (favoriteIds) {
          this.favoriteIds$.next(favoriteIds);
        }
        this.favoritesLoading$.next(favoritesLoading);
      });
  }

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
