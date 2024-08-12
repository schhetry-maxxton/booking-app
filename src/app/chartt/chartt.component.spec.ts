import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharttComponent } from './chartt.component';

describe('CharttComponent', () => {
  let component: CharttComponent;
  let fixture: ComponentFixture<CharttComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CharttComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CharttComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
