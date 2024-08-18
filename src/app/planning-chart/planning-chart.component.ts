import { Component, OnInit } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';

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


  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.getRoomAvailability();
      this.drawChart();
    });
  }

  getRoomAvailability(): void {
    this.availabilityTable = this.stays.map(stay => {
      const room = this.rooms.find(room => room.roomId === stay.roomId);
      return { ...room, ...stay };
    });
  }

  drawChart(): void {
    google.charts.load('current', { packages: ['gantt'] });
    google.charts.setOnLoadCallback(() => {
      const dataTable = new google.visualization.DataTable();
      dataTable.addColumn('string', 'Task ID');
      dataTable.addColumn('string', 'Room Name');
      dataTable.addColumn('date', 'Start Date');
      dataTable.addColumn('date', 'End Date');
      dataTable.addColumn('number', 'Duration');
      dataTable.addColumn('number', 'Percent Complete');
      dataTable.addColumn('string', 'Dependencies');
      dataTable.addColumn('string', 'Status');

      const data = this.availabilityTable.map(item => [
        
        `Room_${item.roomId}`,
        item.roomName,
        new Date(item.stayDateFrom),
        new Date(item.stayDateTo),
        null,  
        100,  // Assuming stays are fully complete
        null,  // No dependencies
        'available',
      ]);

      dataTable.addRows(data);

      const chart = new google.visualization.Gantt(document.getElementById('ganttChart'));

      const options = {
        height: 600,
        width: '100%',
        gantt: {
          trackHeight: 30
        }
      };

      chart.draw(dataTable, options);
    });
  }
}

