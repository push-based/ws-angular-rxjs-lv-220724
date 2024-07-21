# Exercise: signals-rxjs-interop

In this exercise we will learn more details on how observables and signals match together.

## 1. TiltDirective toSignal

Let's make a simple but very effective refactoring in our `TiltDirective` to turn it into a signal based
directive.

Let's use the `toSignal` method from `@angular/core/rxjs-interop` in order to transform the `rotation` value into
a signal:

```ts
class TiltDirective {
  
  // we need rotate$ and reset$ as class field Observables ;)
  
  rotation = toSignal(
    merge(this.rotate$, this.reset$)
  );
}
```

Finally, use the new signal as `host` binding for `[style.transform]`:

```ts
@Directive({
  selector: '[tilt]',
  standalone: true,
  host: {
    '[style.transform]': 'rotation()'
  }
})
```

<details>
  <summary>TiltDirective signal based</summary>

```ts

@Directive({
  selector: '[tilt]',
  standalone: true,
  host: {
    '[style.transform]': 'rotation()'
  }
})
class TiltDirective {

  rotate$ = fromEvent<MouseEvent>(
    this.elementRef.nativeElement,
    'mouseenter',
  ).pipe(map((event) => this.getRotationDegree(event)));

  reset$ = fromEvent<MouseEvent>(
    this.elementRef.nativeElement,
    'mouseleave',
  ).pipe(map(() => this.getDefaultRotation()));
  
  rotation = toSignal(
    merge(this.rotate$, this.reset$)
  );
}


```

</details>

Of course, delete everything that was in the constructor before.

Very good job, nice and easy ;). Go and try out if the tilt.directive is still doing its job.

## 2. Http w/ toSignal

Open the `MovieDetailPageComponent`. You are presented with a very basic rxjs based implementation to fetch all the necessary data:
* `movie$`
* `credits$`
* `recommendations$`

Your task is to use the `toSignal` method in order to transform all Observables into signals, e.g.:

```ts
import { toSignal } from '@angular/core/rxjs-interop';

movie = toSignal(this.route.params.pipe(
  switchMap((params) =>
    this.movieService.getMovieById(params.id).pipe(startWith(null)),
  ),
));
```

<details>
  <summary>MovieDetailPage: toSignal</summary>

```ts

class MovieDetailPageComponent {

  movie = toSignal(
    this.route.params.pipe(
      switchMap((params) =>
        this.movieService.getMovieById(params.id).pipe(startWith(null)),
      ),
    )
  );

  credits = toSignal(
    this.route.params.pipe(
      switchMap((params) =>
        this.movieService.getMovieCredits(params.id).pipe(startWith(null)),
      ),
    )
  );

  recommendations = toSignal(
    this.route.params.pipe(
      switchMap((params) =>
        this.movieService
          .getMovieRecommendations(params.id)
          .pipe(startWith(null)),
      ),
    )
  );
}


```

</details>

Now replace the `| async` pipe usages by calling the signal values instead.

<details>
  <summary>MovieDetailPageComponent Template</summary>

  ```html
  <!-- src/app/movie-detail-page/movie-detail-page.component.ts -->

<div class="movie-detail-wrapper">
  @if (movie(); as movie) {
    <ui-detail-grid>
    <div detailGridMedia>
      <img
        class="aspectRatio-2-3 fit-cover"
        [src]="movie.poster_path | movieImage: 780"
        [alt]="movie.title"
        width="780"
        height="1170"
      />
    </div>
    <div detailGridDescription class="movie-detail">
      <header>
        <h1>{{ movie.title }}</h1>
        <h2>{{ movie.tagline }}</h2>
      </header>
      <section class="movie-detail--basic-infos">
        <ui-star-rating [rating]="movie.vote_average" />
        <div class="movie-detail--languages-runtime-release">
          <strong>
            {{ movie.spoken_languages[0].english_name }}
            /
            {{ movie.runtime }}
            /
            {{ movie.release_date | date: 'Y' }}
          </strong>
        </div>
      </section>
      <section>
        <h3>The Genres</h3>
        <div class="movie-detail--genres">
          @for (genre of movie.genres; track genre.id) {
            <a
              class="movie-detail--genres-link"
              [routerLink]="['/genre', genre.id]"
            >
              <fast-svg name="genre" />
              {{ genre.name }}
            </a>
          }
        </div>
      </section>
      <section>
        <h3>The Synopsis</h3>
        <p>{{ movie.overview || 'no overview available' }}</p>
      </section>
      <section>
        <h3>The Cast</h3>
        <div class="movie-detail--cast-list">
          <div class="cast-list">
            @for (actor of credits()?.cast; track actor.id) {
              <div class="movie-detail--cast-actor">
                <img
                  loading="lazy"
                  [src]="actor.profile_path | movieImage: 185"
                  [alt]="actor.name"
                  [title]="actor.name"
                />
              </div>
            }
          </div>
        </div>
      </section>
      <section class="movie-detail--ad-section-links">
        <div class="section--content">
          @if (movie.homepage) {
            <a
              class="btn"
              [href]="movie.homepage"
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
              <fast-svg class="btn__icon" name="website" />
            </a>
          }
          @if (movie.imdb_id) {
            <a
              class="btn"
              target="_blank"
              rel="noopener noreferrer"
              [href]="'https://www.imdb.com/title/' + movie.imdb_id"
            >
              IMDB
              <fast-svg class="btn__icon" name="imdb" />
            </a>
          }
          <!-- back function -->
          <button class="btn primary-button" (click)="back()">
            <fast-svg
              class="btn__icon"
              name="back"
              size="1em"
            />&nbsp;Back
          </button>
        </div>
      </section>
    </div>
  </ui-detail-grid>
  } @else {
    <div class="loader"></div>
  }
</div>
<div>
  <header>
    <h1>Recommended</h1>
    <h2>Movies</h2>
  </header>
  @if (recommendations(); as recommendations) {
    <movie-list [movies]="recommendations!" />
  } @else {
    <div class="loader"></div>
  }
</div>
  ```


</details>
