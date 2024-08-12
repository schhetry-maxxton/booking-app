
import { RouterModule, Routes } from "@angular/router";
import { FilterComponent } from "./filter/filter.component";
import { PlanningChartComponent } from "./planning-chart/planning-chart.component";
import { NewReservationComponent } from "./new-reservation/new-reservation.component";
import { BookingReservationComponent } from "./booking-reservation/booking-reservation.component";
import { CustomerComponent } from "./customer/customer.component";
import { HomeComponent } from "./home/home.component";
import { CharttComponent } from "./chartt/chartt.component";

export const router: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' }, //default page
    { path : 'home' , component : HomeComponent},
    { path : 'rooms' , component : FilterComponent},
    { path : 'planningChart' , component : PlanningChartComponent},
    { path : 'createReservation' , component : NewReservationComponent},
    { path : 'reservationDetails' , component : BookingReservationComponent},
    { path : 'customer' , component : CustomerComponent},
    { path : 'chart' , component : CharttComponent}
];
    //RouterModule.forRoot is for creating routes for the entire application
//  pass the routes array in the RouterModule using RouterModule.forRoot(router)

export const routes = RouterModule.forRoot(router);
//CREATE THE app.router.ts inside the App folder

//export const routes: ModuleWithProviders = RouterModule.forRoot(router);
