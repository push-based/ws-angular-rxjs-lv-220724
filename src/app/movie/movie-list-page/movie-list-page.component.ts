import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FastSvgComponent } from '@push-based/ngx-fast-svg';

import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { MovieListComponent } from '../movie-list/movie-list.component';

@Component({
  selector: 'movie-list-page',
  template: `
    <movie-list [movies]="movies" />
    <!-- <div (elementVisible)=""></div> -->
  `,
  standalone: true,
  imports: [MovieListComponent, ElementVisibilityDirective, FastSvgComponent],
})
export class MovieListPageComponent {
  private activatedRoute = inject(ActivatedRoute);
  private movieService = inject(MovieService);

  movies: TMDBMovieModel[] = [];

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      if (params.category) {
        this.movieService.getMovieList(params.category).subscribe((movies) => {
          this.movies = movies;
        });
      } else {
        this.movieService.getMoviesByGenre(params.id).subscribe((movies) => {
          this.movies = movies;
        });
      }
    });
  }
}
