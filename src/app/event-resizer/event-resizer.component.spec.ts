import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventResizerComponent } from './event-resizer.component';

describe('EventResizerComponent', () => {
  let component: EventResizerComponent;
  let fixture: ComponentFixture<EventResizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventResizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventResizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
