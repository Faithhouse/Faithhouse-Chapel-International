
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import AttendanceView from './views/AttendanceView';
import EventsView from './views/EventsView';
import FinanceView from './views/FinanceView';
import MinistersView from './views/MinistersView';
import BranchesView from './views/BranchesView';
import MinistriesView from './views/MinistriesView';
import LeadershipView from './views/LeadershipView';
import VisitationView from './views/VisitationView';
import SettingsView from './views/SettingsView';
import AdminUsersView from './views/AdminUsersView';
import MinistryModuleView from './views/MinistryModuleView';
import WhatsAppSchedulerView from './views/WhatsAppSchedulerView';
import MemberProfileView from './views/MemberProfileView';
import PlaceholderView from './views/PlaceholderView';
import Auth from './components/Auth';
import RecurringTasksView from './views/RecurringTasksView';
import { NavItem, UserProfile } from './types';
import { canAccess } from './src/utils/permissions';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [activeItem, setActiveItem] = useState<NavItem | string>('Dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for simulated session first
    const simulatedUserId = localStorage.getItem('fci_simulated_user_id');
    if (simulatedUserId) {
      fetchProfile(simulatedUserId);
      return;
    }

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (!localStorage.getItem('fci_simulated_user_id')) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          // If it's a simulated ID, we can't auto-repair via Supabase Auth
          if (userId.startsWith('github_')) {
            setLoading(false);
            return;
          }

          console.warn("Profile missing for active session. Attempting auto-repair...");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: newProfile, error: createError } = await supabase.from('profiles').upsert([
              {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name || 'New',
                last_name: user.user_metadata?.last_name || 'User',
                role: 'General Admin'
              }
            ]).select().single();
            
            if (!createError && newProfile) {
              setProfile(newProfile);
              return;
            }
          }
        }
        throw error;
      }
      
      // If successful, persist if it's a simulated ID
      if (userId.startsWith('github_')) {
        localStorage.setItem('fci_simulated_user_id', userId);
      }
      
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    localStorage.removeItem('fci_simulated_user_id');
    await supabase.auth.signOut();
    setProfile(null);
    setLoading(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border border-white/5 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border border-blue-500/20 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-white font-light uppercase tracking-[0.8em] text-[10px]">Synchronizing Vault</p>
          <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest">Establishing Secure Handshake</p>
        </div>
        
        <button 
          onClick={() => setLoading(false)}
          className="mt-20 px-8 py-3 border border-white/5 rounded-full text-[9px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/60 hover:border-white/10 transition-all"
        >
          Bypass Security
        </button>
      </div>
    );
  }

  if (!profile) {
    return <Auth onAuthSuccess={(userId) => fetchProfile(userId)} />;
  }

  const renderContent = () => {
    const role = profile?.role;

    try {
      switch (activeItem) {
        case 'Dashboard':
          return <DashboardView userProfile={profile} setActiveItem={setActiveItem as any} />;
        
        case 'Members':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <MembersView userProfile={profile} onSelectMember={(id) => { setSelectedMemberId(id); setActiveItem('Member Profile'); }} />;
        
        case 'Member Profile':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <MemberProfileView memberId={selectedMemberId || ''} userProfile={profile} onBack={() => setActiveItem('Members')} />;
        
        case 'Attendance':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <AttendanceView userProfile={profile} />;
        
        case 'Upcoming Events':
          return <EventsView userProfile={profile} />;
        
        case 'Finance':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return <FinanceView userProfile={profile} />;
        
        case 'Ministers & Pastors':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return <MinistersView userProfile={profile} />;
        
        case 'Branches':
          if (!canAccess(role, 'LEVEL_1')) return <SecurityDenied module={activeItem} />;
          return <BranchesView userProfile={profile} />;
        
        case 'Church Leadership':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <LeadershipView userProfile={profile} />;
        
        case 'Ministries':
          return <MinistriesView userProfile={profile} setActiveItem={setActiveItem as any} />;
        
        case 'Visitation & Follow-up':
          if (!['System Administrator', 'Head Pastor', 'Follow-up & Visitation', 'Evangelism Ministry', 'General Office'].includes(role || '')) {
            return <SecurityDenied module={activeItem} />;
          }
          return <VisitationView userProfile={profile} />;
        
        case 'WhatsApp Hub':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return <WhatsAppSchedulerView userProfile={profile} />;

        case 'Recurring Tasks':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <RecurringTasksView userProfile={profile} />;

        case 'Admin Users':
        case 'Settings':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return activeItem === 'Settings' ? <SettingsView userProfile={profile} /> : <AdminUsersView userProfile={profile} />;

        // Dynamic Ministry Modules
        case 'Media Ministry':
        case 'Music Ministry':
        case 'Ushering Ministry':
        case 'Prayer Ministry':
        case 'Evangelism':
        case 'Children Ministry':
          return <MinistryModuleView ministryName={activeItem} userProfile={profile} />;

        default:
          return <PlaceholderView title={activeItem} />;
      }
    } catch (err) {
      console.error("Render Error:", err);
      return <div className="p-20 text-center bg-white rounded-3xl shadow-xl border border-rose-100">
        <h2 className="text-2xl font-black text-rose-600 uppercase">Module Crash</h2>
        <p className="text-slate-500 mt-4">An unexpected error occurred while rendering the <b>{activeItem}</b> module.</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs">Reload System</button>
      </div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Sidebar 
        activeItem={activeItem} 
        setActiveItem={(item) => {
          setActiveItem(item);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        userProfile={profile}
        handleLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300">
        <Header toggleSidebar={toggleSidebar} userProfile={profile} />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

const SecurityDenied = ({ module }: { module: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in zoom-in-95 duration-500">
    <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-xl border border-rose-100">
       <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    </div>
    <div className="space-y-3">
      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Access Restricted</h2>
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">Security Clearance Required</p>
      <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed pt-4">
        The <b>[{module}]</b> module contains sensitive organizational data. Your current departmental role does not have authorization to view this ledger.
      </p>
    </div>
    <button onClick={() => window.location.reload()} className="px-10 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Re-Verify Identity</button>
  </div>
);

export default App;
