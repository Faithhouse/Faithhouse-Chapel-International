import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppState {
  // Global history or navigation assist tracker
  navigationHistory: string[];
  
  // Dashboard view state
  dashboardState: {
    dateRange: string;
    branchFilter: string;
    scrollPosition: number;
  };

  // Members view state (search, filter, scroll, pagination, active section, drafts)
  membersState: {
    searchTerm: string;
    statusFilter: string;
    branchFilter: string;
    genderFilter: string;
    roleFilter: string;
    page: number;
    scrollPosition: number;
    openTab: string;
    formDraft: any | null;
    selectedIds: string[];
  };

  // Attendance view state
  attendanceState: {
    searchTerm: string;
    serviceFilter: string;
    branchFilter: string;
    dateFilter: string;
    openTab: string;
    page: number;
    scrollPosition: number;
  };

  // Finance view state
  financeState: {
    searchTerm: string;
    typeFilter: string;
    branchFilter: string;
    dateFilter: string;
    openTab: string;
    page: number;
    scrollPosition: number;
    titheDraft: any | null;
    incomeDraft: any | null;
    expenseDraft: any | null;
  };

  // Leadership view state
  leadershipState: {
    searchTerm: string;
    roleFilter: string;
    openTab: string;
    scrollPosition: number;
  };

  // Facility management view state
  facilityState: {
    searchTerm: string;
    statusFilter: string;
    openTab: string;
    scrollPosition: number;
    bookingDraft: any | null;
    maintenanceDraft: any | null;
    inventoryDraft: any | null;
  };

  // Ministries view state
  ministriesState: {
    searchTerm: string;
    categoryFilter: string;
    openTab: string;
    scrollPosition: number;
  };

  // Visitation state
  visitationState: {
    searchTerm: string;
    statusFilter: string;
    priorityFilter: string;
    openTab: string;
    scrollPosition: number;
  };

  // WhatsApp helper state
  whatsappState: {
    searchTerm: string;
    statusFilter: string;
    openTab: string;
    scrollPosition: number;
  };

  // Setters
  setDashboardState: (state: Partial<AppState['dashboardState']>) => void;
  setMembersState: (state: Partial<AppState['membersState']>) => void;
  setAttendanceState: (state: Partial<AppState['attendanceState']>) => void;
  setFinanceState: (state: Partial<AppState['financeState']>) => void;
  setLeadershipState: (state: Partial<AppState['leadershipState']>) => void;
  setFacilityState: (state: Partial<AppState['facilityState']>) => void;
  setMinistriesState: (state: Partial<AppState['ministriesState']>) => void;
  setVisitationState: (state: Partial<AppState['visitationState']>) => void;
  setWhatsappState: (state: Partial<AppState['whatsappState']>) => void;
  
  resetAll: () => void;
}

const initialDashboardState = {
  dateRange: 'This Month',
  branchFilter: 'All',
  scrollPosition: 0,
};

const initialMembersState = {
  searchTerm: '',
  statusFilter: 'All',
  branchFilter: 'All',
  genderFilter: 'All',
  roleFilter: 'All',
  page: 1,
  scrollPosition: 0,
  openTab: 'Directory',
  formDraft: null,
  selectedIds: [],
};

const initialAttendanceState = {
  searchTerm: '',
  serviceFilter: 'All',
  branchFilter: 'All',
  dateFilter: '',
  openTab: 'Log',
  page: 1,
  scrollPosition: 0,
};

const initialFinanceState = {
  searchTerm: '',
  typeFilter: 'All',
  branchFilter: 'All',
  dateFilter: '',
  openTab: 'Pulpit Ledger',
  page: 1,
  scrollPosition: 0,
  titheDraft: null,
  incomeDraft: null,
  expenseDraft: null,
};

const initialLeadershipState = {
  searchTerm: '',
  roleFilter: 'All',
  openTab: 'Pipeline',
  scrollPosition: 0,
};

const initialFacilityState = {
  searchTerm: '',
  statusFilter: 'All',
  openTab: 'Reservations',
  scrollPosition: 0,
  bookingDraft: null,
  maintenanceDraft: null,
  inventoryDraft: null,
};

const initialMinistriesState = {
  searchTerm: '',
  categoryFilter: 'All',
  openTab: 'Registry',
  scrollPosition: 0,
};

const initialVisitationState = {
  searchTerm: '',
  statusFilter: 'All',
  priorityFilter: 'All',
  openTab: 'Records',
  scrollPosition: 0,
};

const initialWhatsappState = {
  searchTerm: '',
  statusFilter: 'All',
  openTab: 'Schedules',
  scrollPosition: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      navigationHistory: ['Dashboard'],
      dashboardState: initialDashboardState,
      membersState: initialMembersState,
      attendanceState: initialAttendanceState,
      financeState: initialFinanceState,
      leadershipState: initialLeadershipState,
      facilityState: initialFacilityState,
      ministriesState: initialMinistriesState,
      visitationState: initialVisitationState,
      whatsappState: initialWhatsappState,

      setDashboardState: (state) =>
        set((prev) => ({ dashboardState: { ...prev.dashboardState, ...state } })),
      setMembersState: (state) =>
        set((prev) => ({ membersState: { ...prev.membersState, ...state } })),
      setAttendanceState: (state) =>
        set((prev) => ({ attendanceState: { ...prev.attendanceState, ...state } })),
      setFinanceState: (state) =>
        set((prev) => ({ financeState: { ...prev.financeState, ...state } })),
      setLeadershipState: (state) =>
        set((prev) => ({ leadershipState: { ...prev.leadershipState, ...state } })),
      setFacilityState: (state) =>
        set((prev) => ({ facilityState: { ...prev.facilityState, ...state } })),
      setMinistriesState: (state) =>
        set((prev) => ({ ministriesState: { ...prev.ministriesState, ...state } })),
      setVisitationState: (state) =>
        set((prev) => ({ visitationState: { ...prev.visitationState, ...state } })),
      setWhatsappState: (state) =>
        set((prev) => ({ whatsappState: { ...prev.whatsappState, ...state } })),

      resetAll: () =>
        set(() => ({
          dashboardState: initialDashboardState,
          membersState: initialMembersState,
          attendanceState: initialAttendanceState,
          financeState: initialFinanceState,
          leadershipState: initialLeadershipState,
          facilityState: initialFacilityState,
          ministriesState: initialMinistriesState,
          visitationState: initialVisitationState,
          whatsappState: initialWhatsappState,
        })),
    }),
    {
      name: 'faithhouse_cms_app_store',
    }
  )
);
