import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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
        [favoriteMovieIds]="(favoriteIds$ | async)!"
        [favoritesLoading]="(favoritesLoading$ | async)!"
        (favoriteToggled)="toggleFavorite$.next($event)"
        [movies]="movies"
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
        }).pipe(startWith(undefined));
      } else {
        return this.paginate((page) => {
          return this.movieService.getMoviesByGenre(params.id, page);
        }).pipe(startWith(undefined));
      }
    }),
  );

  constructor() {
    this.toggleFavorite$
      .pipe(
        mergeMap((movie) =>
          this.movieService.toggleFavorite(movie).pipe(
            map((isFavorite) => {
              const favoriteIds = this.favoriteIds$.getValue();
              if (isFavorite) {
                favoriteIds.add(movie.id);
              } else {
                favoriteIds.delete(movie.id);
              }
              const favoritesLoading = this.favoritesLoading$.getValue();
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
