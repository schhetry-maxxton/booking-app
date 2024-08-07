import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningChartComponent } from './planning-chart.component';

describe('PlanningChartComponent', () => {
  let component: PlanningChartComponent;
  let fixture: ComponentFixture<PlanningChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlanningChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanningChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
