export type UserRole = 'customer' | 'agent' | 'manager' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface Ticket {
  _id: string;
  customerId: User | string;
  title: string;
  description: string;
  category: 'Software' | 'Hardware' | 'Network' | 'Billing' | string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  status: 'Open' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed' | string;
  assignedAgentId?: User | string | null;
  slaDueAt?: string;
  isEscalated?: boolean;
  escalationReason?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommentItem {
  _id: string;
  ticketId: string;
  authorId: User | { _id: string; name: string; email: string; role: string };
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SlaRule {
  _id: string;
  category: string;
  priority: string;
  resolutionHours: number;
}

export interface Rating {
  _id: string;
  ticketId: string;
  customerId: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface SlaComplianceReport {
  compliancePercentage: number;
  totalResolvedOrClosed: number;
  metSla: number;
  breachedSla: number;
}

export interface AgentWorkloadReport {
  agentId: string;
  agentName: string;
  activeTickets: number;
}

export interface CategoryBreakdownReport {
  _id: string;
  count: number;
}

export interface VolumeTrendsReport {
  _id: string;
  count: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}
