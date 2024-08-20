import { Component, OnInit } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IReservation } from '../Interface/ireservation';
declare var google: any;

@Component({
  selector: 'app-planning-chart',
  templateUrl: './planning-chart.component.html',
  styleUrls: ['./planning-chart.component.css']
})
export class PlanningChartComponent implements OnInit {
  rooms: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  availabilityTable: any[] = [];
  reservations: IReservation[] = [];
  roomNameMap: Map<number, string> = new Map(); // Map to hold roomId to roomName mapping

  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.getRoomAvailability();
      this.reservations = this.reservationService.getReservations();
      this.createRoomNameMap(); // Create map after fetching rooms
      this.drawChart(); // Call drawChart after both data are available
    });
  }

  getRoomAvailability(): void {
    this.availabilityTable = this.stays.map(stay => {
      const room = this.rooms.find(room => room.roomId === stay.roomId);
      return { ...room, ...stay };
    });
  }

  createRoomNameMap(): void {
    this.roomNameMap = new Map(this.rooms.map(room => [room.roomId, room.roomName]));
  }

  drawChart(): void {
    google.charts.load('current', { packages: ['timeline'] });
    google.charts.setOnLoadCallback(() => {
      const dataTable = new google.visualization.DataTable();
      dataTable.addColumn({ type: 'string', id: 'Room Name' });
      dataTable.addColumn({ type: 'string', id: 'Task' });
      dataTable.addColumn({ type: 'date', id: 'Start Date' });
      dataTable.addColumn({ type: 'date', id: 'End Date' });

      const availabilityData = this.availabilityTable.map(item => [
        item.roomName,
        'Available',
        new Date(item.stayDateFrom),
        new Date(item.stayDateTo)
      ]);

      const reservationData = this.reservations.map(reservation => [
        this.roomNameMap.get(reservation.roomId) || `Room ${reservation.roomId}`, // Use roomName from the map
        'Booked',
        new Date(reservation.arrivalDate),
        new Date(reservation.departureDate)
      ]);

      const combinedData = [...availabilityData, ...reservationData];
      dataTable.addRows(combinedData);

      const options = {
        timeline: {
          showRowLabels: true,
          showBarLabels: true,
        },
        avoidOverlappingGridLines: false,
        height: this.availabilityTable.length * 50,
        hAxis: {
          format: 'MMM dd, yyyy',
        },
        colors: ['#008000', '#FF0000'] // Green and Red
      };

      const chart = new google.visualization.Timeline(document.getElementById('ganttChart'));
      chart.draw(dataTable, options);
    });
  }
}
