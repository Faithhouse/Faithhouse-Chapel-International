
// Expanded UserRole to include roles used in AdminUsersView
export type UserRole = 
  | 'System Administrator'
  | 'Head Pastor' 
  | 'Evangelism Ministry' 
  | 'Follow-up & Visitation' 
  | 'Music Ministry' 
  | 'Security & Facilities' 
  | 'Finance / Treasury' 
  | 'General Admin'
  | 'General Office'
  | 'Assistant'
  | 'Ministry Head'
  | 'General Overseer'
  | 'Church Admin';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive' | 'Pending';
  branch_id?: string;
  created_at?: string;
}

export type NavItem = 
  | 'Dashboard'
  | 'General Overseer'
  | 'Members'
  | 'Attendance'
  | 'Ministers & Pastors'
  | 'Ministries'
  | 'Media Ministry'
  | 'Music Ministry'
  | 'Ushering Ministry'
  | 'Prayer Ministry'
  | 'Evangelism'
  | 'Children Ministry'
  | 'Visitation & Follow-up'
  | 'Finance'
  | 'Events'
  | 'Branches'
  | 'Admin Users'
  | 'WhatsApp Hub'
  | 'Recurring Tasks'
  | 'Member Profile'
  | 'Settings';

export interface Branch {
  id: string;
  name: string;
  location: string;
  pastor_in_charge?: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  wedding_anniversary?: string;
  date_joined?: string;
  branch_id: string;
  status: 'Active' | 'Inactive' | 'Visitor' | 'Probation';
  ministry?: string;
  role?: string;
  gps_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notify_birthday?: boolean;
  notify_events?: boolean;
  created_at?: string;
  branches?: Branch;
}

export interface WhatsAppConfig {
  id?: number;
  api_url: string;
  access_token: string;
  sender_number: string;
  provider: string;
  status: 'Connected' | 'Unlinked' | 'Error';
  updated_at?: string;
}

export interface ScheduledMessage {
  id: string;
  title: string;
  message: string;
  scheduled_for: string;
  target_group: 'All' | 'Visitors' | 'Active Members' | 'Ministry Heads' | 'Absentees' | 'First Timers' | 'Children Ministry' | 'Teens Ministry' | 'Custom Selection';
  message_type: 'Text' | 'Image' | 'Announcement' | 'Reminder';
  branch_context?: string;
  event_id?: string;
  status: 'Pending' | 'Sent' | 'Failed' | 'Draft' | 'Scheduled' | 'Queued';
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at?: string;
  created_by?: string;
  media_url?: string;
}

export interface VisitationRecord {
  id: string;
  member_id: string;
  visitor_id?: string;
  visit_date: string;
  category: 'First-time Visitor' | 'Sick/Hospital' | 'Bereaved' | 'New Convert' | 'Inactive/Backslidden';
  status: 'Pending' | 'Contacted' | 'Visited' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  outcome?: string;
  created_at?: string;
  members?: Member;
}

export interface FinancialRecord {
  id: string;
  service_date: string;
  service_type: string;
  branch_id?: string;
  tithes: number;
  offerings: number;
  seed: number;
  expenses: number;
  other_income: number;
  total_income: number;
  bank_deposit: number;
  momo_deposit: number;
  bank_balance: number;
  momo_balance: number;
  witness1_name: string;
  witness2_name: string;
  notes?: string;
  status: 'Draft' | 'Posted';
  created_at?: string;
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'member' | 'finance' | 'event' | 'system';
}

export interface ChurchEvent {
  id: string;
  title: string;
  category: 'Prophetic Word Service' | 'Help from above service' | 'Special services' | 'Conferences';
  date: string;
  time: string;
  location: string;
  description: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
}

export interface Minister {
  id: string;
  member_id: string;
  branch_id: string;
  role: string;
  ministry?: string;
  ordination_date?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
  members?: Member;
  branches?: Branch;
}

export interface AttendanceEvent {
  id: string;
  event_name: string;
  event_type: 'Prophetic Word Service' | 'Help from above service' | 'Special services' | 'Conferences' | 'Children Ministry';
  event_date: string;
  branch_id?: string;
  men_count?: number;
  women_count?: number;
  children_count?: number;
  young_adult_count?: number;
  teen_count?: number;
  total_attendance?: number;
  created_at?: string;
  branches?: Branch;
}

export interface AttendanceRecord {
  id?: string;
  attendance_event_id: string;
  member_id: string;
  status: 'Present' | 'Absent' | 'Excused' | 'Unmarked';
  notes?: string;
  created_at?: string;
}

export interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface RecurringTaskTemplate {
  id: string;
  title: string;
  description?: string;
  service_type: 'Prophetic Word Service' | 'Help from above service' | 'Special services' | 'Conferences' | 'All';
  assigned_ministry?: string;
  created_at?: string;
}

export interface TaskInstance {
  id: string;
  template_id?: string;
  event_id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked';
  assigned_to?: string;
  due_date: string;
  completed_at?: string;
  completed_by?: string;
  created_at?: string;
}

export interface Ministry {
  id: string;
  name: string;
  leader_name?: string;
  description?: string;
  meeting_schedule?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface Volunteer {
  id: string;
  member_id: string;
  branch_id: string;
  ministry: string;
  skill?: string;
  availability: string;
  status: 'Active' | 'Inactive';
  joined_date?: string;
  created_at?: string;
  members?: Member;
  branches?: Branch;
}

export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female';
  class_group_id: string;
  parent_id: string;
  medical_notes?: string;
  allergies?: string;
  special_needs?: string;
  registration_date: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface Parent {
  id: string;
  full_name: string;
  phone_number: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  relationship_to_child: string;
  emergency_contact: string;
  created_at?: string;
}

export interface ClassGroup {
  id: string;
  group_name: string;
  age_range: string;
  teacher_id?: string;
  classroom_location?: string;
  created_at?: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  phone: string;
  role: 'Teacher' | 'Assistant' | 'Volunteer';
  assigned_group?: string;
  background_check_status: 'Pending' | 'Passed' | 'Failed';
  ministry_start_date: string;
  created_at?: string;
}

export interface ChildrenService {
  id: string;
  service_name: string;
  date: string;
  theme?: string;
  teacher_in_charge?: string;
  created_at?: string;
}

export interface ChildrenAttendance {
  id: string;
  child_id: string;
  class_group_id: string;
  service_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  marked_by: string;
  status: 'Present' | 'Absent';
  notes?: string;
  created_at?: string;
}

export interface CheckInLog {
  id: string;
  child_id: string;
  parent_id: string;
  service_id: string;
  check_in_time: string;
  check_out_time?: string;
  authorized_person: string;
  verification_method: 'PIN' | 'QR' | 'Manual';
  recorded_by: string;
  created_at?: string;
}

export interface MedicalRecord {
  id: string;
  child_id: string;
  allergies?: string;
  medications?: string;
  special_instructions?: string;
  emergency_action_plan?: string;
  created_at?: string;
}

export interface IncidentReport {
  id: string;
  child_id: string;
  service_id: string;
  date: string;
  description: string;
  action_taken?: string;
  reported_by: string;
  severity_level: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at?: string;
}

export interface TitheRecord {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'MoMo' | 'Cheque';
  service_type?: string;
  recorded_by: string;
  notes?: string;
  created_at?: string;
  members?: Member;
}
