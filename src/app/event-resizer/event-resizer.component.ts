import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-event-resizer',
  templateUrl: './event-resizer.component.html',
  styleUrl: './event-resizer.component.css'
})
export class EventResizerComponent {
  width = 100;  // Initial width
  height = 30;  // Fixed height
  positionLeft = 30;  // Position from the left of the container

  private resizing = false;
  private dragging = false;
  private startX!: number;
  private startWidth!: number;
  private startPositionLeft!: number;
  private resizeDirection!: 'left' | 'right';
  

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.resizing) {
      const dx = event.clientX - this.startX;
      if (this.resizeDirection === 'left') {
        const newWidth = this.startWidth - dx;
        const newPositionLeft = this.startPositionLeft + dx;
        if (newWidth > 0) {
          this.width = newWidth;
          this.positionLeft = newPositionLeft;
        }
      } else if (this.resizeDirection === 'right') {
        this.width = this.startWidth + dx;
      }
    } else if (this.dragging) {
      const dx = event.clientX - this.startX;
      this.positionLeft = this.startPositionLeft + dx;
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp() {
    this.resizing = false;
    this.dragging = false;
  }

  startResize(event: MouseEvent, direction: 'left' | 'right') {
    event.preventDefault();
    event.stopPropagation(); // Prevents event from reaching the bar's mousedown handler
    this.resizing = true;
    this.dragging = false;
    this.resizeDirection = direction;
    this.startX = event.clientX;
    this.startWidth = this.width;
    this.startPositionLeft = this.positionLeft;
  }

  startDrag(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation(); // Prevents event from affecting resizing
    this.dragging = true;
    this.resizing = false;
    this.startX = event.clientX;
    this.startPositionLeft = this.positionLeft;
  }
}
