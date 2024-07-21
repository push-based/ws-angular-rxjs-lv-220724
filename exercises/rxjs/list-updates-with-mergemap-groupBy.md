# List Updates w/ mergeMap, groupBy & exhaustMap

We've identified one key flaw in our current implementation of performing list updates. 
All updates are simply processed in parallel, we are not accounting for individual responses. We are ending up giving the user the
possibility to operate on data that is not in sync with our backend. 

We can fix this "easily", by again utilizing the power of rxjs operators, in this case `groupBy` & `exhaustMap`.

## 1. Group, merge and exhaust movie updates

What we want to achieve next is that we omit consequent updates if a request is currently in flight - per movie.

To do this we want to use a combination of `groupBy` & `exhaustMap`. 

### 1.1 group by movie id

First, we want to group all requests being made by the `movie.id`. This will provide us with an individual
trigger stream per movie.

```ts
// movie-list-page.component.ts


import { groupBy } from 'rxjs';

constructor() {
  this.toggleFavorite$
    .pipe(
      groupBy(movie => movie.id),
      /* old logic ... */
    ).subscribe(/*cb*/)
}
```

The outcome of `groupBy(movie => movie.id)` will be `Obervable<Obervable<TMDBMovieModel>>`.

### 1.2 merge & exhaust

Now that we've got 1 stream per movie, we of course want to operate all of them in parallel, so let's use `mergeMap` again for this job!

From within `mergeMap()` we will have access to the `GroupedObservable`:

```ts
mergeMap(movie$ => {
  /* we should exhaust here ;) */
})
```

The final part is to use `exhaustMap` on this individual stream. That enables us to omit consequent updates to an individual movie.

All of our old transformation logic will go inside of the `exhaustMap` callback.

<details>
  <summary>group, merge & exhaust</summary>

```ts

// movie-list-page.component.ts

constructor() {
  this.toggleFavorite$
    .pipe(
      // group updates by id
      groupBy(movie => movie.id),
      // process updates in parallel
      mergeMap(movie$ => {
        return movie$.pipe(
          // exhaust individual streams -> blocking consequent updates
          exhaustMap(movie => /* old update logic */)
        )
      })
      /* old logic ... */
    ).subscribe(/*cb*/)
}
```

</details>

<details>
  <summary>The whole stream</summary>

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

Very good job!! Open the app again and try rage clicking :-D.


## Full Solution

<details>
  <summary>Group & Exhaust update requests: Full solution</summary>

```ts

// movie-list-page.component.ts

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

