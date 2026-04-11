
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
import RecurringTasksView from './views/RecurringTasksView';
import UsersView from './views/UsersView';
import FollowUpMapView from './views/FollowUpMapView';
import ProfileView from './views/ProfileView';
import MinistryReportsView from './views/MinistryReportsView';
import SettingsView from './views/SettingsView';
import LoginView from './views/LoginView';
import ErrorBoundary from './components/ErrorBoundary';
import DavidChatbot from './components/DavidChatbot';
import { Toaster, toast } from 'sonner';
import { NavItem, UserProfile } from './types';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [activeItem, setActiveItem] = useState<NavItem | string>('Dashboard');
  const [history, setHistory] = useState<string[]>(['Dashboard']);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [initialEditId, setInitialEditId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (!currentUser && !isDemoMode) return;

    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

    const checkInactivity = () => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
        handleLogout();
      }
    };

    const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds

    const resetTimer = () => setLastActivity(Date.now());

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [currentUser, isDemoMode, lastActivity]);

  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (e.detail) handleSetActiveItem(e.detail);
    };
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, [activeItem]);

  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setCurrentUser(profile);
          } else if (session.user.email === 'systemadmin@faithhouse.church') {
            const rootProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email,
              full_name: 'System Administrator',
              role: 'system_admin',
              is_active: true
            };
            setCurrentUser(rootProfile);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAuth();
      } else if (!isDemoMode) {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemoMode]);

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
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = async () => {
    try {
      if (isDemoMode) {
        setIsDemoMode(false);
        setCurrentUser(null);
        toast.success('Demo session ended');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Logout failed');
    }
  };

  const renderContent = () => {
    if (isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-fh-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing System...</p>
        </div>
      );
    }

    try {
      switch (activeItem) {
        case 'Dashboard':
          return <DashboardView setActiveItem={handleSetActiveItem as any} currentUser={currentUser} />;
        
        case 'General Overseer':
          return <FounderView setActiveItem={handleSetActiveItem as any} />;
        
        case 'Members':
          return (
            <MembersView 
              initialEditId={initialEditId}
              currentUser={currentUser}
              onSelectMember={(id) => { 
                setSelectedMemberId(id); 
                setInitialEditId(null);
                handleSetActiveItem('Member Profile'); 
              }} 
            />
          );
        
        case 'Member Profile':
          return (
            <MemberProfileView 
              memberId={selectedMemberId || ''} 
              onBack={handleBack} 
              onEdit={() => {
                setInitialEditId(selectedMemberId);
                handleSetActiveItem('Members');
              }}
            />
          );
        
        case 'Attendance':
          return <AttendanceView />;
        
        case 'Upcoming Events':
          return <EventsView />;
        
        case 'Finance':
          return <FinanceView currentUser={currentUser} />;
        
        case 'Branches':
          return <BranchesView />;
        
        case 'Leadership Registry':
        case 'Church Leadership':
          return <LeadershipView />;
        
        case 'Ministries':
          return <MinistriesView setActiveItem={handleSetActiveItem as any} />;
        
        case 'Ministry Reports':
          return <MinistryReportsView currentUser={currentUser} />;
        
        case 'Visitation & Follow-up':
        case 'Follow-up & Visitation':
        case 'Follow-up & Visitation ministry':
        case 'Visitation Logs':
          return <FollowUpVisitationView setActiveItem={handleSetActiveItem as any} currentUser={currentUser} />;
        
        case 'WhatsApp Hub':
          return <WhatsAppSchedulerView />;

        case 'Follow-Up Map':
          return <FollowUpMapView currentUser={currentUser} />;

        case 'Recurring Tasks':
          return <RecurringTasksView />;

        case 'Cell Meeting':
          return <CellMeetingView />;

        case 'Users':
          return <UsersView currentUser={currentUser} />;

        case 'Profile':
          return <ProfileView currentUser={currentUser} />;

        case 'Settings':
          return <SettingsView currentUser={currentUser} />;

        // Dynamic Ministry Modules
        case 'Youth & Children Ministry':
          return <YouthChildrenDashboardView />;

        case 'Children Ministry':
        case 'Children\'s Ministry':
          return <ChildrenMinistryView />;

        case 'Teens Ministry':
          return <TeensMinistryView />;

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
          return <MinistryModuleView ministryName={activeItem} />;

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
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans print:bg-white">
        {!currentUser && !isDemoMode ? (
          <LoginView onLoginSuccess={(internalUser) => {
            if (internalUser) {
              setCurrentUser(internalUser);
              setIsDemoMode(true); 
            } else {
              // Handle Demo Login button
              const mockAdmin: UserProfile = {
                id: '00000000-0000-0000-0000-000000000000',
                email: 'systemadmin@faithhouse.church',
                full_name: 'System Administrator',
                role: 'system_admin',
                is_active: true
              };
              setCurrentUser(mockAdmin);
              setIsDemoMode(true);
            }
          }} />
        ) : (
          <>
            <div className="print:hidden">
              <Sidebar 
                activeItem={activeItem} 
                setActiveItem={(item) => {
                  handleSetActiveItem(item);
                  setIsSidebarOpen(false);
                }}
                isOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            </div>

            <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300 print:pl-0">
              <div className="print:hidden">
                <Header 
                  toggleSidebar={toggleSidebar} 
                  activeItem={activeItem as string}
                  onBack={handleBack}
                  hasHistory={history.length > 1}
                  currentUser={currentUser}
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
          </>
        )}
        <Toaster position="top-right" richColors />
      </div>
    </ErrorBoundary>
  );
};

export default App;
