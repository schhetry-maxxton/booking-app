import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routes } from './app.router';
// import { NgChartsModule } from 'ng2-charts';
import { BookingReservationComponent } from './booking-reservation/booking-reservation.component'; 
import { PlanningChartComponent } from './planning-chart/planning-chart.component';
import { FilterComponent } from './filter/filter.component';
import { HeaderComponent } from './header/header.component';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home/home.component';
import { CharttComponent } from './chartt/chartt.component';
import { AngularResizeEventModule } from 'angular-resize-event';
import { OverlayModule, Overlay, ScrollStrategyOptions  } from '@angular/cdk/overlay';

import { RoomAvailabilityGanttComponent } from './room-availability-gantt/room-availability-gantt.component';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ModalComponent } from './modal/modal.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NewReservationComponent } from './new-reservation/new-reservation.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CalendarComponent } from './calendar/calendar.component';

@NgModule({
  declarations: [
    AppComponent,
    BookingReservationComponent,
    FilterComponent,
    HeaderComponent,
    PlanningChartComponent,
    HomeComponent,
    CharttComponent,
    RoomAvailabilityGanttComponent,
    ModalComponent,
    NewReservationComponent,
    CalendarComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    routes,
    FormsModule, 
    ReactiveFormsModule,
    AngularResizeEventModule,
    OverlayModule,
    CdkDrag,
    MatSnackBarModule,
    MatTooltipModule,
    NgbModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
    BrowserAnimationsModule, MatDialogContent
  ],
  providers: [
    provideClientHydration(), 
    provideHttpClient(),
    provideNativeDateAdapter(),
    {
      provide: 'MAT_DATEPICKER_SCROLL_STRATEGY',
      deps: [Overlay],
      useFactory: (overlay: Overlay) => overlay.scrollStrategies.noop()  // No scrolling when datepicker is open
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }