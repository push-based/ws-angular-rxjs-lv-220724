# Local State with RxState

In this exercise you'll learn how to dramatically reduce the boilerplate of your local state management by using `RxState`.
`RxState` is a tool dedicated for managing reactive component state. 

Up until now, we've treated state as single observable slices. While it is effective for now, it won't be able to scale and is hard to maintain.
We have to manually maintain subscriptions, have high refactoring efforts when changing the behavior of single slices & you can't interact imperatively with your state, to name a few issues.

In a perfect world, our reactive state management is:

* tied to the component lifecycle
* manages subscriptions internally
* easy to construct
* lazy by default -> doesn't require an initial state
* read & write operations reactive as well as imperative
* easy to derive state from stored slices
* is able to manage side effects

And this is exactly what [`@rx-angular/state`](http://www.rx-angular.io/docs/state) provides.

Let's go ahead and improve the boilerplatey `MovieListPageComponent` state step by step!

## 1. Create the state instance

As a first step we want to create an instance of `RxState` by using the new functional API.

The interface of the state should resemble all properties we are right now
maintaining in single observables.

```ts
{
  favoriteIds: Set<string>;
  favoritesLoading: Set<string>;
  movies: Suspensify<TMDBMovieModel[]>;
}
```

Creating an instance of `RxState` is as simple as calling a function:

```ts
import { rxState } from '@rx-angular/state';

state = rxState<{
  favoriteIds: Set<string>;
  favoritesLoading: Set<string>;
  movies: Suspensify<TMDBMovieModel[]>;
}>(() => {
  
});
```

## 2. Initialize the state

The first thing we want to do for our use case to work (this isn't a mandatory step for everyone by any means!)
is to set an initial state.

The `rxState` creation function allows you to directly use its instance API withing
the callback function.

```ts
rxState(({ set, connect, /*... other APIs*/}) => {
  set(initialState);
})
```

Please go ahead and initialize your state to the following value:

```ts
{
  favoritesLoading: new Set<string>(),
  favoriteIds: new Set<string>(),
}
```

<details>
  <summary>Solution: Set initial state</summary>

```ts

private state = rxState<{
  favoriteIds: Set<string>;
  favoritesLoading: Set<string>;
  movies: Suspensify<TMDBMovieModel[]>;
}>(({ connect, get, set }) => {
  set({
    favoritesLoading: new Set<string>(),
    favoriteIds: new Set<string>(),
  });
});

```

</details>

## 3. Connect movies & favorites

Now we can start populating our state with values.

### 3.1 connect movies

Go ahead and connect the paginated movie$ stream to the `movie` key of your state. 

<details>
  <summary>Connect movies</summary>

```ts
// movie-list-page.component.ts

private state = rxState<{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}>(({ connect, get, set }) => {

  /*... code before */

  connect('movies', this.movies$);
})

```

</details>

### 3.2 connect favorites

Also, instead of having a `favoritesIds$: BehaviorSubject`, populate the `favoriteIds` key of your state with
the `movieService.favoriteMovies()` observable.

```ts
connect(
  'favoriteIds',
  this.movieService
    .getFavoriteMovies()
    .pipe(
      map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
    ),
);
```

<details>
  <summary>Connect favorites</summary>

```ts

// movie-list-page.component.ts

private state = rxState<{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}>(({ connect, get, set }) => {

  /*... code before */

  connect(
    'favoriteIds',
    this.movieService
      .getFavoriteMovies()
      .pipe(
        map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
      ),
  );
});
```
</details>

## 4. Handle updates & connect favoritesLoading

The final piece of state connection is the favoritesLoadingMap. By looking at the subscription from before, you will notice
we are updating two different subjects: `favoritesLoading$` and `favoriteIds$`.
Instead of connecting a single key, we now want to connect a partial slice of the state: `{ favoriteIds, favoritesLoading }`.

The task is quite strait forward. Move everything from the `this.toggleFavorite$.pipe()` besides the `.subscribe` part into
the init function of `rxState`. Populate the partial values by `connect(this.toggleFavorite$.pipe(/* all the pipes */))` to the state.
That stream already returns a valid Partial<State> of our `rxState` implementation.

### 4.1 Move the logic

<details>
  <summary>Move updates logic to state</summary>

```ts

private state = rxState<{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}>(({ connect, get, set }) => {
  
  /* code before */

  connect(
    this.toggleFavorite$.pipe(
      groupBy((movie) => movie.id),
      mergeMap((movie$) =>
        movie$.pipe(
          exhaustMap((movie) =>
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
        ),
      ),
    ),
  );
});

```

</details>

Great, the constructor should be empty now!

### 4.2 Use the right values

Right now, our logic still accesses the wrong state containers for the re-computation: `favoriteIds$.getValue()` & `favoritesLoading$.getValue()`.

Instead of using those two APIs, replace them by using the `get` method from rxState. You can use `get('favoriteIds')` & `get('favoritesLoading')`.

<details>
  <summary>Use the right values</summary>

```ts

private state = rxState<{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}>(({ connect, get, set }) => {
  
  /* code before */

  connect(
    this.toggleFavorite$.pipe(
      groupBy((movie) => movie.id),
      mergeMap((movie$) =>
        movie$.pipe(
          exhaustMap((movie) =>
            this.movieService.toggleFavorite(movie).pipe(
              map((isFavorite) => {
                const favorites = new Set(get('favoriteIds')); // 👈️👈️
                if (isFavorite) {
                  favorites.add(movie.id);
                } else {
                  favorites.delete(movie.id);
                }
                const favoritesLoading = new Set(get('favoritesLoading')); // 👈️👈️
                favoritesLoading.delete(movie.id);
                return {
                  favoriteIds: favorites, // 👈️👈️
                  favoritesLoading: favoritesLoading, // 👈️👈️
                };
              }),
              startWith<{
                favoritesLoading: Set<string>;
                favoriteIds?: Set<string>;
              }>({
                favoritesLoading: new Set(get('favoritesLoading')).add( // 👈️👈️
                  movie.id,
                ),
              }),
            ),
          ),
        ),
      ),
    ),
  );
});

```

</details>

## 5. Read From State

As a final step we need to properly connect our state to the view, by reading from it.

### 5.1 properly derive favoriteMovies

The `favoriteMovies$` API right now is a `combineLatest` custom operation. Let's adjust the `favoriteMovies$` derived state by using the `select` API from `rxState`.

We can give `this.state.select([])` an array of parameters, telling it what keys we are interested in:

```ts
favoriteMovies$ = this.state.select(['movies', 'favoriteIds'])
```

As a second argument, we can pass a transformation function, to build the array of favorite movies again:

```ts
favoriteMovies$ = this.state.select(
  ['movies', 'favoriteIds'],
  ({ movies, favoriteIds }) =>
    movies.data.filter((movie) => favoriteIds.has(movie.id)),
);
```

### 5.2 properly read viewModel$

Go ahead an also replace the `viewModel$` with the very same approach. You can go the easy way and simply to `viewModel$ = this.state.select()`.
This will return an observable of the whole state object, which anyway is what we have defined as viewModel.

```ts
viewModel$ = this.state.select();
```

### 5.3 clean up -> remove BehaviorSubjects

Finally, as a last step. Remove all of the `BehaviorSubjects` we used as state containers before. 

<details>
  <summary>State after cleanup</summary>

```ts
// movie-list-page.component.ts

class MovieListPageComponent {
  toggleFavorite$ = new Subject<TMDBMovieModel>();

  movies$ = this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params['category']) {
        return this.paginate((page) =>
          this.movieService.getMovieList(params['category'], page),
        ).pipe(suspensify([] as TMDBMovieModel[]));
      } else {
        return this.paginate((page) =>
          this.movieService.getMoviesByGenre(params['id'], page),
        ).pipe(suspensify([] as TMDBMovieModel[]));
      }
    }),
  );

  state = rxState<{
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
    movies: Suspensify<TMDBMovieModel[]>;
  }>(({ connect, get, set }) => {
    set({
      favoritesLoading: new Set<string>(),
      favoriteIds: new Set<string>(),
    });

    connect('movies', this.movies$);

    connect(
      'favoriteIds',
      this.movieService
        .getFavoriteMovies()
        .pipe(
          map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
        ),
    );

    connect(
      this.toggleFavorite$.pipe(
        groupBy((movie) => movie.id),
        mergeMap((movie$) =>
          movie$.pipe(
            exhaustMap((movie) =>
              this.movieService.toggleFavorite(movie).pipe(
                map((isFavorite) => {
                  const favorites = new Set(get('favoriteIds'));
                  if (isFavorite) {
                    favorites.add(movie.id);
                  } else {
                    favorites.delete(movie.id);
                  }
                  const favoritesLoading = new Set(get('favoritesLoading'));
                  favoritesLoading.delete(movie.id);
                  return {
                    favoriteIds: favorites,
                    favoritesLoading: favoritesLoading,
                  };
                }),
                startWith<{
                  favoritesLoading: Set<string>;
                  favoriteIds?: Set<string>;
                }>({
                  favoritesLoading: new Set(get('favoritesLoading')).add(
                    movie.id,
                  ),
                }),
              ),
            ),
          ),
        ),
      ),
    );
  });

  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
  );

  viewModel$ = this.state.select();
}

```
</details>


AMAZING!!!! Run your application and see if everything is working as expected.

We didn't put any new "feature" into the application, but I hope you can feel and experience the improved developer experience
when managing reactive component states.

## Full Solution

<details>
  <summary>MovieListPageComponent w/ rxState</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { rxState } from '@rx-angular/state';
import {
  exhaustMap,
  groupBy,
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
import { Suspensify, suspensify } from '../../shared/suspensify';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    <div class="favorite-widget">
      @for (fav of favoriteMovies$ | async; track fav.id) {
        <span (click)="toggleFavorite$.next(fav)">{{ fav.title }}</span>

        @if (!$last) {
          <span>•</span>
        }
      }
    </div>
    @if (viewModel$ | async; as vm) {
      @if (vm.movies.suspense) {
        <div class="loader"></div>
      } @else if (vm.movies.error) {
        <h2>An error occurred</h2>
        <div>
          <fast-svg size="350" name="sad" />
        </div>
      } @else {
        <movie-list
          [movies]="vm.movies.data"
          (favoriteToggled)="toggleFavorite$.next($event)"
          [favoritesLoading]="vm.favoritesLoading"
          [favoriteMovieIds]="vm.favoriteIds"
        />
        <div (elementVisible)="paginate$.next()"></div>
      }
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

  // triggers 
  paginate$ = new Subject<void>();
  toggleFavorite$ = new Subject<TMDBMovieModel>();

  // resources
  private movies$ = this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params['category']) {
        return this.paginate((page) =>
          this.movieService.getMovieList(params['category'], page),
        ).pipe(suspensify([] as TMDBMovieModel[]));
      } else {
        return this.paginate((page) =>
          this.movieService.getMoviesByGenre(params['id'], page),
        ).pipe(suspensify([] as TMDBMovieModel[]));
      }
    }),
  );

  // state
  state = rxState<{
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
    movies: Suspensify<TMDBMovieModel[]>;
  }>(({ connect, get, set }) => {
    set({
      favoritesLoading: new Set<string>(),
      favoriteIds: new Set<string>(),
    });

    connect('movies', this.movies$);

    connect(
      'favoriteIds',
      this.movieService
        .getFavoriteMovies()
        .pipe(
          map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
        ),
    );

    connect(
      this.toggleFavorite$.pipe(
        groupBy((movie) => movie.id),
        mergeMap((movie$) =>
          movie$.pipe(
            exhaustMap((movie) =>
              this.movieService.toggleFavorite(movie).pipe(
                map((isFavorite) => {
                  const favorites = new Set(get('favoriteIds'));
                  if (isFavorite) {
                    favorites.add(movie.id);
                  } else {
                    favorites.delete(movie.id);
                  }
                  const favoritesLoading = new Set(get('favoritesLoading'));
                  favoritesLoading.delete(movie.id);
                  return {
                    favoriteIds: favorites,
                    favoritesLoading: favoritesLoading,
                  };
                }),
                startWith<{
                  favoritesLoading: Set<string>;
                  favoriteIds?: Set<string>;
                }>({
                  favoritesLoading: new Set(get('favoritesLoading')).add(
                    movie.id,
                  ),
                }),
              ),
            ),
          ),
        ),
      ),
    );
  });

  // selection
  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
  );

  viewModel$ = this.state.select();

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
