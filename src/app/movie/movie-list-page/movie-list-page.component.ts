import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  withLatestFrom,
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
      @if (vm.movieState.suspense) {
        <div class="loader"></div>
      } @else if (vm.movieState.error) {
        <h2>An error occurred</h2>
        <p>{{ vm.movieState.error.name }}: {{ vm.movieState.error.message }}</p>
        <div><fast-svg name="sad" size="350" /></div>
      } @else {
        <movie-list
          [favoriteMovieIds]="vm.favoriteIds"
          [favoritesLoading]="vm.favoritesLoading"
          (favoriteToggled)="toggleFavorite$.next($event)"
          [movies]="vm.movieState.data!"
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
  favoriteIds$ = new BehaviorSubject(new Set<string>());
  favoritesLoading$ = new BehaviorSubject(new Set<string>());

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

  favoriteMovies$ = combineLatest([this.movies$, this.favoriteIds$]).pipe(
    map(([movieState, favoriteIds]) => {
      return (movieState.data ?? []).filter((movie) => {
        return favoriteIds.has(movie.id);
      });
    }),
  );

  viewModel$ = combineLatest({
    movieState: this.movies$,
    favoriteIds: this.favoriteIds$,
    favoritesLoading: this.favoritesLoading$,
  });

  constructor() {
    this.movieService
      .getFavoriteMovies()
      .pipe(takeUntilDestroyed())
      .subscribe((movies) => {
        this.favoriteIds$.next(new Set(movies.map((movie) => movie.id)));
      });
    this.toggleFavorite$
      .pipe(
        groupBy((movie) => movie.id),
        mergeMap((movie$) => {
          return movie$.pipe(
            exhaustMap((movie) => {
              return this.movieService.toggleFavorite(movie).pipe(
                withLatestFrom(this.favoriteIds$, this.favoritesLoading$),
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
                    this.favoritesLoading$.getValue().add(movie.id),
                  ),
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ favoriteIds, favoritesLoading }) => {
        if (favoriteIds) {
          this.favoriteIds$.next(favoriteIds);
        }
        this.favoritesLoading$.next(favoritesLoading);
      });
  }

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
