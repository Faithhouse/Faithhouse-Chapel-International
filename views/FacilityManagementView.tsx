import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Building2, Calendar, Wrench, Boxes, Database, Plus, Search, 
  Trash2, Edit3, AlertTriangle, CheckCircle, Clock, DollarSign, 
  Filter, ArrowRight, ChevronRight, Info, MapPin, User, Copy, X
} from 'lucide-react';
import { toast } from 'sonner';

// Interfaces based on designed tables
export interface Facility {
  id: string;
  name: string;
  capacity: number;
  location: string;
  description: string;
  status: 'Available' | 'Booked' | 'Maintenance' | 'Inactive';
  created_at?: string;
}

export interface FacilityBooking {
  id: string;
  facility_id: string;
  event_name: string;
  booked_by: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'Pending' | 'Approved' | 'Cancelled';
  created_at?: string;
  facility_name?: string; // hydrated
}

export interface FacilityMaintenance {
  id: string;
  facility_id: string;
  issue_title: string;
  description: string;
  category: 'Electrical' | 'Plumbing' | 'Cleaning' | 'AV/Sound' | 'Structural' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed';
  reported_by: string;
  assigned_to: string;
  cost: number;
  resolved_date?: string;
  created_at?: string;
  facility_name?: string; // hydrated
}

export interface FacilityAsset {
  id: string;
  facility_id: string;
  item_name: string;
  serial_number: string;
  quantity: number;
  status: 'Operational' | 'Damaged' | 'In Repair' | 'Missing';
  purchased_date: string;
  cost: number;
  created_at?: string;
  facility_name?: string; // hydrated
}

const DEFAULT_FACILITIES: Facility[] = [
  { id: 'f1', name: 'Main Sanctuary (Wonders Cathedral)', capacity: 2500, location: 'The Wonders Cathedral, Main Ground', description: 'Main congregation venue with standard acoustic walls and digital media desk.', status: 'Available' },
  { id: 'f2', name: 'Grace Fellowship Chapel', capacity: 350, location: 'East Wing - Level 1', description: 'Medium multi-purpose hall for prayer sessions, weddings, and weekday services.', status: 'Available' },
  { id: 'f3', name: 'Executive Leadership Boardroom', capacity: 35, location: 'Office Tower - Level 3', description: 'Private meeting room equipped with smart displays and audio-conference links.', status: 'Available' },
  { id: 'f4', name: 'Children’s Ministry Sunday School Blocks', capacity: 150, location: 'Children Wing', description: 'Safe learning space with play areas and visual projector panels.', status: 'Available' },
  { id: 'f5', name: 'Teens & Youth Center Studio', capacity: 200, location: 'North Annex - Ground Level', description: 'Equipped with sound synthesizers, musical gear, and digital recording unit.', status: 'Available' }
];

const DEFAULT_BOOKINGS: FacilityBooking[] = [
  { id: 'b1', facility_id: 'f1', event_name: ' रविवार Prophetic Word Service', booked_by: 'Pastor Mensah', booking_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '12:00', purpose: 'Standard Sunday Holy Spirit Service', status: 'Approved' },
  { id: 'b2', facility_id: 'f2', event_name: 'Mid-week Prayer Vigil & Deliverance', booked_by: 'Deacon Kwesi', booking_date: new Date().toISOString().split('T')[0], start_time: '18:00', end_time: '20:30', purpose: 'Congregation healing & breakthroughs hour', status: 'Approved' },
  { id: 'b3', facility_id: 'f3', event_name: 'Tithe & Audit Financial Review', booked_by: 'General Administrator', booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], start_time: '10:00', end_time: '13:00', purpose: 'Monthly accountability review and projection strategy', status: 'Pending' }
];

const DEFAULT_MAINTENANCE: FacilityMaintenance[] = [
  { id: 'm1', facility_id: 'f1', issue_title: 'Sanctuary AC Unit Leakage', description: 'Left AC panel is dripping water onto the choir seat area. Requires technician assistance.', category: 'Electrical', priority: 'High', status: 'Pending', reported_by: 'Media Officer', assigned_to: 'Acme Technicians', cost: 120 },
  { id: 'm2', facility_id: 'f5', issue_title: 'Lobby Bulb Replacement & Rewiring', description: 'Replace all flicking bulbs inside the Teens main corridor.', category: 'Electrical', priority: 'Low', status: 'Completed', reported_by: 'Teens Coordinator', assigned_to: 'Brother Samuel (AV Volunteer)', cost: 45, resolved_date: new Date().toISOString().split('T')[0] }
];

const DEFAULT_ASSETS: FacilityAsset[] = [
  { id: 'a1', facility_id: 'f1', item_name: 'Yamaha Midas M32 Live Sound Mixer', serial_number: 'YMH-M32-8402X', quantity: 1, status: 'Operational', purchased_date: '2025-01-12', cost: 3500 },
  { id: 'a2', facility_id: 'f1', item_name: 'Epson Pro Laser Projector 9000lm', serial_number: 'EPS-PRJ-7299L', quantity: 2, status: 'Operational', purchased_date: '2525-04-20', cost: 4800 },
  { id: 'a3', facility_id: 'f5', item_name: 'Roland BK-5 Backing Keyboard Synthesizer', serial_number: 'RLD-BK5-00192', quantity: 1, status: 'In Repair', purchased_date: '2025-11-05', cost: 1100 }
];

const FacilityManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Facilities' | 'Bookings' | 'Maintenance' | 'Inventory' | 'Setup'>('Overview');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [maintenance, setMaintenance] = useState<FacilityMaintenance[]>([]);
  const [assets, setAssets] = useState<FacilityAsset[]>([]);
  
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  const [isDbChecking, setIsDbChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState('All');

  // Modal Open states
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Form states
  const [facilityForm, setFacilityForm] = useState({
    id: '', name: '', capacity: 100, location: '', description: '', status: 'Available' as Facility['status']
  });

  const [bookingForm, setBookingForm] = useState({
    id: '', facility_id: '', event_name: '', booked_by: '', booking_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', purpose: '', status: 'Pending' as FacilityBooking['status']
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    id: '', facility_id: '', issue_title: '', description: '', category: 'Electrical' as FacilityMaintenance['category'], priority: 'Medium' as FacilityMaintenance['priority'], status: 'Pending' as FacilityMaintenance['status'], reported_by: '', assigned_to: '', cost: 0
  });

  const [assetForm, setAssetForm] = useState({
    id: '', facility_id: '', item_name: '', serial_number: '', quantity: 1, status: 'Operational' as FacilityAsset['status'], purchased_date: new Date().toISOString().split('T')[0], cost: 0
  });

  // Check database capability on mount
  useEffect(() => {
    checkDatabaseAvailability();
  }, []);

  const checkDatabaseAvailability = async () => {
    setIsDbChecking(true);
    try {
      // Query one entry from key table to check schema validity
      const { error } = await supabase.from('facilities').select('id').limit(1);
      if (error) {
        console.warn('Supabase facilities table does not exist yet. Relying on localStorage offline mode.', error.message);
        loadLocalData();
        setIsUsingSupabase(false);
      } else {
        setIsUsingSupabase(true);
        fetchSupabaseData();
      }
    } catch (err) {
      console.error('Error verifying database schema, defaulting to offline local storage.', err);
      loadLocalData();
      setIsUsingSupabase(false);
    } finally {
      setIsDbChecking(false);
    }
  };

  const loadLocalData = () => {
    const localFac = localStorage.getItem('fh_facilities');
    const localBk = localStorage.getItem('fh_bookings');
    const localMnt = localStorage.getItem('fh_maintenance');
    const localAst = localStorage.getItem('fh_assets');

    if (localFac) setFacilities(JSON.parse(localFac));
    else {
      setFacilities(DEFAULT_FACILITIES);
      localStorage.setItem('fh_facilities', JSON.stringify(DEFAULT_FACILITIES));
    }

    if (localBk) setBookings(JSON.parse(localBk));
    else {
      setBookings(DEFAULT_BOOKINGS);
      localStorage.setItem('fh_bookings', JSON.stringify(DEFAULT_BOOKINGS));
    }

    if (localMnt) setMaintenance(JSON.parse(localMnt));
    else {
      setMaintenance(DEFAULT_MAINTENANCE);
      localStorage.setItem('fh_maintenance', JSON.stringify(DEFAULT_MAINTENANCE));
    }

    if (localAst) setAssets(JSON.parse(localAst));
    else {
      setAssets(DEFAULT_ASSETS);
      localStorage.setItem('fh_assets', JSON.stringify(DEFAULT_ASSETS));
    }
  };

  const saveLocalData = (type: 'fac' | 'bk' | 'mnt' | 'ast', data: any[]) => {
    if (type === 'fac') {
      localStorage.setItem('fh_facilities', JSON.stringify(data));
      setFacilities(data);
    }
    if (type === 'bk') {
      localStorage.setItem('fh_bookings', JSON.stringify(data));
      setBookings(data);
    }
    if (type === 'mnt') {
      localStorage.setItem('fh_maintenance', JSON.stringify(data));
      setMaintenance(data);
    }
    if (type === 'ast') {
      localStorage.setItem('fh_assets', JSON.stringify(data));
      setAssets(data);
    }
  };

  const fetchSupabaseData = async () => {
    try {
      const { data: facs, error: fError } = await supabase.from('facilities').select('*').order('name');
      const { data: bks, error: bError } = await supabase.from('facility_bookings').select('*').order('booking_date', { ascending: false });
      const { data: mnts, error: mError } = await supabase.from('facility_maintenance').select('*').order('created_at', { ascending: false });
      const { data: asts, error: aError } = await supabase.from('facility_inventory').select('*').order('item_name');

      if (fError || bError || mError || aError) {
        throw new Error('Some Supabase queries failed. Defaulting to local storage.');
      }

      setFacilities(facs || []);
      setBookings(bks || []);
      setMaintenance(mnts || []);
      setAssets(asts || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching Supabase data, resorting to local storage');
      loadLocalData();
      setIsUsingSupabase(false);
    }
  };

  const handleResetData = () => {
    if (confirm("This will overwrite your localStorage data with default initial models. Proceed?")) {
      localStorage.removeItem('fh_facilities');
      localStorage.removeItem('fh_bookings');
      localStorage.removeItem('fh_maintenance');
      localStorage.removeItem('fh_assets');
      loadLocalData();
      toast.success("All Facility management states reverted to design defaults!");
    }
  };

  // Facility Actions (CRUD)
  const saveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityForm.name.trim()) return toast.error("Venue name cannot be left blank");

    setIsSubmitting(true);
    try {
      const isEdit = !!facilityForm.id;
      const targetId = facilityForm.id || 'f_' + Date.now();
      const payload: Facility = {
        id: targetId,
        name: facilityForm.name,
        capacity: Number(facilityForm.capacity) || 0,
        location: facilityForm.location,
        description: facilityForm.description,
        status: facilityForm.status
      };

      if (isUsingSupabase) {
        if (isEdit) {
          const { error } = await supabase.from('facilities').update(payload).eq('id', targetId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('facilities').insert([payload]);
          if (error) throw error;
        }
        await fetchSupabaseData();
      } else {
        const updatedList = isEdit 
          ? facilities.map(f => f.id === targetId ? payload : f)
          : [...facilities, payload];
        saveLocalData('fac', updatedList);
      }

      setIsFacilityModalOpen(false);
      setFacilityForm({ id: '', name: '', capacity: 100, location: '', description: '', status: 'Available' });
      toast.success(isEdit ? "Venue information updated successfully!" : "New Venue successfully provisioned!");
    } catch (err: any) {
      toast.error(err.message || "Could not save venue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteFacility = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to remove the venue: "${name}"? All linked bookings, assets, and logs will be orphaned.`)) return;
    
    try {
      if (isUsingSupabase) {
        const { error } = await supabase.from('facilities').delete().eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = facilities.filter(f => f.id !== id);
        saveLocalData('fac', updatedList);
        // Cascades in local storage
        saveLocalData('bk', bookings.filter(b => b.facility_id !== id));
        saveLocalData('mnt', maintenance.filter(m => m.facility_id !== id));
        saveLocalData('ast', assets.filter(a => a.facility_id !== id));
      }
      toast.success(`Success! Venue "${name}" has been permanently purged.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete venue");
    }
  };

  // Booking Actions
  const checkConflictingBookings = (facilityId: string, date: string, start: string, end: string, idToIgnore?: string) => {
    // Basic overlapping check
    return bookings.some(b => {
      if (idToIgnore && b.id === idToIgnore) return false;
      if (b.status === 'Cancelled') return false;
      if (b.facility_id !== facilityId) return false;
      if (b.booking_date !== date) return false;

      // Check overlap: (StartA < EndB) AND (EndA > StartB)
      const parseMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const startA = parseMinutes(start);
      const endA = parseMinutes(end);
      const startB = parseMinutes(b.start_time);
      const endB = parseMinutes(b.end_time);

      return startA < endB && endA > startB;
    });
  };

  const saveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const { facility_id, event_name, booked_by, booking_date, start_time, end_time, purpose } = bookingForm;
    if (!facility_id) return toast.error("Please determine which facility is being reserved.");
    if (!event_name.trim()) return toast.error("Provide a name/title for the service allocation.");
    if (!start_time || !end_time) return toast.error("Define start and end times.");
    if (start_time >= end_time) return toast.error("Service start time cannot be at or after the departure end time.");

    // Conflict detection
    const isEdit = !!bookingForm.id;
    const hasConflict = checkConflictingBookings(facility_id, booking_date, start_time, end_time, bookingForm.id);
    if (hasConflict) {
      return toast.error("Double-booking clash! The requested venue is already reserved during those exact hours. Please select another time window.");
    }

    setIsSubmitting(true);
    try {
      const targetId = bookingForm.id || 'b_' + Date.now();
      const payload: FacilityBooking = {
        id: targetId,
        facility_id,
        event_name,
        booked_by,
        booking_date,
        start_time,
        end_time,
        purpose,
        status: bookingForm.status
      };

      if (isUsingSupabase) {
        if (isEdit) {
          const { error } = await supabase.from('facility_bookings').update(payload).eq('id', targetId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('facility_bookings').insert([payload]);
          if (error) throw error;
        }
        await fetchSupabaseData();
      } else {
        const updatedList = isEdit 
          ? bookings.map(b => b.id === targetId ? payload : b)
          : [...bookings, payload];
        saveLocalData('bk', updatedList);
      }

      setIsBookingModalOpen(false);
      setBookingForm({ id: '', facility_id: '', event_name: '', booked_by: '', booking_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', purpose: '', status: 'Pending' });
      toast.success(isEdit ? "Booking reservation altered successfully!" : "Facility booking successfully created & queued!");
    } catch (err: any) {
      toast.error(err.message || "Failed to register booking entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBookingStatus = async (id: string, state: FacilityBooking['status']) => {
    try {
      if (isUsingSupabase) {
        const { error } = await supabase.from('facility_bookings').update({ status: state }).eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = bookings.map(b => b.id === id ? { ...b, status: state } : b);
        saveLocalData('bk', updatedList);
      }
      toast.info(`Booking updated to [${state}] status!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update booking status");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to discard this booking completely?")) return;
    try {
      if (isUsingSupabase) {
        const { error } = await supabase.from('facility_bookings').delete().eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = bookings.filter(b => b.id !== id);
        saveLocalData('bk', updatedList);
      }
      toast.success("Reservation permanently dismissed!");
    } catch (err: any) {
      toast.error(err.message || "Could not delete");
    }
  };


  // Maintenance Actions
  const saveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const { facility_id, issue_title, description, category, priority, reported_by, assigned_to, cost } = maintenanceForm;
    
    if (!facility_id) return toast.error("Identify which venue requires maintenance.");
    if (!issue_title.trim()) return toast.error("Provide a brief title outlining the core structural/AV damage.");
    
    setIsSubmitting(true);
    try {
      const isEdit = !!maintenanceForm.id;
      const targetId = maintenanceForm.id || 'm_' + Date.now();
      const payload: FacilityMaintenance = {
        id: targetId,
        facility_id,
        issue_title,
        description,
        category,
        priority,
        status: maintenanceForm.status,
        reported_by,
        assigned_to,
        cost: Number(cost) || 0,
        resolved_date: maintenanceForm.status === 'Completed' ? new Date().toISOString().split('T')[0] : undefined
      };

      if (isUsingSupabase) {
        if (isEdit) {
          const { error } = await supabase.from('facility_maintenance').update(payload).eq('id', targetId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('facility_maintenance').insert([payload]);
          if (error) throw error;
        }
        await fetchSupabaseData();
      } else {
        const updatedList = isEdit 
          ? maintenance.map(m => m.id === targetId ? payload : m)
          : [...maintenance, payload];
        saveLocalData('mnt', updatedList);
      }

      setIsMaintenanceModalOpen(false);
      setMaintenanceForm({ id: '', facility_id: '', issue_title: '', description: '', category: 'Electrical', priority: 'Medium', status: 'Pending', reported_by: '', assigned_to: '', cost: 0 });
      toast.success(isEdit ? "Report modified!" : "Maintenance alert launched at Facility desk!");
    } catch (err: any) {
      toast.error(err.message || "Failed to log maintenance request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMaintenanceStatus = async (id: string, step: FacilityMaintenance['status']) => {
    try {
      const resolvedDate = step === 'Completed' ? new Date().toISOString().split('T')[0] : null;
      if (isUsingSupabase) {
        const { error } = await supabase.from('facility_maintenance').update({ status: step, resolved_date: resolvedDate || undefined }).eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = maintenance.map(m => m.id === id ? { ...m, status: step, resolved_date: resolvedDate || undefined } : m);
        saveLocalData('mnt', updatedList);
      }
      toast.success(`Issue updated to [${step}]!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to change state");
    }
  };

  const deleteMaintenance = async (id: string) => {
    if (!confirm("Remove this log permanently?")) return;
    try {
      if (isUsingSupabase) {
        const { error } = await supabase.from('facility_maintenance').delete().eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = maintenance.filter(m => m.id !== id);
        saveLocalData('mnt', updatedList);
      }
      toast.success("Maintenance entry discarded!");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  // Asset Actions
  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { facility_id, item_name, serial_number, quantity, status, purchased_date, cost } = assetForm;
    if (!facility_id) return toast.error("Please specify which room holds this asset.");
    if (!item_name.trim()) return toast.error("Asset name is mandatory!");

    setIsSubmitting(true);
    try {
      const isEdit = !!assetForm.id;
      const targetId = assetForm.id || 'a_' + Date.now();
      const payload: FacilityAsset = {
        id: targetId,
        facility_id,
        item_name,
        serial_number,
        quantity: Number(quantity) || 1,
        status,
        purchased_date,
        cost: Number(cost) || 0
      };

      if (isUsingSupabase) {
        if (isEdit) {
          const { error } = await supabase.from('facility_inventory').update(payload).eq('id', targetId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('facility_inventory').insert([payload]);
          if (error) throw error;
        }
        await fetchSupabaseData();
      } else {
        const updatedList = isEdit 
          ? assets.map(a => a.id === targetId ? payload : a)
          : [...assets, payload];
        saveLocalData('ast', updatedList);
      }

      setIsAssetModalOpen(false);
      setAssetForm({ id: '', facility_id: '', item_name: '', serial_number: '', quantity: 1, status: 'Operational', purchased_date: new Date().toISOString().split('T')[0], cost: 0 });
      toast.success(isEdit ? "Asset registered details modified!" : "Asset fully checked into room registry!");
    } catch (err: any) {
      toast.error(err.message || "Failed to register asset info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Are you sure this asset should be discarded from inventory?")) return;
    try {
      if (isUsingSupabase) {
        const { error } = await supabase.from('facility_inventory').delete().eq('id', id);
        if (error) throw error;
        await fetchSupabaseData();
      } else {
        const updatedList = assets.filter(a => a.id !== id);
        saveLocalData('ast', updatedList);
      }
      toast.success("Asset decommissioned!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };


  // Hydration utility helpers
  const getFacilityName = (facilityId: string) => {
    const f = facilities.find(fac => fac.id === facilityId);
    return f ? f.name : 'Unknown Room';
  };

  // KPI Calculations
  const getKpis = () => {
    const totalFacilities = facilities.length;
    const todayDate = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.booking_date === todayDate && b.status === 'Approved').length;
    const activeMaintenance = maintenance.filter(m => m.status !== 'Completed').length;
    const totalCapitalValue = assets.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0);
    
    return {
      totalFacilities,
      todayBookings,
      activeMaintenance,
      totalCapitalValue
    };
  };

  const kpis = getKpis();

  // Filter lists based on user options
  const filteredFacilitiesList = facilities.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     f.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' ? true : f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBookingsList = bookings.filter(b => {
    const fName = getFacilityName(b.facility_id);
    const matchSearch = b.event_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.booked_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        fName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFac = selectedFacilityFilter === 'All' ? true : b.facility_id === selectedFacilityFilter;
    const matchStatus = statusFilter === 'All' ? true : b.status === statusFilter;
    return matchSearch && matchFac && matchStatus;
  });

  const filteredMaintenanceList = maintenance.filter(m => {
    const fName = getFacilityName(m.facility_id);
    const matchSearch = m.issue_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        m.reported_by.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        fName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFac = selectedFacilityFilter === 'All' ? true : m.facility_id === selectedFacilityFilter;
    const matchStatus = statusFilter === 'All' ? true : m.status === statusFilter;
    return matchSearch && matchFac && matchStatus;
  });

  const filteredAssetsList = assets.filter(a => {
    const fName = getFacilityName(a.facility_id);
    const matchSearch = a.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        fName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFac = selectedFacilityFilter === 'All' ? true : a.facility_id === selectedFacilityFilter;
    const matchStatus = statusFilter === 'All' ? true : a.status === statusFilter;
    return matchSearch && matchFac && matchStatus;
  });

  // Copy SQL script tool
  const sqlSetupScript = `-- MASTER SCHEMATIC FOR FAITHHOUSE FACILITY RESERVATIONS & INTEL DESK v1.2
-- Create facilities room database
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 100,
  location TEXT,
  description TEXT,
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Booked', 'Maintenance', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create facility reservations tables
CREATE TABLE IF NOT EXISTS public.facility_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  booked_by TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create maintenance / technical alerts database
CREATE TABLE IF NOT EXISTS public.facility_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  issue_title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Electrical', 'Plumbing', 'Cleaning', 'AV/Sound', 'Structural', 'Other')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  reported_by TEXT,
  assigned_to TEXT,
  cost NUMERIC DEFAULT 0,
  resolved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create high-value asset registry tables
CREATE TABLE IF NOT EXISTS public.facility_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Operational' CHECK (status IN ('Operational', 'Damaged', 'In Repair', 'Missing')),
  purchased_date DATE,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for all newly deployed tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_inventory ENABLE ROW LEVEL SECURITY;

-- Allow general read and modify privileges (Self-admin compliant)
DROP POLICY IF EXISTS "Allow all on facilities" ON public.facilities;
CREATE POLICY "Allow all on facilities" ON public.facilities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on bookings" ON public.facility_bookings;
CREATE POLICY "Allow all on bookings" ON public.facility_bookings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on maintenance" ON public.facility_maintenance;
CREATE POLICY "Allow all on maintenance" ON public.facility_maintenance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on inventory" ON public.facility_inventory;
CREATE POLICY "Allow all on inventory" ON public.facility_inventory FOR ALL USING (true) WITH CHECK (true);

-- Inject base seed data for seamless system initialization
INSERT INTO public.facilities (name, capacity, location, description, status) VALUES 
('Main Sanctuary (Wonders Cathedral)', 2500, 'The Wonders Cathedral, Main Ground', 'Main congregation venue with standard acoustic walls and digital media desk.', 'Available'),
('Grace Fellowship Chapel', 350, 'East Wing - Level 1', 'Medium multi-purpose hall for prayer sessions, weddings, and weekday services.', 'Available'),
('Executive Leadership Boardroom', 35, 'Office Tower - Level 3', 'Private meeting room equipped with smart displays and audio-conference links.', 'Available'),
('Children’s Ministry Sunday School Blocks', 150, 'Children Wing', 'Safe learning space with play areas and visual projector panels.', 'Available')
ON CONFLICT DO NOTHING;`;

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-550 pb-20">
      
      {/* Dynamic Connection/Storage Banner */}
      {!isDbChecking && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xs border text-xs font-black uppercase tracking-wider ${
          isUsingSupabase 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full animate-pulse ${isUsingSupabase ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>
              {isUsingSupabase 
                ? "Vault Integration Connected: Database operations logged directly to Supabase servers."
                : "Relying on Local Fallback State: All entries are persisted directly on your web browser cache."}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('Setup')} 
            className={`px-4 py-2 border rounded-xl text-[9px] uppercase tracking-widest transition-all ${
              isUsingSupabase 
                ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300' 
                : 'bg-amber-100 hover:bg-amber-200 border-amber-300'
            }`}
          >
            Database Settings &rarr;
          </button>
        </div>
      )}

      {/* Main Header Desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1 animate-in slide-in-from-left duration-300">
          <h2 className="text-2xl md:text-4xl font-black text-fh-green tracking-tighter uppercase leading-none">Facility Desk & Logistics</h2>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Campus Oversight, Venues & Equipment Registry</p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'Facilities' && (
            <button 
              onClick={() => {
                setFacilityForm({ id: '', name: '', capacity: 100, location: '', description: '', status: 'Available' });
                setIsFacilityModalOpen(true);
              }}
              className="px-6 md:px-8 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all"
            >
              + Launch Venue
            </button>
          )}
          {activeTab === 'Bookings' && (
            <button 
              onClick={() => {
                setBookingForm({ id: '', facility_id: '', event_name: '', booked_by: '', booking_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', purpose: '', status: 'Pending' });
                setIsBookingModalOpen(true);
              }}
              className="px-6 md:px-8 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all"
            >
              + Place Reservation
            </button>
          )}
          {activeTab === 'Maintenance' && (
            <button 
              onClick={() => {
                setMaintenanceForm({ id: '', facility_id: '', issue_title: '', description: '', category: 'Electrical', priority: 'Medium', status: 'Pending', reported_by: '', assigned_to: '', cost: 0 });
                setIsMaintenanceModalOpen(true);
              }}
              className="px-6 md:px-8 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-rose-700 transition-all border-b-2 border-black/20"
            >
              + Alert Maintenance
            </button>
          )}
          {activeTab === 'Inventory' && (
            <button 
              onClick={() => {
                setAssetForm({ id: '', facility_id: '', item_name: '', serial_number: '', quantity: 1, status: 'Operational', purchased_date: new Date().toISOString().split('T')[0], cost: 0 });
                setIsAssetModalOpen(true);
              }}
              className="px-6 md:px-8 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all"
            >
              + Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Navigational Tabs bar */}
      <div className="bg-white p-2 border border-slate-200/60 rounded-[2rem] shadow-xs inline-flex overflow-x-auto w-full md:w-auto gap-1">
        {[
          { id: 'Overview', label: 'Overview Desk', icon: Building2 },
          { id: 'Facilities', label: 'Venues & Halls', icon: MapPin },
          { id: 'Bookings', label: 'Reservations', icon: Calendar },
          { id: 'Maintenance', label: 'Maintenance Unit', icon: Wrench },
          { id: 'Inventory', label: 'AV & Gear', icon: Boxes },
          { id: 'Setup', label: 'Server Setup', icon: Database }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
                setStatusFilter('All');
                setSelectedFacilityFilter('All');
              }}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                isSelected 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-955 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW DESK */}
      {activeTab === 'Overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Venues</p>
                <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">{kpis.totalFacilities}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Booked Today</p>
                <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">{kpis.todayBookings}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Open Repairs</p>
                <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">{kpis.activeMaintenance}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-fh-gold/10 text-fh-gold flex items-center justify-center font-black">
                <Boxes className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">AV Assets Value</p>
                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">
                  ${kpis.totalCapitalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Today's Schedule feed */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">Today's Aligned Bookings</h3>
                <span className="px-4 py-1.5 bg-slate-50 border border-slate-150 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Live Feed
                </span>
              </div>

              {bookings.filter(b => b.booking_date === new Date().toISOString().split('T')[0]).length > 0 ? (
                <div className="space-y-4">
                  {bookings.filter(b => b.booking_date === new Date().toISOString().split('T')[0]).map(bk => (
                    <div key={bk.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-[8px] font-black uppercase tracking-widest">
                          {getFacilityName(bk.facility_id)}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight mt-1">{bk.event_name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Reserved by {bk.booked_by}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[11px] font-black text-slate-700 flex items-center justify-end gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {bk.start_time} - {bk.end_time}
                        </span>
                        <span className={`inline-block px-3 py-1 text-[8px] font-black uppercase rounded-md ${
                          bk.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {bk.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">
                  No events booked or scheduled on the church grounds today.
                </div>
              )}
            </div>

            {/* Critical Maintenance board */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">Critical Hardware & Structural Alerts</h3>
                <span className="px-3.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> Attention Req.
                </span>
              </div>

              {maintenance.filter(m => m.status !== 'Completed').length > 0 ? (
                <div className="space-y-4">
                  {maintenance.filter(m => m.status !== 'Completed').slice(0, 4).map(mnt => (
                    <div key={mnt.id} className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100/50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            mnt.priority === 'Critical' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {mnt.priority} PRIORITY
                          </span>
                          <span className="text-[9px] font-black uppercase text-slate-500">{getFacilityName(mnt.facility_id)}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase mt-1.5">{mnt.issue_title}</h4>
                        <p className="text-[9.5px] text-slate-500 font-bold">{mnt.description}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest">
                          {mnt.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">${mnt.cost} Allocation</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">
                  Excellent! Zero pending hardware repairs or maintenance tickets are open.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VENUES (FACILITIES LIST) */}
      {activeTab === 'Facilities' && (
        <div className="space-y-6">
          {/* Search Table Filters */}
          <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venue name, office location..."
                className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-800 focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto overflow-x-auto h-full items-center">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Venue Status</label>
              {['All', 'Available', 'Booked', 'Maintenance', 'Inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Galleries Cards list of rooms */}
          {filteredFacilitiesList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFacilitiesList.map((room) => (
                <div key={room.id} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        room.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                        room.status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                        room.status === 'Maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-850'
                      }`}>
                        ● {room.status}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Cap. {room.capacity}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight line-clamp-1 mb-2">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate">{room.location}</span>
                    </div>

                    <p className="text-slate-500 text-xs font-semibold leading-relaxed line-clamp-3">
                      {room.description || 'No descriptive technical breakdown was submitted for this building sector.'}
                    </p>
                  </div>

                  <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setFacilityForm(room);
                          setIsFacilityModalOpen(true);
                        }}
                        className="p-2 border border-slate-200 hover:border-slate-400 bg-white rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => deleteFacility(room.id, room.name)}
                        className="p-2 border border-slate-200 hover:border-rose-400 bg-white rounded-xl text-slate-400 hover:text-rose-600 transition-colors shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[9px] font-black uppercase text-fh-green tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-lg">
                      Registered Space
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-250/50">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wide">
                No church facilities match your specified filter guidelines.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BOOKING SCHEDULER */}
      {activeTab === 'Bookings' && (
        <div className="space-y-6">
          {/* Booking search filter panel */}
          <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event title, organizer..."
                className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-800 focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div>
              <select 
                value={selectedFacilityFilter}
                onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white"
              >
                <option value="All">All Facilities / Venues</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              {['All', 'Approved', 'Pending', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    statusFilter === st 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table / List */}
          {filteredBookingsList.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Event Detail</th>
                      <th className="px-6 py-5">Assigned Facility</th>
                      <th className="px-6 py-5 text-center">Reservation Date</th>
                      <th className="px-6 py-5 text-center">Active Hours</th>
                      <th className="px-6 py-5">Organizer</th>
                      <th className="px-6 py-5 text-center font-bold">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-650 font-bold">
                    {filteredBookingsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-slate-900 font-extrabold uppercase tracking-tight">{item.event_name}</p>
                          <p className="text-[9px] text-slate-400 lowercase italic mt-0.5">{item.purpose || 'no purpose description provided'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-[9px] uppercase tracking-wide">
                            {getFacilityName(item.facility_id)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-mono text-slate-500">
                          {new Date(item.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5 text-center font-mono text-slate-700 font-extrabold text-[11px]">
                          {item.start_time} - {item.end_time}
                        </td>
                        <td className="px-6 py-5 uppercase text-[10px] tracking-tight">{item.booked_by}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => updateBookingStatus(item.id, 'Approved')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-[8px] font-black uppercase tracking-widest text-white transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(item.id, 'Cancelled')}
                                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-[8px] font-black uppercase tracking-widest text-white transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setBookingForm(item);
                                setIsBookingModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBooking(item.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-200/50">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wide">
                No building scheduling or reservation records match criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MAINTENANCE DESK */}
      {activeTab === 'Maintenance' && (
        <div className="space-y-6">
          {/* Filters desk */}
          <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search damage or reported issue..."
                className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-800 focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div className="flex gap-4 items-center overflow-x-auto w-full md:w-auto">
              <select 
                value={selectedFacilityFilter}
                onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="All">All Facilities</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="flex gap-1.5 shrink-0">
                {['All', 'Pending', 'In Progress', 'Completed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      statusFilter === st 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance alert log list */}
          {filteredMaintenanceList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMaintenanceList.map((ticket) => (
                <div key={ticket.id} className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                        ticket.priority === 'Critical' ? 'bg-rose-600 text-white animate-pulse' :
                        ticket.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                        ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ticket.priority} Priority
                      </span>

                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        ticket.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{ticket.issue_title}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400 mt-0.5">
                      Venue: {getFacilityName(ticket.facility_id)}
                    </p>

                    <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-3 mb-4">
                      {ticket.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                      <div>
                        <span className="text-[8px] text-slate-400 block tracking-widest font-black">Category</span>
                        {ticket.category}
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block tracking-widest font-black">Financial Cost</span>
                        ${ticket.cost}
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block tracking-widest font-black">Reported By</span>
                        {ticket.reported_by || 'Unknown'}
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block tracking-widest font-black">Assigned To</span>
                        {ticket.assigned_to || 'Pending Technical Assignee'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {ticket.resolved_date ? `Resolved on ${ticket.resolved_date}` : 'Awaiting technical resolution'}
                    </span>

                    <div className="flex gap-2">
                      {ticket.status !== 'Completed' && (
                        <>
                          {ticket.status === 'Pending' && (
                            <button
                              onClick={() => updateMaintenanceStatus(ticket.id, 'In Progress')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => updateMaintenanceStatus(ticket.id, 'Completed')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setMaintenanceForm(ticket);
                          setIsMaintenanceModalOpen(true);
                        }}
                        className="p-1.5 border border-slate-200 hover:border-slate-400 rounded-lg text-slate-500 bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMaintenance(ticket.id)}
                        className="p-1.5 border border-slate-200 hover:border-rose-400 rounded-lg text-slate-400 bg-slate-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-200/50">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wide">
                No maintenance tickets logged found under this filter query.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: INVENTORY & ASSETS */}
      {activeTab === 'Inventory' && (
        <div className="space-y-6">
          {/* Filters board */}
          <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keyboard, microphone, projector..."
                className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-800 focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div className="flex gap-4 items-center">
              <select 
                value={selectedFacilityFilter}
                onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="All">All Facilities</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="flex gap-1.5 shrink-0">
                {['All', 'Operational', 'Damaged', 'In Repair', 'Missing'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      statusFilter === st 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assets Inventory Grid */}
          {filteredAssetsList.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Register Asset Name</th>
                      <th className="px-6 py-5">Serial Identification</th>
                      <th className="px-6 py-5 text-center">Qty</th>
                      <th className="px-6 py-5">Allocated Vault / Venue</th>
                      <th className="px-6 py-5 text-center">Purchase Date</th>
                      <th className="px-6 py-5 text-right">Unit Value</th>
                      <th className="px-6 py-5 text-center font-bold">Equipment Condition</th>
                      <th className="px-8 py-5 text-right">Delete/Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-650 font-bold">
                    {filteredAssetsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-55 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-slate-900 font-extrabold uppercase tracking-tight">{item.item_name}</p>
                        </td>
                        <td className="px-6 py-5 font-mono text-[10px] text-slate-400">{item.serial_number || 'N/A SYSTEM'}</td>
                        <td className="px-6 py-5 text-center font-mono font-extrabold text-[#007bff]">{item.quantity}</td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-slate-50 text-slate-700 rounded-lg text-[9px] uppercase tracking-wide border border-slate-150">
                            {getFacilityName(item.facility_id)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-mono text-slate-400">{item.purchased_date}</td>
                        <td className="px-6 py-5 text-right font-mono text-slate-800">${item.cost.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            item.status === 'Operational' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'In Repair' ? 'bg-amber-100 text-amber-800' : 'bg-rose-105 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => {
                                setAssetForm(item);
                                setIsAssetModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAsset(item.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-200/50">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wide">
                No electronic, sound, or physical assets found inside target chambers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SERVER SETUP & MIGRATION */}
      {activeTab === 'Setup' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">Supabase Relational Database Setup</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Establish true server persistence for facility modules</p>
              </div>
            </div>

            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              To activate cloud storage (enabling shared access for other users, overseers, and coordinators), please execute the SQL script outlined below inside your Supabase SQL Editor. If the tables do not exist yet, the application seamlessly activates an internal fallback storage mechanism locally.
            </p>

            <div className="bg-slate-900 rounded-2xl p-6 text-left relative group">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(sqlSetupScript);
                  toast.success("SQL Schema Script Copied to Clipboard!");
                }}
                className="absolute right-4 top-4 p-3.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
              >
                <Copy className="w-4 h-4" /> Copy SQL
              </button>
              <pre className="text-emerald-400 font-mono text-[9px] overflow-x-auto leading-relaxed max-h-96 pr-20 scrollbar-hide">
                {sqlSetupScript}
              </pre>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Storage Diagnostics State</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Active Connection: {isUsingSupabase ? 'PROD CLOUD (Supabase)' : 'CLIENT MEMORY (Offline localStorage)'}
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={checkDatabaseAvailability}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all border border-slate-200"
                >
                  Verify Server Status
                </button>
                <button 
                  onClick={handleResetData}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all"
                >
                  Reset Local State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 1: ADD/EDIT VENUE */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => !isSubmitting && setIsFacilityModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-fh-green">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{facilityForm.id ? 'Alter Venue Information' : 'Deploy New Church Venue'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Facility Sector Provision Desk</p>
              </div>
              <button onClick={() => setIsFacilityModalOpen(false)} className="p-3 hover:bg-white rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={saveFacility} className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Venue / Room Title</label>
                <input 
                  type="text" 
                  value={facilityForm.name}
                  onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  placeholder="e.g. Grace Fellowship Chapel"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Max Attendance Capacity</label>
                  <input 
                    type="number" 
                    value={facilityForm.capacity}
                    onChange={e => setFacilityForm({ ...facilityForm, capacity: Number(e.target.value) })}
                    placeholder="e.g. 350"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Initial Status</label>
                  <select 
                    value={facilityForm.status}
                    onChange={e => setFacilityForm({ ...facilityForm, status: e.target.value as any })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Sector Location / Levels</label>
                <input 
                  type="text" 
                  value={facilityForm.location}
                  onChange={e => setFacilityForm({ ...facilityForm, location: e.target.value })}
                  placeholder="e.g. East Wing - Level 1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Brief Technical Description</label>
                <textarea 
                  value={facilityForm.description}
                  onChange={e => setFacilityForm({ ...facilityForm, description: e.target.value })}
                  placeholder="Include layout directions or key details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsFacilityModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-250 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-fh-green text-fh-gold rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Deploy Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 2: ADD/EDIT BOOKING */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => !isSubmitting && setIsBookingModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-fh-green">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {bookingForm.id ? 'Alter Reservation details' : 'Deploy Venue Reservation'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Scheduler & Overlap Check Service</p>
              </div>
              <button onClick={() => setIsBookingModalOpen(false)} className="p-3 hover:bg-white rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={saveBooking} className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Select Venue for Reservation</label>
                <select 
                  value={bookingForm.facility_id}
                  onChange={e => setBookingForm({ ...bookingForm, facility_id: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">-- Choose target room --</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (Cap. {f.capacity})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Event Title</label>
                <input 
                  type="text" 
                  value={bookingForm.event_name}
                  onChange={e => setBookingForm({ ...bookingForm, event_name: e.target.value })}
                  placeholder="e.g. Sunday Healing & Deliverance Hour"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Booking Date</label>
                  <input 
                    type="date" 
                    value={bookingForm.booking_date}
                    onChange={e => setBookingForm({ ...bookingForm, booking_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Start Time</label>
                  <input 
                    type="time" 
                    value={bookingForm.start_time}
                    onChange={e => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">End Time</label>
                  <input 
                    type="time" 
                    value={bookingForm.end_time}
                    onChange={e => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Responsibility Officer / Organiser</label>
                <input 
                  type="text" 
                  value={bookingForm.booked_by}
                  onChange={e => setBookingForm({ ...bookingForm, booked_by: e.target.value })}
                  placeholder="e.g. Pastor Mensah K."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Reservation Purpose Overview</label>
                <textarea 
                  value={bookingForm.purpose}
                  onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                  placeholder="Specific setup requirements or session summary..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-250 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-fh-green text-fh-gold rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  {isSubmitting ? 'Processing...' : 'Secure Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: ADD/EDIT MAINTENANCE */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => !isSubmitting && setIsMaintenanceModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-rose-600">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {maintenanceForm.id ? 'Modify Maintenance parameters' : 'Report Damage / Alert Desk'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Technician Operations Unit</p>
              </div>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="p-3 hover:bg-white rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={saveMaintenance} className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Damaged Location Venue</label>
                <select 
                  value={maintenanceForm.facility_id}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, facility_id: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">-- Choose target room --</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Problem Category</label>
                  <select 
                    value={maintenanceForm.category}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, category: e.target.value as any })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="AV/Sound">AV/Sound</option>
                    <option value="Structural">Structural</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Priority Level</label>
                  <select 
                    value={maintenanceForm.priority}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value as any })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Issue / Event Title</label>
                <input 
                  type="text" 
                  value={maintenanceForm.issue_title}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, issue_title: e.target.value })}
                  placeholder="e.g. Central Sound board power block failure"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Description & Notes</label>
                <textarea 
                  value={maintenanceForm.description}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Detail symptoms, required elements, technician comments..."
                  rows={25}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none resize-none h-24"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Assigned Tech Contractor</label>
                  <input 
                    type="text" 
                    value={maintenanceForm.assigned_to}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, assigned_to: e.target.value })}
                    placeholder="e.g. Brother Kwesi G."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cost Budget</label>
                  <input 
                    type="number" 
                    value={maintenanceForm.cost}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: Number(e.target.value) })}
                    placeholder="e.g. 150"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Reported By</label>
                  <input 
                    type="text" 
                    value={maintenanceForm.reported_by}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, reported_by: e.target.value })}
                    placeholder="e.g. Usher captain"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Progress Status</label>
                  <select 
                    value={maintenanceForm.status}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, status: e.target.value as any })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-250 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  {isSubmitting ? 'Saving' : 'Deploy Maintenance Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 4: ADD/EDIT ASSET */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => !isSubmitting && setIsAssetModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[12px] border-fh-green">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {assetForm.id ? 'Modify Electronic Asset info' : 'Register New AV Asset'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Asset Control Desk</p>
              </div>
              <button onClick={() => setIsAssetModalOpen(false)} className="p-3 hover:bg-white rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={saveAsset} className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Select Storage Room / Location Venue</label>
                <select 
                  value={assetForm.facility_id}
                  onChange={e => setAssetForm({ ...assetForm, facility_id: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">-- Choose target room --</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Item Name / Title</label>
                <input 
                  type="text" 
                  value={assetForm.item_name}
                  onChange={e => setAssetForm({ ...assetForm, item_name: e.target.value })}
                  placeholder="e.g. Midas M32 Live Sound Mixer"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Serial / Batch Code</label>
                  <input 
                    type="text" 
                    value={assetForm.serial_number}
                    onChange={e => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    placeholder="e.g. YMH-38D-91"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Quantity Allocation</label>
                  <input 
                    type="number" 
                    value={assetForm.quantity}
                    onChange={e => setAssetForm({ ...assetForm, quantity: Number(e.target.value) })}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Unit Value Cost ($ / GHS)</label>
                  <input 
                    type="number" 
                    value={assetForm.cost}
                    onChange={e => setAssetForm({ ...assetForm, cost: Number(e.target.value) })}
                    placeholder="e.g. 3500"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none animate-in"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Purchased Date</label>
                  <input 
                    type="date" 
                    value={assetForm.purchased_date}
                    onChange={e => setAssetForm({ ...assetForm, purchased_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Physical Condition status</label>
                <select 
                  value={assetForm.status}
                  onChange={e => setAssetForm({ ...assetForm, status: e.target.value as any })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Operational">Operational</option>
                  <option value="Damaged">Damaged</option>
                  <option value="In Repair">In Repair</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-250 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-fh-green text-fh-gold rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  {isSubmitting ? 'Registering...' : 'Log Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default FacilityManagementView;
