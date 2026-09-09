export type TicketType = 'BUG' | 'ISSUE' | 'QUESTION' | 'PARTNERSHIP' | string;

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;

export interface TicketUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  name: string;
  email?: string;
  phone?: string;
  userId?: string;
  user?: TicketUser | null;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}
