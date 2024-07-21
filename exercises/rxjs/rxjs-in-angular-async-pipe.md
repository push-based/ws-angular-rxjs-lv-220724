# RxJS in Angular - Async Pipe

In this exercise we will slowly get to know rxjs, in particular the `Observable` data structure.
You'll learn how to receive values from an `Observable` in different ways and display them in the template.


## 1. Display list of genres

You should've noticed the `Genre` headline within the side navigation of the movies app.

![empty-genres.png](images%2Fempty-genres.png)

Sadly, it's only a headline :(. This will be your next task, make sure the list of genres is 
properly displayed. This time we won't subscribe ourselves, but let the `async` pipe handle this for us.

As the navigation bar is filled with data from the `AppShellComponent`, this is the one we need to 
change for this task. Open it, and ...

### 1.1 Create a genre$ field of movieService.getGenres()

Use the `this.movieService.getGenres()` method and bind it to a field in the component.

<details>
  <summary>Create a genre$ field in AppShellComponent</summary>

```ts
// app-shell.component.ts

readonly genres$ = this.movieService.getGenres();

```

</details>

Now we want our template to subscribe to this data.
The angular framework provides a utility for this: the `AsyncPipe`.

### 1.2 Subscribe to genres in the template and create views

Open the `AppShellComponent`s template file and locate the Genres headline. You should find
a template which you need to repeat per genre coming as a result from the http call.

I suggest using the `@for` control flow to iterate over the genres, but you can choose to do
otherwise as well.

Here is an example for the `@for`, note that it is missing the async pipe you need to add for
the exercise:

`@for (genre of genre; track 'id') `


<details>
  <summary>subscribe to genre$ with async pipe</summary>

```html
<!--app-shell.component.html-->

@for (genre of genres$ | async; track 'id') {
  <a
    class="navigation--link"
    [routerLink]="['/list', 'genre', genre.id]"
    routerLinkActive="active"
  >
    <div class="navigation--menu-item">
      <fast-svg class="navigation--menu-item-icon" name="genre" />
      {{ genre.name }}
    </div>
  </a>
}

```

Don't forget to put the `AsyncPipe` as import into the `AppShellComponent`.

```ts
// app-shell.component.ts
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  standalone: true,
  imports: [
    SideDrawerComponent,
    RouterLinkActive,
    RouterLink,
    FastSvgComponent,
    HamburgerButtonComponent,
    SearchBarComponent,
    FormsModule,
    DarkModeToggleComponent,
    AsyncPipe, // 👈️
  ],
})
export class AppShellComponent {}

```

</details>

Great, serve the application and take a look if the genres are being rendered to the screen.

Very well done, check your application and check if you can now navigate between categories and genres back
and forth.
You can also observe the network tab, it should show you different endpoints being fetched based on the
route you are currently at.
