// Exercise 5: OperatorFn intro (map + filter)

// 5.1: map fromEvent to string operation

const input$ = fromDOMEvent(document.getElementById('hello'), 'input');

input$.subscribe((event) => {
console.log(`Hello dear ${event.target.value}`);
});

input$
.pipe(map((event) => `Hello dear ${event.target.value}`))
.subscribe(console.log);

// 5.2: filter out any stream with less than 2 chars

input$
.pipe(
map((event) => event.target.value),
filter((value) => value.length >= 2),
map((value) => `Hello dear ${value}`)
)
.subscribe(console.log);
