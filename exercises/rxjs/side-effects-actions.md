# Actions & Side Effects: MovieStore

Actions are a way to encapsulate side effects in a reactive way. Let's build a store like implementation
that makes use of `rxActions` as triggers & `rxState` as value storage.

As of right now, we've used `Subject`s as our event triggers. While this works, it's neither scalable, nor handy to use.
In this exercise, you'll learn other approaches on how to implement actions / event streams withing your application.


## 1. create `rxActions`

It's time to get introduced to `rxActions` from the `@rx-angular/state/actions` package.

Instead of using `Subject`s as triggers, we actually want to use `rxActions`. Create a new property `actions = rxActions()` in the `MovieListPageComponent`.

We want to have three actions as trigger points:

```ts
{
  loadMovies: Params;
  paginate: void;
  toggleFavorite: TMDBMovieModel;
}
```

<details>
  <summary>create rxActions</summary>

```ts

// movie-list-page.component.ts

import { rxActions } from '@rx-angular/state/actions';

actions = rxActions<{
  loadMovies: Params;
  paginate: void;
  toggleFavorite: TMDBMovieModel;
}>();

```

</details>

## 2. Use `rxActions`

Let's use the newly created `actions`!

### 2.1 Replace `toggleFavorite$` Subject with `actions.toggleFavorite$`

* listen this action via `actions.toggleFavorite$`.
* dispatch the action via `actions.toggleFavorite()`
* Replace the usages of `toggleFavorite$` accordingly and remove the subject.

<details>
  <summary>ToggleFavorite Action Solution</summary>

```ts
// movie-list-page.component.ts

connect(
  this.actions.toggleFavorite$, // 👈️
  /*...*/
)

```

```html
<!-- movie-list-page.component.ts -->

<div class="favorite-widget">
  @for (fav of favoriteMovies$ | async; track fav.id) {
  <!--                         👇️👇️👇️👇️ -->
    <span (click)="actions.toggleFavorite(fav)">{{ fav.title }}</span>

    @if (!$last) {
      <span>•</span>
    }
  }
</div>


<!--                            👇️👇️👇️👇️ -->
<movie-list
  [movies]="vm.movies.data"
  (favoriteToggled)="actions.toggleFavorite($event)"
  [favoritesLoading]="vm.favoritesLoading"
  [favoriteMovieIds]="vm.favoriteIds"
/>

```

</details>

Well done, make sure your application is still working. Try to toggle the favorite state of a movie.

### 2.2 Replace `paginate$` with actions

* listen this action via `actions.paginate$`.
* dispatch the action via `actions.paginate()`
* Replace the usages of `paginate$` accordingly and remove the subject.

<details>
  <summary>replace paginate$ with actions.paginate$</summary>

```ts

private paginate(
    requestFn: (page: number) => Observable<TMDBMovieModel[]>,
  ): Observable<TMDBMovieModel[]> {
    return this.actions.paginate$.pipe( // 👈️
      startWith(void 0),
      exhaustMap((v, i) => requestFn(i + 1)),
      scan(
        (allMovies, movies) => [...allMovies, ...movies],
        [] as TMDBMovieModel[],
      ),
    );
  }

```


```html
<!-- movie-list-page.component.ts -->

<!--                            👇️👇️👇️👇️ -->
<div (elementVisible)="actions.paginate()"></div>
```


</details>

### 2.3 Replace `activatedRoute.params` with `loadMovies$`

* listen this action via `actions.loadMovies$` instead of `this.activatedRoute.params`.
* dispatch the action via `this.activatedRoute.params.subscribe(params => this.actions.loadMovies(params))`
  * create a new subscription in the `constructor`

<details>
  <summary>Replace `activatedRoute.params` with `loadMovies$`</summary>

```ts
//                          ️👇️👇️
movies$ = this.actions.loadMovies$.pipe(
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

constructor() {
  //                👇️👇️
  this.activatedRoute.params
    .pipe(takeUntilDestroyed())
    .subscribe((params) => this.actions.loadMovies(params));
}

```

</details>

Great job! I hope you are enjoying the current state of your application. Please try out if all features are still working as expected.

## 3. BONUS: use `rxEffect`

When creating subscriptions, you always have to deal with unsubscribing from them. Let me introduce you to a nice
little helper that can take of that for you: `rxEffects`.

With `rxEffects`, you can `register` side-effects, which are automatically unsubscribed, when the subscribing component
gets destroyed - so you don't have to take care about it anylonger.

It shares the same API concept as `rxActions` & `rxState`: create it by calling its creation function.

```ts
// movie-list-page.component.ts

effects = rxEffects(({ register }) => {
  
});
```

Now, let's use the `register` function to subscribe to the `activatedRoute.params` and dispatch the action on
the callback handler.

```ts
// movie-list-page.component.ts
import { rxEffects } from '@rx-angular/state/effects';

effects = rxEffects(({ register }) => {
  register(this.activatedRoute.params, (params) =>
    this.actions.loadMovies(params),
  );
});
```

Great, now get rid of the constructor again ;).

## Full Solution MovieListPageComponent

<details>
  <summary>MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import { rxEffects } from '@rx-angular/state/effects';
import {
  exhaustMap,
  groupBy,
  map,
  mergeMap,
  Observable,
  scan,
  startWith,
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
        <span (click)="actions.toggleFavorite(fav)">{{ fav.title }}</span>

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
          (favoriteToggled)="actions.toggleFavorite($event)"
          [favoritesLoading]="vm.favoritesLoading"
          [favoriteMovieIds]="vm.favoriteIds"
        />
        <div (elementVisible)="actions.paginate()"></div>
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

  actions = rxActions<{
    loadMovies: Params;
    paginate: void;
    toggleFavorite: TMDBMovieModel;
  }>();

  movies$ = this.actions.loadMovies$.pipe(
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
      this.actions.toggleFavorite$.pipe(
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

  effects = rxEffects(({ register }) => {
    register(this.activatedRoute.params, (params) =>
      this.actions.loadMovies(params),
    );
  });

  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
  );

  viewModel$ = this.state.select();

  private paginate(
    requestFn: (page: number) => Observable<TMDBMovieModel[]>,
  ): Observable<TMDBMovieModel[]> {
    return this.actions.paginate$.pipe(
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

## 4. BONUS: MovieStore: A Store-Like implementation

> [!NOTE]
> This is a BONUS exercise. You don't have to complete it.

As of now, we've mixed and matched global state with local state. Our component contains a lot of state management code that could also be
part of a service. We now want to create a stateful service, where all the movie state is hold and exposed to the outside.

### 4.1 Build the MovieStore

Your task now will be to extract most of the state management code from `MovieListPageComponent` to the `(src/app/movie/movie.store.ts) MovieStore`.

We are going to keep the local instance of `rxState` in the `MovieListPageComponent`, to still be flexible on the component level.
It is getting adjusted a bit, though.

We are essentially feeding the local state of `MovieListPageComponent` with the global state coming from `MovieStore`.

The file (`MovieStore`) already exists with a boilerplate ready to use.

Go ahead and move the following things to the `MovieStore`:

* `state setupFn ({ connect, set, get })` & everything related (e.g `movie$`)
* `favoriteMovies$ Observable`

Also expose:
* `movies$ = this.state.select('movies')`
* `favoriteIds$` = this.state.select('favoriteIds')`
* `favoritesLoading$ = this.state.select('favoritesLoading');`

<details>
  <summary>MovieStore implementation</summary>

```ts

import { inject, Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import {
  exhaustMap,
  groupBy,
  map,
  mergeMap,
  Observable,
  scan,
  startWith,
  switchMap,
} from 'rxjs';

import { TMDBMovieModel } from '../shared/model/movie.model';
import { Suspensify, suspensify } from '../shared/suspensify';
import { MovieService } from './movie.service';

@Injectable({ providedIn: 'root' })
export class MovieStore {
  // services

  private movieService = inject(MovieService);

  // actions

  actions = rxActions<{
    loadMovies: Params;
    paginate: void;
    toggleFavorite: TMDBMovieModel;
  }>();

  // state
  state = rxState<{
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
    movies: Suspensify<TMDBMovieModel[]>;
  }>(({ connect, get, set }) => {
    set({
      favoriteIds: new Set<string>(),
      favoritesLoading: new Set<string>(),
    });
    connect(
      'movies',
      this.actions.loadMovies$.pipe(
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
      ),
    );

    connect(
      'favoriteIds',
      this.movieService
        .getFavoriteMovies()
        .pipe(
          map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
        ),
    );

    connect(
      this.actions.toggleFavorite$.pipe(
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

  // selections & derived state

  movies$ = this.state.select('movies');
  favoriteIds$ = this.state.select('favoriteIds');
  favoritesLoading$ = this.state.select('favoritesLoading');

  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
  );

  private paginate(
    requestFn: (page: number) => Observable<TMDBMovieModel[]>,
  ): Observable<TMDBMovieModel[]> {
    return this.actions.paginate$.pipe(
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

### 4.2 Use the MovieStore

Great, as a final step you want to of course use the new service in the `MovieListPageComponent`.

#### 4.2.1 inject MovieStore

`inject` the `MovieStore` into the `MovieListPageComponent`:

```ts
movieStore = inject(MovieStore);
```

#### 4.2.2 Remove Actions

Remove the `actions` field from the `MovieListPageComponent`, we don't need it anymore.

#### 4.2.3 Feed local state

Simplify the `rxState` setupFn to only do:

```ts
connect('movies', this.movieStore.movies$);

connect('favoriteIds', this.movieStore.favoriteIds$);

connect('favoritesLoading', this.movieStore.favoritesLoading$);
```

#### 4.2.4 Re-use `favoriteMovies$`

Re use the `favoriteMovies$` from the `movieStore`:

```ts

favoriteMovies$ = this.movieStore.favoriteMovies$;

```

#### 4.2.5 Dispatch `MovieStore` actions

```ts
effects = rxEffects(({ register }) => {
  register(this.activatedRoute.params, (params) =>
    //                👇️👇️👇️
    this.movieStore.actions.loadMovies(params),
  );
});
```

```html
<div class="favorite-widget">
  @for (fav of favoriteMovies$ | async; track fav.id) {
    <!--                            👇️👇️👇️ -->
    <span (click)="movieStore.actions.toggleFavorite(fav)">{{ fav.title }}</span>

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
      <!--                            👇️👇️👇️ -->
      <movie-list
        [movies]="vm.movies.data"
        (favoriteToggled)="movieStore.actions.toggleFavorite($event)"
        [favoritesLoading]="vm.favoritesLoading"
        [favoriteMovieIds]="vm.favoriteIds"
      />
      <!--                            👇️👇️👇️ -->
      <div (elementVisible)="movieStore.actions.paginate()"></div>
  }
}
```

Very nice job. Your `MovieListPageComponent` now should look very clean and has a clear flow of events.

## Full Solution

<details>
  <summary>MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { rxState } from '@rx-angular/state';
import { rxEffects } from '@rx-angular/state/effects';

import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { TMDBMovieModel } from '../../shared/model/movie.model';
import { Suspensify } from '../../shared/suspensify';
import { MovieStore } from '../movie.store';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    <div class="favorite-widget">
      @for (fav of favoriteMovies$ | async; track fav.id) {
        <span (click)="movieStore.actions.toggleFavorite(fav)">{{
          fav.title
        }}</span>

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
          (favoriteToggled)="movieStore.actions.toggleFavorite($event)"
          [favoritesLoading]="vm.favoritesLoading"
          [favoriteMovieIds]="vm.favoriteIds"
        />
        <div (elementVisible)="movieStore.actions.paginate()"></div>
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
  private activatedRoute = inject(ActivatedRoute);
  movieStore = inject(MovieStore);

  state = rxState<{
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
    movies: Suspensify<TMDBMovieModel[]>;
  }>(({ connect }) => {
    connect('movies', this.movieStore.movies$);

    connect('favoriteIds', this.movieStore.favoriteIds$);

    connect('favoritesLoading', this.movieStore.favoritesLoading$);
  });

  effects = rxEffects(({ register }) => {
    register(this.activatedRoute.params, (params) =>
      this.movieStore.actions.loadMovies(params),
    );
  });

  favoriteMovies$ = this.movieStore.favoriteMovies$;

  viewModel$ = this.state.select();
}


```

</details>

<details>
  <summary>MovieStore</summary>

```ts

import { inject, Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import {
  exhaustMap,
  groupBy,
  map,
  mergeMap,
  Observable,
  scan,
  startWith,
  switchMap,
} from 'rxjs';

import { TMDBMovieModel } from '../shared/model/movie.model';
import { Suspensify, suspensify } from '../shared/suspensify';
import { MovieService } from './movie.service';

@Injectable({ providedIn: 'root' })
export class MovieStore {
  // services

  private movieService = inject(MovieService);

  // actions

  actions = rxActions<{
    loadMovies: Params;
    paginate: void;
    toggleFavorite: TMDBMovieModel;
  }>();

  // state
  state = rxState<{
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
    movies: Suspensify<TMDBMovieModel[]>;
  }>(({ connect, get, set }) => {
    set({
      favoriteIds: new Set<string>(),
      favoritesLoading: new Set<string>(),
    });
    connect(
      'movies',
      this.actions.loadMovies$.pipe(
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
      ),
    );

    connect(
      'favoriteIds',
      this.movieService
        .getFavoriteMovies()
        .pipe(
          map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
        ),
    );

    connect(
      this.actions.toggleFavorite$.pipe(
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

  // selections & derived state

  movies$ = this.state.select('movies');
  favoriteIds$ = this.state.select('favoriteIds');
  favoritesLoading$ = this.state.select('favoritesLoading');

  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
  );

  private paginate(
    requestFn: (page: number) => Observable<TMDBMovieModel[]>,
  ): Observable<TMDBMovieModel[]> {
    return this.actions.paginate$.pipe(
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
