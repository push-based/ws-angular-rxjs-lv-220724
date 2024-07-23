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
  withLatestFrom,
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
        <p>{{ vm.movies.error.name }}: {{ vm.movies.error.message }}</p>
        <div><fast-svg name="sad" size="350" /></div>
      } @else {
        <movie-list
          [favoriteMovieIds]="vm.favoriteIds"
          [favoritesLoading]="vm.favoritesLoading"
          (favoriteToggled)="toggleFavorite$.next($event)"
          [movies]="vm.movies.data!"
        />
        <div (elementVisible)="paginate$.next()"></div>
      }
    }
  `,
  standalone: true,
  imports: [
    MovieListComponent,
    ElementVisibilityDirective,
    FastSvgComponent,
    AsyncPipe,
  ],
})
export class MovieListPageComponent {
  private activatedRoute = inject(ActivatedRoute);
  private movieService = inject(MovieService);

  // trigger
  toggleFavorite$ = new Subject<TMDBMovieModel>();
  paginate$ = new Subject<void>();

  // state
  movies$ = this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params.category) {
        return this.paginate((page) => {
          return this.movieService.getMovieList(params.category, page);
        }).pipe(suspensify<TMDBMovieModel[] | null>(null, { count: 0 }));
      } else {
        return this.paginate((page) => {
          return this.movieService.getMoviesByGenre(params.id, page);
        }).pipe(suspensify<TMDBMovieModel[] | null>(null, { count: 0 }));
      }
    }),
  );

  state = rxState<{
    movies: Suspensify<TMDBMovieModel[] | null>;
    favoriteIds: Set<string>;
    favoritesLoading: Set<string>;
  }>(({ set, select, get, connect }) => {
    // set initial state
    set({
      favoriteIds: new Set<string>(),
      favoritesLoading: new Set<string>(),
    });

    // connect favoriteIds
    connect(
      'favoriteIds',
      this.movieService
        .getFavoriteMovies()
        .pipe(map((movies) => new Set(movies.map((movie) => movie.id)))),
    );

    // connect movieState slice
    connect('movies', this.movies$);

    // connect { favoriteIds } & { favoritesLoading } slice
    connect(
      this.toggleFavorite$.pipe(
        groupBy((movie) => movie.id),
        mergeMap((movie$) => {
          return movie$.pipe(
            exhaustMap((movie) => {
              return this.movieService.toggleFavorite(movie).pipe(
                withLatestFrom(
                  select('favoriteIds'),
                  select('favoritesLoading'),
                ),
                map(([isFavorite, favoriteIds, favoritesLoading]) => {
                  if (isFavorite) {
                    favoriteIds.add(movie.id);
                  } else {
                    favoriteIds.delete(movie.id);
                  }
                  favoritesLoading.delete(movie.id);
                  return {
                    favoriteIds: new Set(favoriteIds),
                    favoritesLoading: new Set(favoritesLoading),
                  };
                }),
                startWith<{
                  favoritesLoading: Set<string>;
                  favoriteIds?: Set<string>;
                }>({
                  favoritesLoading: new Set(
                    get('favoritesLoading').add(movie.id),
                  ),
                }),
              );
            }),
          );
        }),
      ),
    );
  });

  // viewModel creation
  viewModel$ = this.state.select();

  // state derivation
  favoriteMovies$ = this.state.select(
    ['movies', 'favoriteIds'],
    ({ movies, favoriteIds }) =>
      (movies.data ?? []).filter((movie) => favoriteIds.has(movie.id)),
  );

  private paginate(paginateFn: (page: number) => Observable<TMDBMovieModel[]>) {
    return this.paginate$.pipe(
      startWith(void 0),
      exhaustMap((_, i) => {
        return paginateFn(i + 1);
      }),
      scan((allMovies, pagedMovies) => {
        return [...allMovies, ...pagedMovies];
      }, [] as TMDBMovieModel[]),
    );
  }
}
