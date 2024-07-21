# RxJS in Angular - Intro

In this exercise we will apply gained RxJS knowledge to our angular application.

## 1. Close sidebar on route change

When using the movies application on mobile mode, we want the sidebar to close after each navigation event.

The following gif shows the desired behavior:

![sidenav-close-mobile.gif](images%2Fsidenav-close-mobile.gif)

Right now, this is not implemented. Please check it out on your own.

Before we introduce any operators, let's implement the naive subscription-only way. It will help you to understand
why operators are useful and how they make your code streams more declarative. 
It'll also teach you how to refactor from imperative to reactive code -> thinking reactively.

As the sidebar is also part of the `AppShellComponent`, please open it and..

### 1.1 Subscribe to RouterEvents

In the constructor, subscribe to the `this.router.events` Observable.
Note, there is a `sideDrawerOpen: boolean` field in the component representing the state
of the sideDrawer.
In case of `e instanceof NavigationEnd && this.sideDrawerOpen` we want to
set the `sideDrawerOpen` to false again. This will close the drawer whenever it was
open and a navigation event was fired.


<details>
  <summary>AppShellComponent: close drawer on navigation</summary>


```ts
// src/app/app-shell/app-shell.component.ts


constructor() {
  this.router.events.subscribe((e) => {
    if (e instanceof NavigationEnd && this.sideDrawerOpen) {
      this.sideDrawerOpen = false;
    }
  });
}

```
</details>

Great, check if the sidebar is now behaving as it should.

### 1.2 Transform the if condition to a `filter`

Now it's time to introduce the first operator, `filter`. We want to filter the
emissions of our stream based on the condition we had coded as an `if`.

As a result, our stream looks much cleaner :)

> [!NOTE]
> to use an operator, you need to call the `.pipe()` function on the Observable
> inside, you can apply operators, e.g. 'stream$.pipe(filter(Boolean))'

<details>
  <summary>AppShellComponent: implement filter operator</summary>


```ts
// src/app/app-shell/app-shell.component.ts

import { filter } from 'rxjs';

constructor() {
  this.router.events.pipe(
    filter(e => e instanceof NavigationEnd && this.sideDrawerOpen)
  ).subscribe((e) => {
    this.sideDrawerOpen = false;
  });
}

```
</details>

Congratulations if you have introduced your first rxjs operator in angular 🥳

Of course check the functionality.

### 1.3 Unsubscribe on component destruction

As you've learned already, there is a very operator that automatically ends subscriptions for you when a component dies.
Please apply the `takeUntilDestroyed()` operator to the subscription you've created before.

<details>
  <summary>Unsubscribe on destruction: takeUntilDestroyed()</summary>

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

constructor()
{
  this.router.events.pipe(
    filter(e => e instanceof NavigationEnd && this.sideDrawerOpen),
    takeUntilDestroyed()
  ).subscribe((e) => {
    this.sideDrawerOpen = false;
  });
}


```

</details>


## 2. Create and transform a stream from an event

After we've used a `filter operator`, it's time to get to know also other categories
of rxjs operators. This time we'll learn `creation` & `transformation` operators. Furthermore,
you'll also use a `join creation` operator to further simplify your solution.

We are going to implement the attribute directive `TiltDirective` (in src/app/shared/).
The directive should `rotate` its host element (hint: `ElementRef`) when _entering_ it with the mouse
and reset the rotation when the mouse _leaves_ the host element.

Please open the `TiltDirective` and inspect its code, there are already some functions implemented that you can use as helpers.

It is currently applied on `movie-card`, so you can test it out when hovering over any movie-card you see on the screen.

### 2.1 Create Observables from events

As a first step we want to create two Observables:
* one for the `mouseleave` => `fromEvent(this.elementRef.nativeElement, 'mouseleave')`
* one for the `mouseenter` => `fromEvent(this.elementRef.nativeElement, 'mouseenter')`

We'll use the `fromEvent` creation operator in order to do so.

> [!NOTE]
> `fromEvent` sometimes needs a bit of a help to find the correct typing
> For this scenario it's best to type it as fromEvent<MouseEvent>(...args)
> in order to have better typing support in your IDE
> `fromEvent` expects the element as first parameter and the eventName as string
as the second parameter

Subscribe to each Observable. In the subscription, compute the correct value for the `rotate` style, by utilizing
the according `getRotationDegree()` or `getDefaultRotation()` function.

The `mouseleave` subscription should do `elementRef.nativeElement.style.transform = this.getDefaultRotation()`.
The `mouseenter` subscription should do `elementRef.nativeElement.style.transform = this.getRotationDegree(event);`.


<details>
  <summary>TiltDirective: Implement with two subscriptions</summary>


```ts
// src/app/shared/tilt.directive.ts
import { fromEvent } from 'rxjs';

constructor(
  private elementRef: ElementRef<HTMLElement>
) {
  fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseenter').subscribe(
    (event) => {
      elementRef.nativeElement.style.transform =
        this.getRotationDegree(event);
    },
  );
  fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseleave').subscribe(
    () => {
      elementRef.nativeElement.style.transform = this.getDefaultRotation();
    },
  );
}

```
</details>

Take a look at the served application and see if the tilt directive is doing its job.

### 2.2 Don't forget to unsubscribe!

Right now, we have implemented a brutal memory leak. That's not what we intended to do. Let's fix it by unsubscribing from 
both of our streams.

Use the `takeUntilDestroyed()` operator from `@angular/core/rxjs-interop` to end the subscriptions when the directives gets destroyed.

<details>
  <summary>unsubscribe: takeUntilDestroyed()</summary>

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseenter')
  .pipe(takeUntilDestroyed())
  .subscribe((event) => {
    elementRef.nativeElement.style.transform =
      this.getRotationDegree(event);
  });
fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseleave')
  .pipe(takeUntilDestroyed())
  .subscribe(() => {
    elementRef.nativeElement.style.transform = this.getDefaultRotation();
  });

```

</details>

### 2.3 use the `map` operator to transform `MouseEvent` -> `string`

The code is working, but we can still improve the code quality.
Instead of calculating everything in the subscribe callback, we are going
to transform our `MouseEvent` into a `string` that we can simply
set as new value.

It seems rather unintuitive, but please introduce the `map` for both
subscriptions. Don't worry, it'll make sense soon.

Please utilize the `map` operator so that both subscriptions only need to call `elementRef.nativeElement.style.transform = rotation;`.


<details>
  <summary>TiltDirective: introduce map to improve code quality</summary>


```ts
// src/app/shared/tilt.directive.ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, map } from 'rxjs';

constructor(
  private elementRef: ElementRef<HTMLElement>
) {
  fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseenter')
    .pipe(
      map((event) => this.getRotationDegree(event)),
      takeUntilDestroyed(),
    )
    .subscribe((rotation) => {
      elementRef.nativeElement.style.transform = rotation;
    });
  fromEvent<MouseEvent>(elementRef.nativeElement, 'mouseleave')
    .pipe(
      map(() => this.getDefaultRotation()),
      takeUntilDestroyed(),
    )
    .subscribe((rotation) => {
      elementRef.nativeElement.style.transform = rotation;
    });
}

```
</details>

Great, make sure the application is still running and be prepared for the next step!

### 2.4 combine both Observables into a single stream

Don't u think we could get rid of at least one of those `.subscribe`s?
We already have the perfect setup, two streams that both emit the very same type of value which 
we also want to assign to the very same variable.

To further simplify our reactive implementation, we can make use of the
`merge` join creation operator. It'll allow us to combine our two streams into one, with
only one subscription in the end.

First, remove the `.subscribe()` blocks from both observables.
Then create two named streams instead of two subscriptions:
* `const rotate$ = fromEvent(..., 'mouseenter')`
* `const reset$ = fromEvent(..., 'mouseleave')`

You can also remove the `takeUntilDestroyed()` usages for now, we'll introduce it later on ;).

<details>
  <summary>TiltDirective: Create streams instead of subscriptions</summary>


```ts
// src/app/shared/tilt.directive.ts

constructor(
  private elementRef: ElementRef<HTMLElement>
) {
  const rotate$ = fromEvent<MouseEvent>(
    elementRef.nativeElement,
    'mouseenter',
  ).pipe(map((event) => this.getRotationDegree(event)));
  
  const reset$ = fromEvent<MouseEvent>(
    elementRef.nativeElement,
    'mouseleave',
  ).pipe(map(() => this.getDefaultRotation()));
}

```
</details>

Now, combine those streams into a single one by using the `merge` (`from 'rxjs'`) operator.

You should be able to call `merge(rotate$, reset$).subscribe()` which gives you a combined stream
of all both events. 
This stream will now always emit the correct rotation style value to set to the host element.

First of all, re-implement the `elementRef.nativeElement.style.transform = rotation` as part of the subscription of the 
merged observable.
Move on and apply the `takeUntilDestroyed()` operator to the merged stream.

<details>
  <summary>TiltDirective: merge, subscribe & handle unsubscription</summary>


```ts
// src/app/shared/tilt.directive.ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, map, merge } from 'rxjs';


constructor(
  private elementRef: ElementRef<HTMLElement>
) {
  const rotate$ = fromEvent<MouseEvent>(
    elementRef.nativeElement,
    'mouseenter',
  ).pipe(map((event) => this.getRotationDegree(event)));
  const reset$ = fromEvent<MouseEvent>(
    elementRef.nativeElement,
    'mouseleave',
  ).pipe(map(() => this.getDefaultRotation()));

  merge(rotate$, reset$)
    .pipe(takeUntilDestroyed())
    .subscribe((rotation) => {
      elementRef.nativeElement.style.transform = rotation;
    });
}

```
</details>

Congratulations, this is a super clean reactive implementation of the tilt directive!

## Full Solution

<details>
  <summary>TiltDirective reactive implementation</summary>

```ts

import { Directive, ElementRef, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, map, merge } from 'rxjs';

@Directive({
  selector: '[tilt]',
  standalone: true,
})
export class TiltDirective {
  tiltDegree = input(5);

  constructor(private elementRef: ElementRef<HTMLElement>) {
    const rotate$ = fromEvent<MouseEvent>(
      elementRef.nativeElement,
      'mouseenter',
    ).pipe(map((event) => this.getRotationDegree(event)));
    const reset$ = fromEvent<MouseEvent>(
      elementRef.nativeElement,
      'mouseleave',
    ).pipe(map(() => this.getDefaultRotation()));

    merge(rotate$, reset$)
      .pipe(takeUntilDestroyed())
      .subscribe((rotation) => {
        elementRef.nativeElement.style.transform = rotation;
      });
  }

  getRotationDegree(event: MouseEvent) {
    const pos = this.determineDirection(event.pageX);
    return `rotate(${pos === 0 ? `${this.tiltDegree()}deg` : `${-this.tiltDegree()}deg`})`;
  }

  getDefaultRotation() {
    return 'rotate(0deg)';
  }

  /**
   *
   * returns 0 if entered from left, 1 if entered from right
   */
  determineDirection(pos: number): 0 | 1 {
    const width = this.elementRef.nativeElement.clientWidth;
    const middle =
      this.elementRef.nativeElement.getBoundingClientRect().left + width / 2;
    return pos > middle ? 1 : 0;
  }
}


```

</details>
