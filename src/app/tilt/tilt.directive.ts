import { Directive, ElementRef, input } from '@angular/core';

@Directive({
  selector: '[tilt]',
  standalone: true,
})
export class TiltDirective {
  tiltDegree = input(5);

  rotation = 'rotate(0deg)';

  rotate(event: MouseEvent) {
    const pos = this.determineDirection(event.pageX);
    return `rotate(${pos === 0 ? `${this.tiltDegree()}deg` : `${-this.tiltDegree()}deg`})`;
  }

  reset() {
    return 'rotate(0deg)';
  }

  constructor(private elementRef: ElementRef<HTMLElement>) {
    // mouseenter => rotate
    // mouseleave => reset
    // elementRef.nativeElement.style.transform = value;
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
