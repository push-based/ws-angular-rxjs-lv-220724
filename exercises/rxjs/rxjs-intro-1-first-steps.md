# Exercise: Get to know `Observable`

In this exercise you'll learn about the most basic APIs from the `Observable` data structure.

> [!NOTE]
> For this exercise, please check out and run [js playground project.](https://github.com/push-based/js-playground)
> You can run the application with `npm run start`

## 1. Create a new Observable & read its value

Open the file `rxjs/1-new-observable.ts`

### 1.1 Create new Observable

Now, create a new `const o$ = new Observable()`.

Start by putting a `console.log` as the function body for the new `Observable`.

Run the application and check the console.

<details>
  <summary>The first Observable</summary>

```ts
// rxjs/exercise1.ts

import { Observable } from 'rxjs';

const o$ = new Observable(() => {
  console.log('im here');
});
```

</details>

You should notice that there is no console output. Of course, because we need to subscribe!

### 1.2 Subscribe to the Observable

Now, call the `.subscribe` method of the `o$` const.

<details>
  <summary>Subscribe</summary>

```ts
// rxjs/1-new-observable.ts

import { Observable } from 'rxjs';

const o$ = new Observable(() => {
  console.log('im here');
});

o$.subscribe();
```

</details>

Run the app again. Now, there should be a visible console output.

### 1.3 Send & access values

Use the `subscriber.next()` call to send a value to the subscriber.
Access the value in the `subscribe` callback and log it to the console.

<details>
  <summary>Send & access data</summary>

```ts
// rxjs/1-new-observable.ts

import { Observable } from 'rxjs';

const o$ = new Observable((subscriber) => {
  console.log('im here');
  subscriber.next(42);
});

o$.subscribe(value => {
  console.log('a value', value);
});
```

</details>


Well done! Observe the values being passed to the console.

## 2: Create a function that creates an observable from a value

Let's move on by implementing a function that creates a new `Observable` of a given static value.

Open the `rxjs/2-of-value.ts` file and create a function `ofValue`. It should take any value and return an
`Observable` emitting that value as a result.

<details>
  <summary>ofValue implementation</summary>

```ts
// 2-of-value.ts

import { Observable } from 'rxjs';

const ofValue = (value) => {
  return new Observable(subscriber => {
    subscriber.next(value);
  })
}

```

</details>

Now create an Observable out of it and subscribe to it:

```ts
ofValue(2).subscribe(console.log);
```

Very nice! You have successfully the `rxjs` method: `of`.

### 2.1: replace with `of`

Replace (or add to) your existing implementation with the method `of` from `rxjs`.

<details>
  <summary>use `of`</summary>

```ts
// 2-of-value.ts

import { of } from 'rxjs';

of(2).subscribe(console.log);

```

</details>

Well done, let's move on to the next step!

## 3: Create a function that returns a stream out of an array.

We again want to implement an Observable creation function, but this time for an array of values.

Open the `rxjs/3-of-values.ts` file and create a function `ofValues`. It should take an array of values and return an
`Observable` emitting all values in a sequence as a result.

The inner of your observable should look like this:

```ts
values.forEach((value) => {
  subscriber.next(value);
});
```

<details>
  <summary>ofValues implementation</summary>

```ts
// rxjs/3-of-values.ts

import { Observable } from 'rxjs';

const ofValues = (values) => {
  return new Observable((subscriber) => {
    // feed subscriber with values
    values.forEach((value) => {
      subscriber.next(value);
    });
  });
};


```

</details>

Use the function by passing an array of values to it and print out the values coming from the stream.

```ts
ofValues(['foo', 'bar', 'baz', '💩']).subscribe(console.log);
```

Well done! Let's compare it against `of`.

### Exercise 3.1: Compare against `of`

Create yet another `Obsevrable` by using `of` and passing the same arguments as to `ofValues`.

Print out the result and observe the difference.

```ts
of(['foo', 'bar', 'baz', '💩']).subscribe(console.log);
```

<details>
  <summary>compare to `of`</summary>

```ts
// rxjs/exercise3.ts

import { Observable, of } from 'rxjs';

const ofValues = (values) => {
  return new Observable((subscriber) => {
    // feed subscriber with values
    values.forEach((value) => {
      subscriber.next(value);
    });
  });
};


ofValues(['foo', 'bar', 'baz', '💩']).subscribe(console.log);

of(['foo', 'bar', 'baz', '💩']).subscribe(console.log);

```

</details>

What is the difference you are observing? :)


### Exercise 3.2: Use from 🎉

You've probably noticed on your own, but `of` just prints the whole array, whilest `ofArray` prints
each value of the array individually.

You have partially implemented the `from` method from `rxjs`.

Replace (or add to) `ofValues` with `from` and check the console again.

```ts
import { from } from 'rxjs';

from(['foo', 'bar', 'baz', '💩']).subscribe(console.log);
```
