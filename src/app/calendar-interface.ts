export interface RoomDetails {
    roomId: number;
    locationId: number;
    locationName: string;
    pricePerDayPerPerson: number;
    guestCapacity: number;
    roomName: string;
    stays: StayDetails[]; // Updated from Stay interface
  }
  
  export interface StayDetails {
    stayDateStart: string; // should be a string
    stayDateEnd: string; // should be a string
    roomId: number;
    allowedArrivalDays: string[];
    allowedDepartureDays: string[];
    minStay: number;
    maxStay: number;
    bookDateFrom?: string;
    bookDateTo?: string;
    minDeviation?: number;
    maxDeviation?: number;
  }
  

  export interface ReservationDetails {
    reservationId: string;
    locationId: number;
    roomId: number;
    customerId: string;
    arrivalDate: string;  // "YYYY-MM-DD"
    departureDate: string;  // "YYYY-MM-DD"
    reservationDate: string; // "YYYY-MM-DD HH:MM:SS"
    totalPrice: number;
    status: ReservationStatus;
    paidAmount: number;
    numberOfGuest: number;
  }
  
  export type ReservationStatus = "CONFIRM" | "CHECKED-IN" | "CHECKED-OUT";
  