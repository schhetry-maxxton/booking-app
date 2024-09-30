import { IRoomAvailability } from "./iroom-availability";

export interface CalendarRoom {
    roomId: number;
    locationId: number;
    locationName: string;
    roomName: string;
    pricePerDayPerPerson: number;
    guestCapacity: number;
    selectedStay?: IRoomAvailability; // The stay that matched the criteria
}
