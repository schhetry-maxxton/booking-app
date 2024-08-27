import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routes } from './app.router';
import { BookingReservationComponent } from './booking-reservation/booking-reservation.component'; 
import { PlanningChartComponent } from './planning-chart/planning-chart.component';
import { FilterComponent } from './filter/filter.component';
import { HeaderComponent } from './header/header.component';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home/home.component';
import { CharttComponent } from './chartt/chartt.component';
import { AngularResizeEventModule } from 'angular-resize-event';
import {OverlayModule} from '@angular/cdk/overlay';
import { RoomAvailabilityGanttComponent } from './room-availability-gantt/room-availability-gantt.component';
import { EventResizerComponent } from './event-resizer/event-resizer.component';
import {CdkDrag} from '@angular/cdk/drag-drop';
import { ModalComponent } from './modal/modal.component';


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
  ],
  providers: [
    provideClientHydration(), 
    provideHttpClient()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
