
import { RouterModule, Routes } from "@angular/router";
import { FilterComponent } from "./filter/filter.component";
import { PlanningChartComponent } from "./planning-chart/planning-chart.component";
// import { NewReservationComponent } from "./new-reservation/new-reservation.component";
import { BookingReservationComponent } from "./booking-reservation/booking-reservation.component";
import { HomeComponent } from "./home/home.component";
import { CharttComponent } from "./chartt/chartt.component";
import { RoomAvailabilityGanttComponent } from "./room-availability-gantt/room-availability-gantt.component";
import { ModalComponent } from "./modal/modal.component";
import { NewReservationComponent } from "./new-reservation/new-reservation.component";

export const router: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' }, //default page
    { path : 'home' , component : HomeComponent},
    { path : 'rooms' , component : FilterComponent},
    { path : 'reservationChart' , component : PlanningChartComponent},
    { path : 'reservationDetails' , component : BookingReservationComponent},
    { path : 'chart' , component : CharttComponent},
    { path : 'planningchart' , component : RoomAvailabilityGanttComponent},
    { path : 'chart1' , component : PlanningChartComponent},
    { path : 'modal' , component : ModalComponent},
    { path : 'newReservation' , component : NewReservationComponent},
    
];

export const routes = RouterModule.forRoot(router);

