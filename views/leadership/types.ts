export type LeadershipRank = 
  | 'Bishop'
  | 'Reverend'
  | 'Pastor'
  | 'Ministry Head'
  | 'Deputy Ministry Head'
  | 'Executive'
  | 'Branch Leader'
  | 'Cell Leader';

export interface LeadershipHistoryItem {
  id: string;
  date: string;
  action: 'Appointment' | 'Promotion' | 'Demotion' | 'Transfer' | 'Leave Change' | 'Note Log';
  details: string;
  performed_by: string;
}

export interface Leader {
  id: string;
  first_name: string;
  last_name: string;
  position: string; // Specific church title, e.g. "Senior Overseer", "Youth Pastor"
  category: LeadershipRank; // Standardized hierarchy rank
  ministry: string;
  email: string;
  phone: string;
  image_url?: string;
  reports_to_id?: string;
  branch: string;
  appointment_date: string;
  ordination_date?: string;
  status: 'Active' | 'On Leave' | 'Retired';
  notes?: string;
  leadership_history?: LeadershipHistoryItem[];
  created_at?: string;
}

export interface LeadershipAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  rank: string;
}

export interface LeadershipAnnouncement {
  id: string;
  title: string;
  message: string;
  targetGroup: string;
  sentAt: string;
  sender: string;
}
