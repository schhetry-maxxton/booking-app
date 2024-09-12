export interface IGanttTask {
    id: string;
    name: string;
    start: Date;
    end: Date;
    progress?: number;
    roomId: string;
    location: string;
    guestCapacity: number;
  }
  