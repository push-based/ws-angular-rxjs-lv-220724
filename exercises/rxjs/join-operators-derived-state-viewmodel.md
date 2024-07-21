# Exercise: Join Operators - Derived State & ViewModel

# Goal

The goal of this exercise is to get familiar with the very basic concepts of state management with rxjs: 

* join operators
* derived state

## 1. Derived State: Show Currently visible favorites

We now want to show the user the currently visible amount of favorite movies as a numeric value on the screen.
Until now, we stored single state slices in different observable sources. Let's combine multiple slices together
to form a derived state.

Please use `combineLatest` to compose a new `favoriteMovies$: Observable<TMDBMovieModel[]>` that is a list of all movies 
that are in the favoriteIds set. Use `movies$` & `favoritesMap$` as inputs for it.

* `favoriteMovies$ = combineLatest([ this.movies$, this.favoritesMap$ ])`
* apply the `map` operator, to create the desired outcome:
  * `([movies, favoriteIds]) => movies.data.filter((movie) => favoriteIds.has(movie.id)))`

<details>
  <summary>favoriteMovies$</summary>

```ts
// movie-list-page.component.ts

favoriteMovies$ = combineLatest([this.movies$, this.favoriteIds$]).pipe(
  map(([movies, favoriteIds]) =>
    movies.data.filter((movie) => favoriteIds.has(movie.id)),
  ),
);

```

</details>


We also want to have a widget, that can display the derived state. Use the following template:

```html

<!-- movie-list-page.component.ts -->

<div class="favorite-widget">
  @for (fav of favoriteMovies$ | async; track fav.id) {
    <span (click)="toggleFavorite$.next(fav)">{{ fav.title }}</span>
  
    @if (!$last) {
      <span>•</span>
    }
  }
</div>

<!-- Rest of the template -->
```

Well done! Now run the application and see if the value is displayed and also updated when u change the favorite state of a movie.
You should also notice that clicking on a favorite in the widget causes the loading spinner of the movie-card to be shown ;).

How neat is that?

## 2. Combine state into viewModel$

It is generally good practice to slice your state into viewModels for the usage in the template.
This helps to reduce the usage of `async` pipes in your template and reduces the total amount of subscriptions
being made by your application.
It also is a way to not be forced to introduce multicasting on individual state slices.

Use `combineLatest` to create a `viewModel$` Observable in `MovieListPageComponent` that exposes the following properties
as a key-value object to the template.

> [!TIP]
> `combineLatest` also can take a key-value pair of `{ [key: string]: Observable }`
> Passing: `{ foo: of(42) }` will produce `{ foo: 42 }` as a result. 
> This is the perfect API for building viewModels

```ts
import { combineLatest } from 'rxjs';


viewModel$: Observable<{
  movies: Suspensify<TMDBMovieModel[]>;
  favoriteIds: Set<string>;
  favoritesLoading: Set<string>;
}> = combineLatest({/**/ })
```

<details>
  <summary>Create viewModel$</summary>
 
```ts
// movie-list-page.component.ts

import { combineLatest } from 'rxjs';
import { MovieModel } from './movie-model';

favoriteMovies$: Observable<TMDBMovieModel[]> = combineLatest([
  this.movies$,
  this.favoriteIds$,
]).pipe(
  map(([movies, favoriteIds]) =>
    movies.data.filter((movie) => favoriteIds.has(movie.id)),
  ),
);

viewModel$ = combineLatest({
  movies: this.movies$,
  favoriteIds: this.favoriteIds$,
  favoritesLoading: this.favoritesLoading$
});
```

</details>

Now adjust your template so that it reads from the viewModel$ instead of using single async pipes.

You want to replace the `movies$ | async` outer async pipe wrapper with: `@if (viewModel$ | async; as vm) {}`.

After that you can remove all `async` pipe usages within the viewModel wrapper.

<details>
  <summary>Use viewModel$ in the template</summary>

This is the simple solution. If you like you can delete the `visibleFavorites$` slice, remove the `share`
operator from `movies$` and calculate `visibleFavorites` on the go with an additional `map` operator.

```html
// movie-list-page.component.ts

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
```

</details>

Good job, check your application to see if all interactions still work and your applied changes are properly
reflected.

## Full Solution

<details>
  <summary>MovieListPageComponent</summary>

```ts

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  BehaviorSubject,
  combineLatest,
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

  favoriteMovies$ = combineLatest([this.movies$, this.favoriteIds$]).pipe(
    map(([movies, favoriteIds]) =>
      movies.data.filter((movie) => favoriteIds.has(movie.id)),
    ),
  );

  viewModel$ = combineLatest({
    movies: this.movies$,
    favoriteIds: this.favoriteIds$,
    favoritesLoading: this.favoritesLoading$,
  });

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

