import { Observable } from 'rxjs';

import { take, map, filter } from 'rxjs/operators';

// Exercise 1: Create a new Observable & Listen to it

const o$ = new Observable(
/* Subscriber */ (subscriber) => {
// feed subscriber with values
subscriber.next(1);
}
);

const sub = o$.subscribe(
/* Observer */ (value) => {
// observe values
console.log(value);
}
);

// Exercise 2: Create a function that creates an observable from a value

const ofValue = (value) => {
return new Observable(
/* Subscriber */ (subscriber) => {
// feed subscriber with values
subscriber.next(value);
}
);
};

ofValue(2).subscribe(console.log);

// Exercise 2.1: replace with `of`

import { of } from 'rxjs';

of(2).subscribe(console.log);

// Exercise 3: Create a function that returns a stream out of an array.

const ofArray = (values) => {
return new Observable(
/* Subscriber */ (subscriber) => {
// feed subscriber with values
values.forEach((value) => {
subscriber.next(value);
});
}
);
};

ofArray(['foo', 'bar', 'baz', 'poop', '💩']).subscribe(console.log);

// Exercise 3.1: Try to use of -> where's the difference?

// Exercise 3.2: Use from -> tada

