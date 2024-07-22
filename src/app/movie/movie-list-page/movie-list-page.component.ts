import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';
import { startWith, switchMap } from 'rxjs';

import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    @if (movies$ | async; as movies) {
      <movie-list [movies]="movies" />
      <!-- <div (elementVisible)=""></div> -->
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

  movies$ = this.activatedRoute.params.pipe(
    switchMap((params) => {
      if (params.category) {
        return this.movieService
          .getMovieList(params.category)
          .pipe(startWith(undefined));
      } else {
        return this.movieService
          .getMoviesByGenre(params.id)
          .pipe(startWith(undefined));
      }
    }),
  );
}
