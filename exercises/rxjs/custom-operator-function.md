## Exercise: Reusable suspensify OperatorFunction

In the exercise before, we've created the `suspensify` behavior for the `MovieSearchPageComponent`. Let's encapsulate this
functionality as a custom `OperatorFunction<T, Suspensify<T>>` in order to make its functionality available for everyone else.

## 0. Create shared/suspensify.ts

Create a new file `shared/suspensify.ts`.

## 1. Move Interface

Move the `Suspensify<T>` interface from `movie-search-page.component.ts` to `shared/suspensify.ts`.

Also `export` the `Suspensify<T>` interface.

<details>
  <summary>shared/suspensify.ts</summary>

```ts
// shared/suspensify.ts

export interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

```

</details>

## 2. implement reusable suspensify OperatorFunction

Now it's time to expose the whole concept of suspensify to other consumers. It would be extremely benefitial to have
the initial value configurable, so that's what we are going to do ;).

### 2.1 Skeleton implementation

Create and export a function `suspensify` as part of the `shared/suspensify.ts`. 

You can use the following snippet as a starting point:

```ts
// shared/suspensify.ts

export interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

export const suspensify = (initialValue: T): OperatorFunction<
  T,
  Suspensify<T>
> => {
  return (o$: Observable<T>) => o$;
};
```

### 2.2 Move logic from MovieSearchPageComponent

Move the `map`, `startWith` and `catchError` operators from `movie-list-page.component` to the `suspensify` function.
Apply them to the inner `o$`.

Also make use of the new `initialValue` argument. Apply it for the return values of the `startWith` and `catchError` phases.

Optionally also include the `retry`, even though this isn't required.

<details>
  <summary>reusalbe suspensify implementation</summary>

```ts
// shared/suspensify.ts

import {
  catchError,
  map,
  Observable,
  of,
  OperatorFunction,
  startWith,
} from 'rxjs';

export interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

export const suspensify = <T>(
  initialValue: T,
): OperatorFunction<T, Suspensify<T>> => {
  return (o$: Observable<T>) =>
    o$.pipe(
      map((data) => ({
        suspense: false,
        data,
        error: false,
      })),
      startWith({
        suspense: true,
        error: false,
        data: initialValue,
      }),
      catchError((e) => {
        console.error('an error occurred', e);
        return of({
          error: true,
          suspense: false,
          data: initialValue,
        });
      }),
    );
};


```

</details>

Great, now that we have a working custom operator, let's make use of it.

## 3. Apply suspensify

We of course want to apply `suspensify` to all service calls being made against `movieService`. Let's start with the `MovieSearchPageComponent`.
You can also optionally introduce it to the `MovieListPageComponent`.

### 3.1 MovieListPageComponent: suspensify usage

We need to take the following actions:

1. adjust the typing of `movies$` to be `movies$: Observable<Suspensify<TMDBMovieModel[]>>`.
2. apply the `suspensify()` custom operator to  `movieService.searchMovie` 
3. use `[]` as empty value. If in `strict` mode, you need to manually cast it to be `TMDBMovieModel[]`: `suspensify([] as TMDBMovieModel[])`

<details>
  <summary>suspensify in MovieSearchPageComponent</summary>

```ts
import { Suspensify, suspensify } from '../../shared/suspensify';


movies$: Observable<Suspensify<TMDBMovieModel[]>> =
  this.activatedRoute.params.pipe(
    switchMap((params) => {
      return this.movieService
        .searchMovies(params['query'])
        .pipe(suspensify([] as TMDBMovieModel[]));
    }),
  );

```

</details>

### 3.2 suspensify in MovieListPageComponent

Also apply the `suspensify` custom operator also to the `MovieListPageComponent`. For this you need to do similar
steps as for the `MovieSearchPageComponent` + adjust the template.

<details>
  <summary>Apply suspensify</summary>

```ts

// movie-list-page.component.ts

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

```

</details>

Great! Now we only need to adjust the template so that we are able to see the result.

<details>
  <summary>MovieListPageComponent template</summary>

```html

@if (movies$ | async; as state) {
  @if (state.suspense) {
    <div class="loader"></div>
  } @else if (state.error) {
    <h2>An error occurred</h2>
    <div>
      <fast-svg size="350" name="sad" />
    </div>
  } @else {
    <movie-list
      [movies]="state.data"
      (favoriteToggled)="toggleFavorite$.next($event)"
      [favoritesLoading]="(favoritesLoading$ | async)!"
      [favoriteMovieIds]="(favoriteIds$ | async)!"
    />
    <div (elementVisible)="paginate$.next()"></div>
  }
}

```

</details>

Good job! See if the loading spinner implementation is working when navigating between pages.

## Full Solution

<details>
  <summary>MovieSearchPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { Observable, switchMap } from 'rxjs';

import { TMDBMovieModel } from '../../shared/model/movie.model';
import { Suspensify, suspensify } from '../../shared/suspensify';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

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
        return this.movieService
          .searchMovies(params['query'])
          .pipe(suspensify([] as TMDBMovieModel[]));
      }),
    );
}


```

</details>

<details>
  <summary>MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  BehaviorSubject,
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
import { suspensify } from '../../shared/suspensify';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
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
        <movie-list
          [movies]="state.data"
          (favoriteToggled)="toggleFavorite$.next($event)"
          [favoritesLoading]="(favoritesLoading$ | async)!"
          [favoriteMovieIds]="(favoriteIds$ | async)!"
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

  paginate$ = new Subject<void>();
  toggleFavorite$ = new Subject<TMDBMovieModel>();

  favoritesLoading$ = new BehaviorSubject<Set<string>>(new Set<string>());
  favoriteIds$ = new BehaviorSubject<Set<string>>(new Set<string>());

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

  constructor() {
    this.movieService.getFavoriteMovies().subscribe((favorites) => {
      this.favoriteIds$.next(new Set(favorites.map((favorite) => favorite.id)));
    });
    this.toggleFavorite$
      .pipe(
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
