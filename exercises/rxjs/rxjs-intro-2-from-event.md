# Exercise: fromEvent -> Producers & Subscriptions

In this exercise we'll get to know about the `teardown` functionality of Observables and learn how to unsubscribe
from a given stream.

> [!NOTE]
> For this exercise, please check out and run [js playground project.](https://github.com/push-based/js-playground)
> You can run the application with `npm run start`

Please use the file `rxjs/4-from-event.ts` for this exercise.

You'll notice that this time you have access to a `button`:

```ts
// 4-from-event.ts

export function exercise4(button: HTMLButtonElement) {
  // start writing exercise code here
}
```

This is the trigger button visible on the page itself. We are going to use that as our Producer.

## 1: Create a Stream from a `Producer`

We want to create a reusable function that takes an `element: HTMLElement` as reference and an `eventType: string` as
event identifier.

In the end it should like this:

```ts
const click$ = fromDOMEvent(button, 'click');

click$.subscribe(event => {
  // event is the click event
})
```

You can use the following startingpoint:

```ts
const fromDOMEvent = (element: HTMLElement, eventType: string) => {}
```

Inside of the function, return `new Observable(subscriber => {})`. Inside of the observable
body, we want to add an event listener to the given element and forward the values to the subscriber.

Let's create a local `const callBack = (event: Event) => {}` as the callBack function.
Then pass it as argument to `element.addEventListener(eventType, callBack);`.

The `callBack` function should call `subscriber.next(event)`. 

<details>
  <summary>Observable body -> event forwarding</summary>

```ts
const callBack = (event: Event) => {
  subscriber.next(event);
};

element.addEventListener(eventType, callBack);
```

</details>

<details>
  <summary>fromDOMEvent implementation</summary>

```ts

// 4-from-event.ts

const fromDOMEvent = (element: HTMLElement, eventType: string) => {
  return new Observable((subscriber) => {
    const callBack = (event: Event) => {
      subscriber.next(event);
    };
    element.addEventListener(eventType, callBack);
  });
};

```

</details>

Great stuff, now create an `Observable<MouseEvent>` by using `fromDOMEvent(button, 'click')`;

Print out the event to the console.

```ts
fromDOMEvent(button, 'click').subscribe(console.log);
```

Open the application in the browser and press the trigger button a couple of times. You should notice
how the values are being printed to the console.

## 2: Build the teardown logic

Right now we have implemented a memory leak, as we are not cleaning up the event listener we have attached before.
For exactly this scenario, there is the `teardown` function you can use in the `Observable` body.

We want to call `element.removeEventListener(eventType, callBack)` whenever our subscriber stops the subscription.

e.g.:

```ts
new Observable(() => {
  
  return () => {
    console.log('teardown happening here!');
    // element.removeEventListener(eventType, callBack)
  }
})
```

<details>
  <summary>fromDOMEvent w/ teardown</summary>

```ts

// 4-from-event.ts

const fromDOMEvent = (element: HTMLElement, eventType: string) => {
  return new Observable((subscriber) => {
    const callBack = (event: Event) => {
      subscriber.next(event);
    };
    element.addEventListener(eventType, callBack);
    
    return () => {
      console.log('teardown happening here!');
      element.removeEventListener(eventType, callBack);
    }
  });
};

```

</details>

Great, all preparations are done. In the next step we are going to handle our subscription.

## 3: Subscription Management

First, let's try if unsubscribing from the stream is actually killing. Store the `Subscription` in a local variable.
Immediately call the `unsubscribe` method afterwards:

```ts
const click$ = fromDOMEvent(button, 'click');

const sub = click$.subscribe(event => {
  console.log(event)
});

sub.unsubscribe();
```

Open the application in the browser. Check the console, it should tell you about the teardown logic being executed.
Press the trigger button a couple of times. You should notice that no values are being printed to the console.

You can also use a `setTimeout` if you want to play around a little with the timing:

```ts
const click$ = fromDOMEvent(button, 'click');

const sub = click$.subscribe(event => {
  console.log(event)
});

setTimeout(() => {
  sub.unsubscribe();
}, 5000) // after 5 seconds, unsubscribe!
```
## 4: use `fromEvent`

You again have implemented a function that already exists in the `rxjs` library itself. Please replace (or add to)
your solution with `fromEvent`.

<details>
  <summary>fromEvent usage</summary>

```ts
import { fromEvent } from 'rxjs';

const click$ = fromEvent(button, 'click');

const sub = click$.subscribe(event => {
  console.log(event)
});

setTimeout(() => {
  sub.unsubscribe();
}, 5000) // after 5 seconds, unsubscribe!

```

</details>
