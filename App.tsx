
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
import BranchesView from './views/BranchesView';
import MinistriesView from './views/MinistriesView';
import LeadershipView from './views/LeadershipView';
import VisitationView from './views/VisitationView';
import SettingsView from './views/SettingsView';
import AdminUsersView from './views/AdminUsersView';
import MinistryModuleView from './views/MinistryModuleView';
import CellMeetingView from './views/CellMeetingView';
import WhatsAppSchedulerView from './views/WhatsAppSchedulerView';
import MemberProfileView from './views/MemberProfileView';
import ChildrenMinistryView from './views/ChildrenMinistryView';
import TeensMinistryView from './views/TeensMinistryView';
import YouthChildrenDashboardView from './views/YouthChildrenDashboardView';
import FollowUpVisitationView from './views/FollowUpVisitationView';
import FounderView from './views/FounderView';
import PlaceholderView from './views/PlaceholderView';
import Auth from './components/Auth';
import RecurringTasksView from './views/RecurringTasksView';
import DavidChatbot from './components/DavidChatbot';
import { Toaster } from 'sonner';
import { NavItem, UserProfile } from './types';
import { canAccess } from './src/utils/permissions';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [activeItem, setActiveItem] = useState<NavItem | string>('Dashboard');
  const [history, setHistory] = useState<string[]>(['Dashboard']);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [initialEditId, setInitialEditId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const MOCK_PROFILE: UserProfile = {
    id: 'bypass-admin',
    email: 'admin@faithhouse.church',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'System Administrator',
    status: 'Active',
    created_at: new Date().toISOString()
  };

  const handleSetActiveItem = (item: string) => {
    if (item === activeItem) return;
    setHistory(prev => [...prev, item]);
    setActiveItem(item);
  };

  const handleBack = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current
    const previous = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setActiveItem(previous);
  };
  
  useEffect(() => {
    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // BYPASS: Set mock profile if no session
        console.log("Login Bypass Active: Setting mock administrator profile.");
        setProfile(MOCK_PROFILE);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        handleSetActiveItem('Settings');
      }
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // If logged out, we still bypass back to mock for now
        setProfile(MOCK_PROFILE);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          console.warn("Profile missing for active session. Attempting auto-repair...");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: newProfile, error: createError } = await supabase.from('profiles').upsert([
              {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name || 'New',
                last_name: user.user_metadata?.last_name || 'User',
                role: 'General Admin',
                status: 'Active'
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
      
      if (data) {
        // Check for active status
        if (data.status !== 'Active') {
          setProfile(data);
          setLoading(false);
          return;
        }

        // God Level Access for Prince Monovis and Admin Email
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        const email = data.email?.toLowerCase() || '';
        if (fullName.toLowerCase().includes('prince monovis') || 
            email === 'admin@faithhouse.church' || 
            email === 'sysadmin@faithhouse.church') {
          data.role = 'System Administrator';
        }
      }
      
      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      const errorMessage = err.message === 'Failed to fetch' || err.name === 'TypeError' 
        ? "Network Error: Unable to connect to the database. Please check your internet connection."
        : err.message || "An unexpected error occurred while fetching user profile.";
      setError(errorMessage);
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
    const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-fh-gold/5 rounded-full blur-[120px]" />
        </div>
        {error && (
          <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl max-w-sm animate-in fade-in zoom-in-95">
            <p className="text-rose-400 text-xs font-black uppercase tracking-widest mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
            >
              Retry Connection
            </button>
          </div>
        )}
        <div className="relative mb-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 border border-white/5 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-6 border border-blue-500/10 rounded-full"
          />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute inset-12 border border-fh-gold/5 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
              className="bg-white p-4 rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <img 
                src={logoUrl} 
                alt="FaithHouse Logo" 
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
                }}
              />
            </motion.div>
          </div>
        </div>
        
        <div className="space-y-6 max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h2 className="text-white font-black uppercase tracking-[0.3em] text-lg mb-2">Faithhouse Chapel</h2>
            <p className="text-blue-400 font-medium italic text-xs tracking-wide">
              "transforming lives through the power of God"
            </p>
          </motion.div>

          <div className="mt-8 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.status !== 'Active') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
          <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Security Lockout</h2>
          <p className="text-white/40 text-xs mb-8 leading-relaxed">
            Your access to the Faithhouse Chapel Internal System has been suspended. 
            This may be due to administrative review or security protocols.
          </p>
          <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl mb-8">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Account Status: {profile.status}</p>
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem('fci_simulated_user_id');
              window.location.reload();
            }}
            className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all"
          >
            Terminate Session
          </button>
        </div>
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
          return <DashboardView userProfile={profile} setActiveItem={handleSetActiveItem as any} />;
        
        case 'General Overseer':
          if (!['System Administrator', 'General Overseer', 'Head Pastor', 'General Office'].includes(role || '')) {
            return <SecurityDenied module={activeItem} />;
          }
          return <FounderView userProfile={profile!} setActiveItem={handleSetActiveItem as any} />;
        
        case 'Members':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return (
            <MembersView 
              userProfile={profile} 
              initialEditId={initialEditId}
              onSelectMember={(id) => { 
                setSelectedMemberId(id); 
                setInitialEditId(null);
                handleSetActiveItem('Member Profile'); 
              }} 
            />
          );
        
        case 'Member Profile':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return (
            <MemberProfileView 
              memberId={selectedMemberId || ''} 
              userProfile={profile} 
              onBack={handleBack} 
              onEdit={() => {
                setInitialEditId(selectedMemberId);
                handleSetActiveItem('Members');
              }}
            />
          );
        
        case 'Attendance':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <AttendanceView userProfile={profile} />;
        
        case 'Upcoming Events':
          return <EventsView userProfile={profile} />;
        
        case 'Finance':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return <FinanceView userProfile={profile} />;
        
        case 'Branches':
          if (!canAccess(role, 'LEVEL_1')) return <SecurityDenied module={activeItem} />;
          return <BranchesView userProfile={profile} />;
        
        case 'Leadership Registry':
        case 'Church Leadership':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <LeadershipView userProfile={profile} />;
        
        case 'Ministries':
          return <MinistriesView userProfile={profile} setActiveItem={handleSetActiveItem as any} />;
        
        case 'Visitation & Follow-up':
        case 'Follow-up & Visitation':
        case 'Follow-up & Visitation ministry':
          if (!['System Administrator', 'Head Pastor', 'Follow-up & Visitation', 'Evangelism Ministry', 'General Office'].includes(role || '')) {
            return <SecurityDenied module={activeItem} />;
          }
          return <FollowUpVisitationView />;
        
        case 'WhatsApp Hub':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return <WhatsAppSchedulerView userProfile={profile} />;

        case 'Recurring Tasks':
          if (!canAccess(role, 'LEVEL_2')) return <SecurityDenied module={activeItem} />;
          return <RecurringTasksView userProfile={profile} />;

        case 'Cell Meeting':
          return <CellMeetingView userProfile={profile} />;

        case 'Admin Users':
        case 'Settings':
          if (!canAccess(role, 'LEVEL_3')) return <SecurityDenied module={activeItem} />;
          return activeItem === 'Settings' ? (
            <SettingsView 
              userProfile={profile} 
              initialTab={isRecoveryMode ? 'Security' : 'General'} 
            />
          ) : (
            <AdminUsersView userProfile={profile} />
          );

        // Dynamic Ministry Modules
        case 'Youth & Children Ministry':
          return <YouthChildrenDashboardView userProfile={profile} />;

        case 'Children Ministry':
        case 'Children\'s Ministry':
          return <ChildrenMinistryView userProfile={profile} />;

        case 'Teens Ministry':
          return <TeensMinistryView userProfile={profile} />;

        case 'Media Ministry':
        case 'Media Department':
        case 'Music Ministry':
        case 'Music Department':
        case 'Ushering Ministry':
        case 'Ushering Department':
        case 'Protocol Ministry':
        case 'Protocol Department':
        case 'Prayer Ministry':
        case 'Prayer Department':
        case 'Evangelism':
        case 'Evangelism Ministry':
        case 'Evangelism Department':
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
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans print:bg-white">
      <div className="print:hidden">
        <Sidebar 
          activeItem={activeItem} 
          setActiveItem={(item) => {
            handleSetActiveItem(item);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          userProfile={profile}
          handleLogout={handleLogout}
        />
      </div>

      <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300 print:pl-0">
        <div className="print:hidden">
          <Header 
            toggleSidebar={toggleSidebar} 
            userProfile={profile} 
            activeItem={activeItem as string}
            onBack={handleBack}
            hasHistory={history.length > 1}
          />
        </div>
        <main className="flex-1 p-4 md:p-8 print:p-0">
          <div className="max-w-7xl mx-auto print:max-w-none">
            {renderContent()}
          </div>
        </main>
        <div className="print:hidden">
          <Footer />
        </div>
      </div>
      <div className="print:hidden">
        <DavidChatbot />
      </div>
      <Toaster position="top-right" richColors />
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
