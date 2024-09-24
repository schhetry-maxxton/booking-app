export interface IRoomAvailability {
    roomId : number,
    stayDateFrom : Date    //"YYYY-MM-DD",
    stayDateTo: Date    //"YYYY-MM-DD",
    arrivalDays: string[],
    departureDays: string[],
    minStay: number,
    maxStay: number,
    bookDateFrom?: string; // Earliest date to make a reservation
    bookDateTo?: string; // Latest date to make a reservation
    minDeviation?: number; // Minimum days between booking and arrival
    maxDeviation?: number;
    
}
