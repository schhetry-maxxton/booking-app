import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../Services/Reservation/reservation.service';
import { IRoom } from '../Interface/iroom';
import { IRoomAvailability } from '../Interface/iroom-availability';
import { IReservation } from '../Interface/ireservation'; 
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';
import { Router } from '@angular/router'; 

interface Availability {
  start: Date;
  end: Date;
  status?: "CONFIRM" | "CHECKED-IN" | "CHECKED-OUT" | "CANCELLED";
}

interface RoomData {
  roomId: number;
  availability: Availability[];
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
  selector: 'app-room-availability-gantt',
  templateUrl: './room-availability-gantt.component.html',
  styleUrls: ['./room-availability-gantt.component.css']
})
export class RoomAvailabilityGanttComponent implements OnInit {

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
    this.loading = true;
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
      this.loading = false;
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
    const arrivalDaysMap: { [roomId: number]: { [arrivalDay: string]: string[] } } = {}; 
    // const arrivalDaysMap: { [roomId: number]: { [day: string]: string[] } } = {};

    const departureDaysMap: { [roomId: number]: Set<string> } = {};
    const minStayMap: { [roomId: number]: { [day: string]: number } } = {};
    const maxStayMap: { [roomId: number]: { [day: string]: number } } = {};

    this.stays.forEach(stay => {
      const roomId = stay.roomId;
      const startDate = new Date(stay.stayDateFrom);
      const endDate = new Date(stay.stayDateTo);
    
      startDate.setHours(12, 0, 0, 0);
      endDate.setHours(11, 0, 0, 0);
    
      if (!availabilityMap[roomId]) {
        availabilityMap[roomId] = [];
      }
    
      availabilityMap[roomId].push({
        start: startDate,
        end: endDate
      });
    
      if (!arrivalDaysMap[roomId]) {
        arrivalDaysMap[roomId] = {};
      }
    
      stay.arrivalDays.forEach(arrivalDay => {
        const arrivalDayUpper = arrivalDay.toUpperCase();
        if (!arrivalDaysMap[roomId][arrivalDayUpper]) {
          arrivalDaysMap[roomId][arrivalDayUpper] = [];
        }

         // Now only push the departure days specific to this arrival day
        stay.departureDays.forEach(departureDay => {
          const departureDayUpper = departureDay.toUpperCase();
          if (!arrivalDaysMap[roomId][arrivalDayUpper].includes(departureDayUpper)) {
            arrivalDaysMap[roomId][arrivalDayUpper].push(departureDayUpper);
          }
        });

        if (!minStayMap[roomId]) {
          minStayMap[roomId] = {};
        }
        if (!maxStayMap[roomId]) {
          maxStayMap[roomId] = {};
        }
    
        minStayMap[roomId][arrivalDayUpper] = Math.min(stay.minStay, minStayMap[roomId][arrivalDayUpper] || Number.MAX_SAFE_INTEGER);
        maxStayMap[roomId][arrivalDayUpper] = Math.max(stay.maxStay, maxStayMap[roomId][arrivalDayUpper] || 0);
      });
    
      stay.departureDays.forEach(departureDay => {
        const departureDayUpper = departureDay.toUpperCase();
        departureDaysMap[roomId] = departureDaysMap[roomId] || new Set<string>();
        departureDaysMap[roomId].add(departureDayUpper);
      });
    });
    
    this.reservations.forEach(reservation => {
      const roomId = reservation.roomId;
      const startDate = new Date(reservation.arrivalDate);
      const endDate = new Date(reservation.departureDate) ;

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
  
    this.availabilityTable = this.filteredRooms.map(room => ({
      roomId: room.roomId,
      availability: availabilityMap[room.roomId] || [],
      reservations: reservationMap[room.roomId] || [],
      arrivalDays: arrivalDaysMap[room.roomId] || {}, 
      departureDays: departureDaysMap[room.roomId] || new Set<string>(),
      minStayMap: minStayMap[room.roomId] || {}, 
      maxStayMap: maxStayMap[room.roomId] || {}  
    }));
    console.log(this.availabilityTable);
  }
  
  
  getCellClass(roomId: number, dayObj: { day: number, month: number, year: number }): string {
    const { day, month, year } = dayObj;
    const date = new Date(year, month, day); // Current day being processed
    date.setHours(12, 0, 0, 0); // Set time to 12 PM to align with check-in
  
    const roomData = this.availabilityTable.find(data => data.roomId === roomId);
  
    if (!roomData) return '';
  
    // Check if the current day is within any availability period
    const isAvailable = roomData.availability.some(
      (avail) => date >= avail.start && date <= avail.end
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
        return date >= reservationStartDate && date < reservationEndDate && reserv.status === 'CONFIRM' ;
      }
    );
  
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const isArrivalDay = roomData.arrivalDays[dayName] ? true : false;
  
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
    }else if (isCheckedOut) {
      cellClass = 'checked-out';
    }else if (isAvailable && isArrivalDay) {
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
  
    const selectedArrivalDay = dayObj.day;
    const selectedArrivalDate = new Date(dayObj.year, dayObj.month, selectedArrivalDay);
    selectedArrivalDate.setHours(12, 0, 0, 0); // Align with the check-in time
  
    const selectedArrivalDayString = selectedArrivalDate
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toUpperCase();
  
    // Fetch valid departure days for the selected arrival day
    const validDepartureDays = roomData.arrivalDays[selectedArrivalDayString] || [];
  
    // Loop through all the days and highlight only the valid future departure days
    this.days.forEach(day => {
      const currentDate = new Date(day.year, day.month, day.day);
      currentDate.setHours(12, 0, 0, 0); // Align with the check-in time
  
      const dayString = currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  
      // Condition: Check if the current day is valid as a departure day and in the future of the selected arrival day
      const isValidDepartureDay = validDepartureDays.includes(dayString) && currentDate >= selectedArrivalDate;
  
      // Condition: Check if the current day is reserved
      const isReserved = roomData.reservations.some(reservation => {
        const reservationStart = new Date(reservation.start);
        const reservationEnd = new Date(reservation.end);
        reservationEnd.setHours(11, 0, 0, 0); // Set check-out time
  
        // Check if the current date falls within a reservation period
        return currentDate >= reservationStart && currentDate <= reservationEnd;
      });
  
      // Highlight the cell only if it is a valid departure day and not reserved
      if (isValidDepartureDay && !isReserved) {
        const cellKey = `${roomId}-${day.day}-${day.month}-${day.year}`;
        this.selectedCells.add(cellKey);  // Add a class or mark these days as highlighted
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
      avail.start <= startDate && avail.end >= endDate
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
      avail => date >= avail.start && date <= avail.end
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
        // this.router.navigate(['/planningchart']).then(() => {
        //   this.ngOnInit(); 
        // });

        window.location.reload();
    }, (reason) => {
        console.log('Modal dismissed with reason:', reason);
        this.clearAllSelections();
    });
  }
}