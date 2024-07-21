// Topic: Subscription

// Exercise 4: fromEvent

const fromDOMEvent = (element: HTMLElement, eventType: string) => {
return new Observable((subscriber) => {
const callBack = (event) => {
subscriber.next(event);
};
element.addEventListener(eventType, callBack);

    return () => {
      console.log('unsubscribe');
      element.removeEventListener(eventType, callBack);
    };
});
};

const fromEvent$ = fromDOMEvent(document.getElementById('my-button'), 'click');

fromEvent$.pipe(take(2)).subscribe(console.log);
