import { Component } from '@angular/core';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router'; 
import { ModalComponent } from '../modal/modal.component';


interface Availability {
  start: Date;
  end: Date;
  status?: "CONFIRM" | "CHECKED-IN" | "CHECKED-OUT";
}

interface RoomData {
  roomId: number;
  availability: IRoomAvailability[];  // Use IRoomAvailability to include detailed data for each availability period
  reservations: Availability[];
  arrivalDays: { [day: string]: string[] }; 
  departureDays: Set<string>;
  minStayMap: { [day: string]: number }; 
  maxStayMap: { [day: string]: number }; 
}


interface DayObj {
  day: number;
  month: number;
  year: number;
}


@Component({
  selector: 'app-test-chart',
  templateUrl: './test-chart.component.html',
  styleUrl: './test-chart.component.css'
})
export class TestChartComponent {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  loading: boolean = true;  
  rooms: IRoom[] = [];
  stays: IRoomAvailability[] = [];
  reservations: IReservation[] = [];
  availabilityTable: RoomData[] = [];
  days: DayObj[] = [];
  selectedMonth: number; 
  year: number;
  selectedRoomId: number | null = null;
  startDay: number | undefined;
  endDay: number | undefined;
  isMouseDown = false;
  selectedCells: Set<string> = new Set();
  locations: string[] = [];
  filteredRooms: IRoom[] = [];
  guestCapacities: number[] = [];      // List of guest capacity filter options
  selectedGuestCapacity: number | null = null;
  selectedLocation: string | null = null;
  reservationMap: { [key: string]: IReservation } = {};

  constructor(
    private reservationService: ReservationService, 
    private modalService: NgbModal, 
    private router: Router
  ) {
    const today = new Date();
    this.selectedMonth = today.getMonth(); 
    this.year = today.getFullYear();
  }

  ngOnInit(): void {
    // this.loading = true;
    this.reservationService.getRoomsAndStays().subscribe(({ rooms, stays }) => {
      this.rooms = rooms;
      this.stays = stays;
      this.filteredRooms = rooms;
      this.reservations = this.reservationService.getReservations();
      this.buildReservationMap();
      this.updateRoomAvailability();
      this.generateChart();
      this.extractLocations();
      this.extractGuestCapacities();
      this.initializeTooltips(); 
      // this.loading = false;
      setTimeout(() => {
        this.scrollToToday();
    }, 0); 
    });
  }

  scrollToToday(): void {
    const today = new Date();
    const dayElementId = `day-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // Get the element corresponding to today's date
    const todayElement = document.getElementById(dayElementId);

    if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' });
    }
}

  initializeTooltips() {
      const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach((tooltipTriggerEl) => {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });
  }

  extractLocations(): void {
    // Extract unique locations from rooms
    this.locations = [...new Set(this.rooms.map(room => room.locationName))];
  }

  extractGuestCapacities(): void {
    this.guestCapacities = [...new Set(this.rooms.map(room => room.guestCapacity))].sort((a, b) => a - b);
  }

  
  onLocationFilterChange(event: any): void {
    const selectedLocation = event.target.value;
    this.selectedLocation = selectedLocation || null; // Store the selected location
    this.filterRooms(this.selectedLocation, this.selectedGuestCapacity);  // Apply both filters
  }

  onGuestCapacityFilterChange(event: any): void {
    const selectedCapacity = event.target.value === '' ? null : Number(event.target.value); // Handle "all capacities"
    this.selectedGuestCapacity = selectedCapacity; // Store the selected guest capacity
    this.filterRooms(this.selectedLocation, this.selectedGuestCapacity);  // Apply both filters
  }

  filterRooms(selectedLocation: string | null, selectedGuestCapacity: number | null): void {
    // Start by applying the location filter (if selected)
    this.filteredRooms = this.rooms;
  
    if (selectedLocation) {
      // Filter by location if a location is selected
      this.filteredRooms = this.filteredRooms.filter(room => room.locationName === selectedLocation);
    }
  
    if (selectedGuestCapacity !== null) {
      // Filter by guest capacity if it is selected (i.e., not null)
      this.filteredRooms = this.filteredRooms.filter(room => room.guestCapacity >= selectedGuestCapacity);
    }
  
    // Update room availability based on the filtered rooms
    this.updateRoomAvailability();
  }
  
  getMonthSections(): { monthName: string, dayCount: number }[] {
    const sections: { monthName: string, dayCount: number }[] = [];
    let currentMonth = this.days[0].month;
    let count = 0;
  
    this.days.forEach(dayObj => {
      if (dayObj.month !== currentMonth) {
        sections.push({ monthName: this.months[currentMonth], dayCount: count });
        currentMonth = dayObj.month;
        count = 1;
      } else {
        count++;
      }
    });
  
    // Push the final section for the last month
    sections.push({ monthName: this.months[currentMonth], dayCount: count });
    
    return sections;
  }

  generateChart(): void {
    const totalMonths = 5; 
    const startMonth = new Date().getMonth()-2;
    const startYear = this.year;
  
    this.days = [];
  
    for (let i = 0; i < totalMonths; i++) {
      const currentMonth = (startMonth + i) % 12;
      const currentYear = startYear + Math.floor((startMonth + i) / 12);
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        this.days.push({ day, month: currentMonth, year: currentYear });  // Store day, month, year together
      }
    }
  }


  getReservationStart(roomId: number, dayObj: { day: number, month: number, year: number }): number {
    const { day, month, year } = dayObj;
    const date = new Date(year, month, day);
  
    const reservation = this.reservations.find(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate) <= date &&
      new Date(reservation.departureDate) >= date
    );
  
    return reservation ? new Date(reservation.arrivalDate).getDate() : -1;
  }
  
  getReservationEnd(roomId: number, dayObj: { day: number, month: number, year: number }): number {
    const { day, month, year } = dayObj;
    const date = new Date(year, month, day);
  
    const reservation = this.reservations.find(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate) <= date &&
      new Date(reservation.departureDate) >= date
    );
  
    return reservation ? new Date(reservation.departureDate).getDate() : -1;
  }
  
  
   // Build a lookup map for reservations to optimize tooltip rendering
   buildReservationMap(): void {
    this.reservationMap = {};
    this.reservations.forEach((reservation) => {
      const start = new Date(reservation.arrivalDate);
      const end = new Date(reservation.departureDate);

      // Loop over each day of the reservation and add it to the map
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${reservation.roomId}-${d.toISOString().split('T')[0]}`;
        this.reservationMap[key] = reservation;
      }
    });
    
  }

   // Function to get the reservation for a specific room and date (if any)
   getReservationForCell(roomId: number, date: Date): IReservation | undefined {
    const key = `${roomId}-${date.toISOString().split('T')[0]}`;
    return this.reservationMap[key];
  }

  hasValidReservation(roomId: number, dayObj: { day: number, month: number, year: number }): boolean {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    return !!this.getReservationForCell(roomId, date);
  }
  
  getReservationSpan(roomId: number, dayObj: DayObj): string {
    const startDay = this.getReservationStart(roomId, dayObj);
    const endDay = this.getReservationEnd(roomId, dayObj);
  
    if (startDay === -1 || endDay === -1) {
      return 'span 1';  // Default to a single cell if no reservation is found
    }
  
    const spanLength = endDay - startDay + 1;
    return `span ${spanLength}`;
  }

  isReservationStart(roomId: number, dayObj: DayObj): boolean {
    const startDay = this.getReservationStart(roomId, dayObj);
    return startDay === dayObj.day;
  }

  
  hasReservation(roomId: number, dayObj: { day: number, month: number, year: number }): boolean {
    const { day, month, year } = dayObj;
    const date = new Date(year, month, day);
  
    return this.reservations.some(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate).toDateString() === date.toDateString()
    );
  }
  

  getCustomerName(roomId: number, dayObj: DayObj): string {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    const reservation = this.reservations.find(reservation =>
      reservation.roomId === roomId &&
      new Date(reservation.arrivalDate).toDateString() === date.toDateString()
    );
    // return reservation ? `${reservation.firstName} ${reservation.middleName} ${reservation.lastName}` : '';
    return reservation ? `${reservation.firstName}` : '';

  }
 
  getTooltipForCell(roomId: number, dayObj: { day: number, month: number, year: number }): string {

    const reservation = this.reservations.find(reservation =>
      reservation.roomId === roomId &&
      new Date(dayObj.year, dayObj.month, dayObj.day) >= new Date(reservation.arrivalDate)   &&
      new Date(dayObj.year, dayObj.month, dayObj.day) <= (new Date(reservation.departureDate))
    );
    
    
    if (reservation) {
      const customerName = `${reservation.firstName} ${reservation.middleName || ''} ${reservation.lastName}`;
      const arrivalDate = new Date(reservation.arrivalDate).toLocaleDateString();
      const departureDate = new Date(reservation.departureDate).toLocaleDateString();
      const stayLength = Math.ceil((new Date(reservation.departureDate).getTime() - new Date(reservation.arrivalDate).getTime()) / (1000 * 60 * 60 * 24));
      const status = reservation.status;
      return `Customer: ${customerName} \nArrival: ${arrivalDate} 12:00pm \nDeparture: ${departureDate} 11:00am \nStay: ${stayLength} nights \nStatus: ${status}`;
    }
  
    return ''; // Return empty if no reservation is found for the cell
  }

  updateRoomAvailability(): void {
    const availabilityMap: { [roomId: number]: Availability[] } = {};
    const reservationMap: { [roomId: number]: Availability[] } = {};
    const roomAvailabilities: { [roomId: number]: IRoomAvailability[] } = {};
  
    // Loop through stays and prepare availability data per room
    this.stays.forEach(stay => {
      const roomId = stay.roomId;
      const startDate = new Date(stay.stayDateFrom);
      const endDate = new Date(stay.stayDateTo);
  
      startDate.setHours(12, 0, 0, 0); // Normalizing start and end times for consistency
      endDate.setHours(11, 0, 0, 0);
  
      if (!availabilityMap[roomId]) {
        availabilityMap[roomId] = [];
      }
      availabilityMap[roomId].push({
        start: startDate,
        end: endDate
      });
  
      if (!roomAvailabilities[roomId]) {
        roomAvailabilities[roomId] = [];
      }
  
      roomAvailabilities[roomId].push({
        roomId: stay.roomId,
        stayDateFrom: stay.stayDateFrom,
        stayDateTo: stay.stayDateTo,
        arrivalDays: stay.arrivalDays,
        departureDays: stay.departureDays,
        minStay: stay.minStay,
        maxStay: stay.maxStay,
        minDeviation: stay.minDeviation,
        maxDeviation: stay.maxDeviation,
        bookDateFrom: stay.bookDateFrom,
        bookDateTo: stay.bookDateTo,
      });
    });
  
    // Update reservations map
    this.reservations.forEach(reservation => {
      const roomId = reservation.roomId;
      const startDate = new Date(reservation.arrivalDate);
      const endDate = new Date(reservation.departureDate);
  
      startDate.setHours(12, 0, 0, 0);
      endDate.setHours(11, 0, 0, 0);
  
      if (!reservationMap[roomId]) {
        reservationMap[roomId] = [];
      }
  
      reservationMap[roomId].push({
        start: startDate,
        end: endDate,
        status: reservation.status,
      });
    });
  
    // Map data to RoomData type for availability table
    this.availabilityTable = this.filteredRooms.map(room => {
      const roomId = room.roomId;
      const availabilityList = availabilityMap[roomId] || [];
      const roomAvailabilityList = roomAvailabilities[roomId] || [];
      
      const detailedAvailability = availabilityList.map(availability => {
        // Find matching room availability details (assuming there can be multiple availabilities)
        const correspondingRoomAvail = roomAvailabilityList.find(
          roomAvail => new Date(roomAvail.stayDateFrom) <= availability.start && new Date(roomAvail.stayDateTo) >= availability.end
        );
  
        // Map the availability using corresponding room data
        return this.mapAvailabilityToRoomAvailability(availability, correspondingRoomAvail!);
      });
  
      return {
        roomId: roomId,
        availability: detailedAvailability,
        reservations: reservationMap[roomId] || [],
        arrivalDays: this.mergeArrivalDays(detailedAvailability), // Aggregated arrival days info
        departureDays: this.mergeDepartureDays(detailedAvailability), // Aggregated departure days info
        minStayMap: this.createMinStayMap(detailedAvailability), // Minimum stay requirements for each day
        maxStayMap: this.createMaxStayMap(detailedAvailability), // Maximum stay requirements for each day
      };
    });
  }
  
  mergeArrivalDays(availabilities: IRoomAvailability[]): { [day: string]: string[] } {
    const arrivalDaysMap: { [day: string]: string[] } = {};
    
    availabilities.forEach(avail => {
      avail.arrivalDays.forEach(arrivalDay => {
        if (!arrivalDaysMap[arrivalDay]) {
          arrivalDaysMap[arrivalDay] = [];
        }
        avail.departureDays.forEach(departureDay => {
          if (!arrivalDaysMap[arrivalDay].includes(departureDay)) {
            arrivalDaysMap[arrivalDay].push(departureDay);
          }
        });
      });
    });
    
    return arrivalDaysMap;
  }
  
  mergeDepartureDays(availabilities: IRoomAvailability[]): Set<string> {
    const departureDaysSet = new Set<string>();
  
    availabilities.forEach(avail => {
      avail.departureDays.forEach(departureDay => {
        departureDaysSet.add(departureDay);
      });
    });
  
    return departureDaysSet;
  }
  
  createMinStayMap(availabilities: IRoomAvailability[]): { [day: string]: number } {
    const minStayMap: { [day: string]: number } = {};
    
    availabilities.forEach(avail => {
      avail.arrivalDays.forEach(day => {
        if (!minStayMap[day]) {
          minStayMap[day] = avail.minStay;
        } else {
          minStayMap[day] = Math.min(minStayMap[day], avail.minStay);
        }
      });
    });
  
    return minStayMap;
  }
  
  createMaxStayMap(availabilities: IRoomAvailability[]): { [day: string]: number } {
    const maxStayMap: { [day: string]: number } = {};
    
    availabilities.forEach(avail => {
      avail.arrivalDays.forEach(day => {
        if (!maxStayMap[day]) {
          maxStayMap[day] = avail.maxStay;
        } else {
          maxStayMap[day] = Math.max(maxStayMap[day], avail.maxStay);
        }
      });
    });
  
    return maxStayMap;
  }
  
  getCellClass(roomId: number, dayObj: { day: number, month: number, year: number }): string {
  const { day, month, year } = dayObj;
  const date = new Date(year, month, day); // Current day being processed
  date.setHours(12, 0, 0, 0); // Set time to 12 PM to align with check-in

  const roomData = this.availabilityTable.find(data => data.roomId === roomId);

  if (!roomData) return '';

  // Check if the current day is within any availability period
  const isAvailable = roomData.availability.some(
    (avail) => date >= avail.stayDateFrom && date <= avail.stayDateTo
  );

  const isCheckedIn = roomData.reservations.some(
    (reserv) => date >= reserv.start && date <= reserv.end && reserv.status === 'CHECKED-IN'
  );

  const isCheckedOut = roomData.reservations.some(
    (reserv) => date >= reserv.start && date <= reserv.end && reserv.status === 'CHECKED-OUT'
  );

  // Check if the current day is within any reservation period
  const isReserved = roomData.reservations.some(
    (reserv) => {
      const reservationStartDate = new Date(reserv.start);
      const reservationEndDate = new Date(reserv.end);

      reservationStartDate.setHours(12, 0, 0, 0); // Check-in time
      reservationEndDate.setHours(11, 0, 0, 0); // Check-out time

      // Reserved period is the night before the checkout date
      return date >= reservationStartDate && date < reservationEndDate && reserv.status === 'CONFIRM';
    }
  );

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  // Convert Availability to IRoomAvailability before calling generateValidArrivalDates
  const isArrivalDay = roomData.availability.some(avail => {
    // We no longer need to map `avail` to `Availability`, as we're directly using `IRoomAvailability`.
    return (
      date >= new Date(avail.stayDateFrom) &&
      date <= new Date(avail.stayDateTo) &&
      this.generateValidArrivalDates(avail).has(this.formatDate(date))
    );
  });
  

  const isSelected = this.selectedCells.has(`${roomId}-${day}-${month}-${year}`);

  // Check if the current cell is the start of a reservation
  const isReservationStart = roomData.reservations.some(reserv => {
    const reservationStartDate = new Date(reserv.start);
    reservationStartDate.setHours(12, 0, 0, 0); // Set check-in time
    return reservationStartDate.toDateString() === date.toDateString(); // Is this the reservation start date?
  });

  // Check if the current cell is the last night of a reservation
  const isReservationEnd = roomData.reservations.some(reserv => {
    const reservationEndDate = new Date(reserv.end);
    reservationEndDate.setHours(11, 0, 0, 0); // Check-out time
    const lastNightDate = new Date(reservationEndDate);
    lastNightDate.setDate(lastNightDate.getDate() - 1); // Subtract one day for the last reserved night

    return lastNightDate.toDateString() === date.toDateString(); // Is this the last night before check-out?
  });

  let cellClass = '';

  if (this.selectedCells.has(`${roomId}-${day}-${month}-${year}`)) {
    cellClass += ' valid-departure';  // Apply a special class for valid departure days
  }

  // Build the cell class based on the availability and reservation status
  if (isSelected) {
    cellClass = 'selected';
  } else if (isReserved) {
    cellClass = 'reserved';
  } else if (isCheckedIn) {
    cellClass = 'checked-in';
  } else if (isCheckedOut) {
    cellClass = 'checked-out';
  } else if (isAvailable && isArrivalDay) {
    cellClass = 'available arrival-day';
  } else if (isAvailable) {
    cellClass = 'available';
  } else {
    cellClass = 'not-available';
  }

  // Append border-radius classes for the start and end of reservations
  if (isReservationStart) {
    cellClass += ' reservation-start';
  }
  if (isReservationEnd) {
    cellClass += ' reservation-end';
  }

  return cellClass;
}


mapAvailabilityToRoomAvailability(availability: Availability, roomAvail: IRoomAvailability): IRoomAvailability {
  return {
    roomId: roomAvail.roomId,
    stayDateFrom: availability.start,
    stayDateTo: availability.end,
    arrivalDays: roomAvail.arrivalDays ?? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], // Use room-specific data or default
    departureDays: roomAvail.departureDays ?? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], // Use room-specific data or default
    minStay: roomAvail.minStay ?? 1,  // Use room-specific data or default
    maxStay: roomAvail.maxStay ?? 30,  // Use room-specific data or default
    minDeviation: roomAvail.minDeviation ?? 0,  // Use room-specific data or default
    maxDeviation: roomAvail.maxDeviation ?? 999,  // Use room-specific data or default
    bookDateFrom: roomAvail.bookDateFrom ?? new Date().toISOString().split('T')[0],  // Use room-specific data or default
    bookDateTo: roomAvail.bookDateTo ?? new Date('2024-12-31').toISOString().split('T')[0]  // Use room-specific data or default
  };
}

  
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; 
    }
  
  getDayName(dayObj: DayObj): string {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  }

  isWeekend(dayObj: DayObj): boolean {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    return date.getDay() === 6 || date.getDay() === 0;
  }


  onMouseDown(roomId: number, dayObj: DayObj, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
  
    if (this.selectedRoomId !== null) {
      this.clearSelectionInRoom(this.selectedRoomId, dayObj.month, dayObj.year);
    }
  
    this.highlightValidDepartureDays(roomId, dayObj);
    this.selectedRoomId = roomId;
    this.startDay = dayObj.day;
    this.addSelection(dayObj.day, dayObj.day, roomId, dayObj.month, dayObj.year); 
  }


  onMouseOver(roomId: number, dayObj: DayObj, event: MouseEvent) {
    
    event.preventDefault();
    if (this.isMouseDown && roomId === this.selectedRoomId) {
      console.log("Selected roomId : ", this.selectedRoomId);
      
      if (dayObj.day >= (this.startDay || 0)) {
        this.endDay = dayObj.day; 
        console.log("Inside mouse over Start day : ", this.startDay);
        console.log("Inside mouse over end day : ", this.endDay);
        this.updateSelection(roomId,dayObj); 
      }
    }
  }


  onMouseUp(dayObj: DayObj, event: MouseEvent) {
    console.log("on mouse up");
    this.isMouseDown = false;
    if (this.selectedRoomId !== null) {
      console.log("Validate selection called inside mouse Up");
      
      this.validateSelection(this.selectedRoomId, dayObj);
      if (this.selectedCells.size > 0) {
        const selectedDays = Array.from(this.selectedCells)
          .filter(cell => cell.startsWith(`${this.selectedRoomId}-`))
          .map(cell => parseInt(cell.split('-')[1], 10))
          .sort((a, b) => a - b);

        if (selectedDays.length > 0) {
          const startDay = selectedDays[0];
          const endDay = selectedDays[selectedDays.length - 1];

          const arrivalDate = new Date(dayObj.year, dayObj.month, startDay);
          const departureDate = new Date(dayObj.year, dayObj.month, endDay);
          const roomDetails = this.rooms.find(room => room.roomId === this.selectedRoomId);
          if (roomDetails) {
            const bookingDetails = {
              roomId: roomDetails.roomId,
              locationId: roomDetails.locationId, // Assuming you have a location ID
              roomName: roomDetails.roomName, // Assuming you have a room name
              pricePerDayPerPerson: roomDetails.pricePerDayPerPerson,
              arrivalDate: arrivalDate,
              departureDate: departureDate,
              locationName: roomDetails.locationName // Add any other details you have
            };
            this.openBookingModal(bookingDetails);
          }
        }
      }
    }
  }

  highlightValidDepartureDays(roomId: number, dayObj: DayObj): void {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    const selectedArrivalDate = new Date(dayObj.year, dayObj.month, dayObj.day);
    selectedArrivalDate.setHours(12, 0, 0, 0);
  
    const validDepartureDays = roomData.arrivalDays[this.getDayOfWeek(selectedArrivalDate)] || [];
  
    this.days.forEach(day => {
      const currentDate = new Date(day.year, day.month, day.day);
      currentDate.setHours(12, 0, 0, 0);
  
      if (validDepartureDays.includes(this.getDayOfWeek(currentDate)) && currentDate > selectedArrivalDate) {
        this.selectedCells.add(`${roomId}-${day.day}-${day.month}-${day.year}`);
      }
    });
  }
  
  


  updateSelection(roomId: number,dayObj: DayObj): void {
    if (this.startDay === undefined || this.endDay === undefined) return;
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;
  
    console.log("In update selection");
    console.log("Start day : ", this.startDay, " || End day: ", this.endDay);
  
    let currentStart = this.startDay;
    let currentEnd = this.endDay;
  
    if (this.checkOverlap(currentStart, currentEnd, roomData, dayObj)) {
      console.log("Selection overlaps with a reservation, clearing selection.");
      this.clearAllSelections();
    } else {
      this.addSelection(currentStart, currentEnd, roomId,dayObj.month, dayObj.year);
    }
    this.validateSelection(roomId, dayObj);
  }


  checkOverlap(start: number, end: number, roomData: RoomData, dayObj: DayObj): boolean {
    const startDate = new Date(dayObj.year, dayObj.month, start);
    const endDate = new Date(dayObj.year, dayObj.month, end);
    startDate.setHours(12,0,0,0);
    endDate.setHours(11,0,0,0);

    // Check if the start date and end date overlap with any reservation period
    const overlaps = roomData.reservations.some(reservation => {
        const reservationStart = new Date(reservation.start);
        const reservationEnd = new Date(reservation.end);
        reservationEnd.setHours(11, 0, 0, 0); // Ensure correct checkout time

        // console.log(" startDate ", startDate);
        // console.log(" endDate ", endDate);
        // console.log(" reservationStart ", reservationStart);
        // console.log(" reservationEnd ", reservationEnd);
        
        // Check if the selection period overlaps with the reservation period
        return startDate <= reservationEnd && endDate >= reservationStart;
      
    });

    return overlaps;
}

generateValidArrivalDates(avail: IRoomAvailability): Set<string> {
  const arrivalDates = new Set<string>();

  if (!avail.arrivalDays || avail.arrivalDays.length === 0) {
    avail.arrivalDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; // Allow all days if no specific days are provided.
  }

  const today = new Date();
  const bookDateFrom = avail.bookDateFrom ? new Date(avail.bookDateFrom) : null;
  const bookDateTo = avail.bookDateTo ? new Date(avail.bookDateTo) : null;

  if (!this.isWithinBookingWindow(today, bookDateFrom, bookDateTo)) {
    return arrivalDates; // Skip if today's date is outside the booking window.
  }

  const minDeviation = avail.minDeviation ?? 0;
  const maxDeviation = avail.maxDeviation ?? 999;

  const minDate = new Date(today.getTime() + minDeviation * 24 * 60 * 60 * 1000);
  const maxDate = new Date(today.getTime() + maxDeviation * 24 * 60 * 60 * 1000);

  const effectiveMinDate = bookDateFrom && minDate < bookDateFrom ? bookDateFrom : minDate;
  const effectiveMaxDate = bookDateTo && maxDate > bookDateTo ? bookDateTo : maxDate;

  if (effectiveMaxDate < effectiveMinDate) {
    return arrivalDates; // No valid dates available if range is invalid.
  }

  for (let date = new Date(effectiveMinDate); date <= effectiveMaxDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = this.getDayOfWeek(date);
    if (avail.arrivalDays.includes(dayOfWeek)) {
      const formattedDate = date.toISOString().split('T')[0];
      arrivalDates.add(formattedDate);
    }
  }

  return arrivalDates;
}

getDayOfWeek(date: Date): string {
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return daysOfWeek[date.getDay()];
}

isWithinBookingWindow(today: Date, bookDateFrom: Date | null, bookDateTo: Date | null): boolean {
  const validFrom = !bookDateFrom || today >= bookDateFrom;
  const validTo = !bookDateTo || today <= bookDateTo;
  return validFrom && validTo;
}

  
  validateSelection(roomId: number,dayObj: DayObj): void {
    console.log(" Validate Selection triggered and inside it ");
    
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return;

    const selectedDays = Array.from(this.selectedCells)
      .filter(cell => cell.startsWith(`${roomId}-`))
      .map(cell => parseInt(cell.split('-')[1], 10))
      .sort((a, b) => a - b);

    if (selectedDays.length === 0) {
      return;
    }

    const startDay = selectedDays[0];
    const endDay = selectedDays[selectedDays.length - 1];

    const startDate = new Date(dayObj.year, dayObj.month, startDay);
    const endDate = new Date(dayObj.year, dayObj.month,endDay);
    const startDayString = startDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const endDayString = endDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

    const availabilityWindow = roomData.availability.find(avail => 
      avail.stayDateFrom <= startDate && avail.stayDateTo >= endDate
    );

    if (!availabilityWindow) {
      this.clearAllSelections();
      return;
    }

    
    // Fetch the specific valid departure days for the selected arrival day
    const validArrivalDayDepartures = roomData.arrivalDays[startDayString] || [];

    const validDepartureDays = roomData.departureDays;
    const validArrivalDays = roomData.arrivalDays || [];

    console.log(" validArrivalDays : ", validArrivalDays);
    console.log(" validDepartureDays : ", validDepartureDays);
    console.log(" validArrivalDayDepartures : ", validArrivalDayDepartures);

      console.log("startDayString :  ", startDayString);
    console.log("endDayString :  ", endDayString);
    
    // Ensure the departure day is valid for the selected arrival day and satisfies min and max stay
    // if (!validArrivalDays.includes(endDayString) || !validDepartureDays.has(endDayString)) {
    //   this.clearAllSelections();
    //   return;
    // }

    if ( !validArrivalDayDepartures.includes(endDayString)) {
      this.clearAllSelections();
      return;
    }

    const minStay = roomData.minStayMap[startDayString] || 1;
    const maxStay = roomData.maxStayMap[startDayString] || Number.MAX_SAFE_INTEGER;

    console.log("minStay : ", minStay);
    console.log("maxStay : ", maxStay);
    
    const stayLength = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    // console.log(" endDate.getTime()", endDate.getTime()/ (1000 * 60 * 60 * 24));
    // console.log(" startDate.getTime()", startDate.getTime()/ (1000 * 60 * 60 * 24));

    console.log(" stayLength", stayLength);
    

    if (stayLength < minStay || stayLength > maxStay || !validDepartureDays.has(endDayString) || this.checkOverlap(startDay, endDay, roomData, dayObj)) {
      this.clearAllSelections();
    }
  }
  
  addSelection(start: number, end: number, roomId: number,month: number, year: number) {
    console.log(" Inside Add selection ");
    
    for (let day = start; day <= end; day++) {
      const cellKey = `${roomId}-${day}-${month}-${year}`;
      this.selectedCells.add(cellKey);
      console.log(this.selectedCells, "In add selection");
      console.log("RoomID - Day ", cellKey, "Cell key added"); 
    }
  }

  clearSelectionInRoom(roomId: number | null, month: number, year: number) {
    if (roomId === null) return;

    this.days.forEach(day => {
      const cellKey = `${roomId}-${day.day}-${month}-${year}`;
      if (this.selectedCells.has(cellKey)) {
        this.selectedCells.delete(cellKey);
        console.log(this.selectedCells, "In clearSelection");
        console.log(cellKey, "Cell key deleted");
      }
    });
  }

  clearAllSelections() {
    this.selectedCells.clear();
  }

  isCellClickable(roomId: number, dayObj: DayObj): boolean {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    date.setHours(12, 0, 0, 0);
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return false;
  
    const isAvailable = roomData.availability.some(
      avail => date >= avail.stayDateFrom && date <= avail.stayDateTo
    );
    const isBooked = roomData.reservations.some(
      reserv => date >= reserv.start && date <= reserv.end
    );

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const isArrivalDay = roomData.arrivalDays[dayName] ? true : false;
  
    return (isAvailable && !isBooked);
  }

  isCellHoverable(roomId: number, dayObj: DayObj): boolean {
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
    if (!roomData) return false;
  
    // Always allow hover for cells that have reservations (for tooltips)
    const isReserved = roomData.reservations.some(
      reserv => {
        const reservationStartDate = new Date(reserv.start);
        const reservationEndDate = new Date(reserv.end);
        reservationStartDate.setHours(12, 0, 0, 0);
        reservationEndDate.setHours(11, 0, 0, 0);
        return new Date(dayObj.year, dayObj.month, dayObj.day) >= reservationStartDate &&
               new Date(dayObj.year, dayObj.month, dayObj.day) <= reservationEndDate;
      }
    );
  
    // Always allow hover for reserved cells
    return isReserved || this.isCellClickable(roomId, dayObj);
  }

  
  openBookingModal(bookingDetails: any): void {
    console.log('Booking Details:', bookingDetails);
    
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.bookingDetails = bookingDetails;

    modalRef.result.then((result) => {
        console.log('Modal closed with result:', result);
        // this.ngOnInit();
        console.log(" inside mod ref of planning chart");
        
        this.clearAllSelections();
        this.router.navigate(['/planningchart']).then(() => {
          this.ngOnInit(); 
        });

        // window.location.reload();
    }, (reason) => {
        console.log('Modal dismissed with reason:', reason);
        this.clearAllSelections();
    });
  }
}
