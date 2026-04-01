export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  area: string;
}

export interface UnavailabilityRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "staff";
  content: string;
  timestamp: string;
  pinned: boolean;
  isAnnouncement: boolean;
}

export interface StaffFile {
  id: string;
  staffId: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export const mockShifts: Shift[] = [
  { id: "s1", staffId: "3", staffName: "Maria Lopez", date: "2026-03-30", startTime: "09:00", endTime: "14:00", area: "Rooms 1–10" },
  { id: "s2", staffId: "4", staffName: "James Chen", date: "2026-03-30", startTime: "10:00", endTime: "15:00", area: "Rooms 11–20" },
  { id: "s3", staffId: "5", staffName: "Priya Sharma", date: "2026-03-30", startTime: "08:00", endTime: "13:00", area: "Common Areas" },
  { id: "s4", staffId: "3", staffName: "Maria Lopez", date: "2026-03-31", startTime: "09:00", endTime: "14:00", area: "Rooms 1–10" },
  { id: "s5", staffId: "4", staffName: "James Chen", date: "2026-03-31", startTime: "10:00", endTime: "15:00", area: "Rooms 11–20" },
  { id: "s6", staffId: "3", staffName: "Maria Lopez", date: "2026-04-01", startTime: "09:00", endTime: "13:00", area: "Rooms 1–10" },
  { id: "s7", staffId: "5", staffName: "Priya Sharma", date: "2026-04-01", startTime: "08:00", endTime: "14:00", area: "Common Areas" },
  { id: "s8", staffId: "4", staffName: "James Chen", date: "2026-04-02", startTime: "09:00", endTime: "14:00", area: "Rooms 1–15" },
];

export const mockUnavailability: UnavailabilityRequest[] = [
  { id: "u1", staffId: "3", staffName: "Maria Lopez", startDate: "2026-04-05", endDate: "2026-04-07", reason: "Family event", status: "pending", submittedAt: "2026-03-25T10:00:00Z" },
  { id: "u2", staffId: "5", staffName: "Priya Sharma", startDate: "2026-04-10", endDate: "2026-04-10", reason: "Medical appointment", status: "approved", submittedAt: "2026-03-22T14:30:00Z" },
];

export const mockMessages: Message[] = [
  { id: "m2", authorId: "3", authorName: "Maria Lopez", authorRole: "staff", content: "Room 7 needs a new mattress protector — the current one has a tear.", timestamp: "2026-03-26T15:30:00Z", pinned: false, isAnnouncement: false },
  { id: "m4", authorId: "4", authorName: "James Chen", authorRole: "staff", content: "Can we get more vacuum bags? Running low.", timestamp: "2026-03-25T11:00:00Z", pinned: false, isAnnouncement: false },
];

export const mockFiles: StaffFile[] = [
  { id: "f1", staffId: "3", name: "Employment Contract.pdf", type: "pdf", size: "245 KB", uploadedAt: "2025-11-01T00:00:00Z" },
  { id: "f2", staffId: "3", name: "Tax Declaration Form.pdf", type: "pdf", size: "120 KB", uploadedAt: "2025-11-15T00:00:00Z" },
  { id: "f3", staffId: "4", name: "Employment Contract.pdf", type: "pdf", size: "250 KB", uploadedAt: "2025-12-01T00:00:00Z" },
  { id: "f4", staffId: "5", name: "Employment Contract.pdf", type: "pdf", size: "238 KB", uploadedAt: "2026-01-10T00:00:00Z" },
  { id: "f5", staffId: "5", name: "First Aid Certificate.jpg", type: "image", size: "1.2 MB", uploadedAt: "2026-02-01T00:00:00Z" },
];
