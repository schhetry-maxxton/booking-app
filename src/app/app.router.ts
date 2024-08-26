
import { RouterModule, Routes } from "@angular/router";
import { FilterComponent } from "./filter/filter.component";
import { PlanningChartComponent } from "./planning-chart/planning-chart.component";
// import { NewReservationComponent } from "./new-reservation/new-reservation.component";
import { BookingReservationComponent } from "./booking-reservation/booking-reservation.component";
import { HomeComponent } from "./home/home.component";
import { CharttComponent } from "./chartt/chartt.component";
import { RoomAvailabilityGanttComponent } from "./room-availability-gantt/room-availability-gantt.component";

export const router: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' }, //default page
    { path : 'home' , component : HomeComponent},
    { path : 'rooms' , component : FilterComponent},
    { path : 'ganttChart' , component : PlanningChartComponent},
    { path : 'reservationDetails' , component : BookingReservationComponent},
    { path : 'chart' , component : CharttComponent},
    { path : 'planningchart' , component : RoomAvailabilityGanttComponent},
    { path : 'chart1' , component : PlanningChartComponent},
];
    //RouterModule.forRoot is for creating routes for the entire application
//  pass the routes array in the RouterModule using RouterModule.forRoot(router)

export const routes = RouterModule.forRoot(router);
//CREATE THE app.router.ts inside the App folder

//export const routes: ModuleWithProviders = RouterModule.forRoot(router);
