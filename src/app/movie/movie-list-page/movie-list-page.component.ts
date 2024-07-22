import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import {
  exhaustMap,
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
      <movie-list [movies]="movies" />
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

  paginate$ = new Subject<void>();

  movies$ = this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params.category) {
        return this.paginate((page) => {
          return this.movieService.getMovieList(params.category, page);
        });
      } else {
        return this.paginate((page) => {
          return this.movieService.getMoviesByGenre(params.id, page);
        });
      }
    }),
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
