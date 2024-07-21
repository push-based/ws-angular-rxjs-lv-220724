# Exercise: OperatorFn intro (map + filter)

In this exercise we'll get to know about the concept of `RxJS Operators`. They are a powerful tool
to manipulate / filter / transform streams in all kinds.

> [!NOTE]
> For this exercise, please check out and run [js playground project.](https://github.com/push-based/js-playground)
> You can run the application with `npm run start`

Please use the file `rxjs/5-operators-intro.ts` for this exercise.

## 1: map fromEvent to string operation

We want to create a stream from the `input` event of an `HTMLInputElement` and transform its value
from `InputEvent` to a string that says `Hello dear ${value}`.

### 1.1 Create `input$` stream

First, create the `input$` stream by utilizing the `fromEvent` rxjs creation function:

```ts
// 5-operators-intro.ts

import { fromEvent } from 'rxjs';

const input$ = fromEvent(nameInput, 'input');
```

Then subscribe to it and print the following output: `Hello dear ${event.target.value}`.

```ts
// 5-operators-intro.ts

input$.subscribe((event) => {
  console.log(`Hello dear ${event.target.value}`);
});
```

Nice, start the application and interact with the name input to kick off the whole process. Check the console
if your output is being generated.

### 1.2 Transform `input$` stream

Now instead of constructing a new value in the `subscribe` callback, we want to use the `map` OperatorFunction from `rxjs` to
transform the value before ending up in the callback.

Call the `.pipe()` method on the `input$` observable and apply the `map()` operator.

It should return `map((event) => `Hello dear ${event.target.value}`)`.

The subscribe callback should only do `console.log` in the end.

<details>
  <summary>transform stream with map</summary>

```ts
// 5-operators-intro.ts

import { fromEvent, map } from 'rxjs';

const input$ = fromEvent(nameInput, 'input');

input$
  .pipe(
    map((event) => `Hello dear ${event.target.value}`)
  ).subscribe(console.log);

```

</details>

Great job! Of course test your changes again.

## 2: filter out any value with less than 2 chars

Now we want to suppress logging values whenever the string has less than 3 chars.

e.g.:

```ts
const input$ = fromEvent(nameInput, 'input');

input$
  .pipe(
    map((event) => `Hello dear ${event.target.value}`)
  ).subscribe(value => {
    if (value.length >= 2) {
      console.log(value);
    }
});
```

Of course your task is now to refactor the above example to use the `filter` operator function instead ;)

<details>
  <summary>filter</summary>

```ts
// 5-operators-intro.ts

import { fromEvent, map, filter } from 'rxjs';

const input$ = fromEvent(nameInput, 'input');

input$
  .pipe(
    map((event) => `Hello dear ${event.target.value}`),
    filter(value => value.length >= 2),
  ).subscribe(console.log);

```

</details>

Nicely done! Check out the app if everything is working as it should.


