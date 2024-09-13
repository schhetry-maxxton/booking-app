import { IRoomAvailability } from "./iroom-availability";

export interface IRoom {
    roomId: number;
    locationId: number;
    locationName: string;
    roomName: string;
    pricePerDayPerPerson: number;
    guestCapacity: number;
    availabilities: IRoomAvailability[]; // New field to hold multiple availabilities
  }
  