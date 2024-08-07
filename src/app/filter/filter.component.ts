import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IRoom } from '../Interface/iroom';
import { RoomsService } from '../Services/Rooms/rooms.service';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { ReservationService } from '../Services/Reservation/reservation.service';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit {
  rooms: IRoom[] = [];
  filteredRooms: IRoom[] = [];
  availability: IRoomAvailability[] = [];
   //locations: { locationId: number, locationName: string }[] = [];
  locations:string[]=[];
  filterForm: FormGroup;

  constructor(
    private roomService: RoomsService,
    private reservationService: ReservationService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      location: [''],
      dateFrom: [''],
      dateTo: [''],
      guests: [0],
      maxPrice: [Infinity],
      minStay: [0],
      maxStay: [Infinity]
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.rooms = await this.roomService.getRooms();
      this.availability = await this.reservationService.getReservations();
      // this.locations = [{ locationId: 101, locationName: 'Sunset Beach Resort' }, { locationId: 102, locationName: 'Mountain Lodge' }];
       this.locations = [...new Set(this.rooms.map(room => room.locationName))];
      this.applyFilters(); // Initial filter application
    } catch (error) {
      console.error('Error fetching data', error);
    }
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    this.filteredRooms = this.rooms.filter(room => {
      const avail = this.availability.find(avail => avail.roomId === room.roomId);
      return avail && this.isAvailable(avail, filters) && this.isWithinPriceRange(room, filters) && this.isWithinStayDuration(avail, filters);
    });
  }

  private isAvailable(avail: IRoomAvailability, filters: any): boolean {
    const stayDateFrom = new Date(filters.dateFrom);
    const stayDateTo = new Date(filters.dateTo);
    const availFrom = new Date(avail.stayDateFrom);
    const availTo = new Date(avail.stayDateTo);

    return stayDateFrom <= availTo && stayDateTo >= availFrom;
  }

  private isWithinPriceRange(room: IRoom, filters: any): boolean {
    return room.pricePerDayPerPerson <= filters.maxPrice;
  }

  private isWithinStayDuration(avail: IRoomAvailability, filters: any): boolean {
    return avail.minStay >= filters.minStay && avail.maxStay <= filters.maxStay;
  }
}
