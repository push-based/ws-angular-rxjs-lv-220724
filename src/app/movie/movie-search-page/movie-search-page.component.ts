import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  catchError,
  map,
  Observable,
  of,
  retry,
  startWith,
  switchMap,
} from 'rxjs';

import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

interface Suspensify<T> {
  error: boolean;
  suspense: boolean;
  data: T;
}

@Component({
  selector: 'movie-search-page',
  template: `
    @if (movies$ | async; as state) {
      @if (state.suspense) {
        <div class="loader"></div>
      } @else if (state.error) {
        <h2>An error occurred</h2>
        <div><fast-svg name="sad" size="350" /></div>
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
      switchMap((params) =>
        this.movieService.searchMovies(params['query']).pipe(
          map((movies) => {
            return {
              data: movies,
              suspense: false,
              error: false,
            };
          }),
          startWith({
            suspense: true,
            error: false,
            data: [] as TMDBMovieModel[],
          }),
          retry({ count: 2, delay: 1000 }),
          catchError((error) => {
            console.log('an error was thrown', error);
            return of({
              error: true,
              suspense: false,
              data: [] as TMDBMovieModel[],
            });
          }),
        ),
      ),
    );
}
