import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routes } from './app.router';
import { BookingReservationComponent } from './booking-reservation/booking-reservation.component'; 
import { NewReservationComponent } from './new-reservation/new-reservation.component'; 
import { PlanningChartComponent } from './planning-chart/planning-chart.component';
import { FilterComponent } from './filter/filter.component';
import { HeaderComponent } from './header/header.component';
import { provideHttpClient } from '@angular/common/http';
import { CustomerComponent } from './customer/customer.component';
import { HomeComponent } from './home/home.component';
import { CharttComponent } from './chartt/chartt.component';



@NgModule({
  declarations: [
    AppComponent,
    BookingReservationComponent,
    NewReservationComponent,
    FilterComponent,
    HeaderComponent,
    CustomerComponent,
    PlanningChartComponent,
    HomeComponent,
    CharttComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    routes,
    FormsModule, 
    ReactiveFormsModule ,
  ],
  providers: [
    provideClientHydration(), 
    provideHttpClient()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
