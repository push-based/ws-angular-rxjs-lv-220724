import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    @if (movies) {
      <movie-list [movies]="movies" />
    }
  `,
  standalone: true,
  imports: [MovieListComponent, ElementVisibilityDirective],
})
export class MovieListPageComponent {
  private movieService = inject(MovieService);
  private activatedRoute = inject(ActivatedRoute);

  movies: TMDBMovieModel[];

  constructor() {}
}
