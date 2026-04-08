
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  MapPin, 
  UserCheck, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Search,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Ministry, Member, TitheRecord } from '../types';
import { format } from 'date-fns';

interface FounderViewProps {
  setActiveItem: (item: string) => void;
}

const FounderView: React.FC<FounderViewProps> = ({ setActiveItem }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalBranches: 0,
    totalMinisters: 0,
    totalIncome: 0,
    totalExpenses: 0,
    avgAttendance: 0,
    membershipGrowth: 0,
    financialHealth: 0
  });

  const [financialData, setFinancialData] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [branchDistribution, setBranchDistribution] = useState<any[]>([]);
  const [ministryPerformance, setMinistryPerformance] = useState<any[]>([]);
  const [recentGlobalActivity, setRecentGlobalActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalSummary();
  }, []);

  const fetchGlobalSummary = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Total Members
      const { count: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Total Branches
      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });

      // 3. Fetch Total Ministers
      const { count: ministerCount } = await supabase
        .from('ministers')
        .select('*', { count: 'exact', head: true });

      // 4. Fetch Financial Summary
      const { data: finances } = await supabase
        .from('financial_records')
        .select('total_income, expenses, service_date')
        .order('service_date', { ascending: true });

      let income = 0;
      let expenses = 0;
      const finChartData: any[] = [];

      if (finances) {
        finances.forEach(f => {
          income += f.total_income || 0;
          expenses += f.expenses || 0;
          
          const month = format(new Date(f.service_date), 'MMM yy');
          const existing = finChartData.find(d => d.name === month);
          if (existing) {
            existing.income += f.total_income || 0;
            existing.expenses += f.expenses || 0;
          } else {
            finChartData.push({ name: month, income: f.total_income || 0, expenses: f.expenses || 0 });
          }
        });
      }

      // 5. Fetch Attendance Summary
      const { data: attendance } = await supabase
        .from('attendance_events')
        .select('total_attendance, event_date')
        .order('event_date', { ascending: true });

      let totalAtt = 0;
      const attChartData: any[] = [];

      if (attendance) {
        attendance.forEach(a => {
          totalAtt += a.total_attendance || 0;
          const date = format(new Date(a.event_date), 'dd MMM');
          attChartData.push({ name: date, attendance: a.total_attendance || 0 });
        });
      }

      // 6. Branch Distribution (Mocked for now as we'd need a join or multiple queries)
      const distData: any[] = [];

      setStats({
        totalMembers: memberCount || 0,
        totalBranches: branchCount || 0,
        totalMinisters: ministerCount || 0,
        totalIncome: income,
        totalExpenses: expenses,
        avgAttendance: attendance && attendance.length > 0 ? Math.round(totalAtt / attendance.length) : 0,
        membershipGrowth: 0,
        financialHealth: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0
      });

      setFinancialData(finChartData.slice(-6));
      setAttendanceTrend(attChartData.slice(-10));
      
      // 6. Real Branch Distribution
      const { data: branchData } = await supabase
        .from('branches')
        .select('name, id');
      
      if (branchData) {
        const dist: any[] = [];
        for (const b of branchData) {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', b.id);
          dist.push({ name: b.name, value: count || 0 });
        }
        setBranchDistribution(dist);
      }

      // 7. Ministry Performance Analysis
      const { data: ministries } = await supabase.from('ministries').select('*');
      const { data: members } = await supabase.from('members').select('id, ministry');
      
      // Fetch Tithes from Supabase for financial performance
      let tithes: TitheRecord[] = [];
      try {
        const { data: titheData, error: titheError } = await supabase
          .from('tithe_entries')
          .select('*');
        
        if (titheError) throw titheError;
        tithes = titheData || [];
      } catch (err) {
        console.warn("Supabase tithes fetch failed:", err);
      }

      if (ministries && members) {
        const perfData = ministries.map(min => {
          const ministryMembers = members.filter(m => m.ministry === min.name);
          const memberIds = new Set(ministryMembers.map(m => m.id));
          
          const ministryTithes = tithes.filter(t => memberIds.has(t.member_id));
          const totalContribution = ministryTithes.reduce((sum, t) => sum + (t.amount || 0), 0);
          
          return {
            name: min.name,
            members: ministryMembers.length,
            contribution: totalContribution,
            score: Math.min(100, (ministryMembers.length * 5) + (totalContribution / 100)) // Simple performance score
          };
        }).sort((a, b) => b.score - a.score);
        
        setMinistryPerformance(perfData);
      }

      // 8. Recent Global Activity
      const { data: recentMembers } = await supabase
        .from('members')
        .select('first_name, last_name, created_at, branches(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: recentFinances } = await supabase
        .from('financial_records')
        .select('total_income, service_date, branches(name)')
        .order('service_date', { ascending: false })
        .limit(5);

      const combined: any[] = [
        ...(recentMembers?.map(m => ({ 
          type: 'member', 
          title: 'New Member Registered', 
          desc: `${m.first_name} ${m.last_name} joined ${(m.branches as any)?.name || 'a branch'}`,
          time: m.created_at 
        })) || []),
        ...(recentFinances?.map(f => ({ 
          type: 'finance', 
          title: 'Financial Record Posted', 
          desc: `Income of $${f.total_income.toLocaleString()} recorded at ${(f.branches as any)?.name || 'a branch'}`,
          time: f.service_date 
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setRecentGlobalActivity(combined.slice(0, 8));

    } catch (error) {
      console.error("Error fetching global summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#20c997', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-4 mb-12">
        <div className="w-20 h-20 bg-slate-900 text-fh-gold rounded-[2rem] flex items-center justify-center shadow-2xl mb-4">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
          Executive Oversight
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-500 font-medium italic tracking-wide max-w-3xl leading-relaxed">
          "Know the state of your flocks, and put your heart into caring for your herds." – Proverbs 27:23
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ExecutiveCard 
          title="Global Membership" 
          value={stats.totalMembers.toLocaleString()} 
          trend="+12.5%" 
          icon={<Users className="w-6 h-6" />}
          color="emerald"
          isLoading={isLoading}
          onClick={() => setActiveItem('Members')}
        />
        <ExecutiveCard 
          title="Total Branches" 
          value={stats.totalBranches.toLocaleString()} 
          trend="+2" 
          icon={<MapPin className="w-6 h-6" />}
          color="blue"
          isLoading={isLoading}
          onClick={() => setActiveItem('Branches')}
        />
        <ExecutiveCard 
          title="Net Surplus" 
          value={`$${(stats.totalIncome - stats.totalExpenses).toLocaleString()}`} 
          trend={`${stats.financialHealth}% Margin`} 
          icon={<DollarSign className="w-6 h-6" />}
          color="amber"
          isLoading={isLoading}
          onClick={() => setActiveItem('Finance')}
        />
        <ExecutiveCard 
          title="Avg. Attendance" 
          value={stats.avgAttendance.toLocaleString()} 
          trend="+5.2%" 
          icon={<UserCheck className="w-6 h-6" />}
          color="purple"
          isLoading={isLoading}
          onClick={() => setActiveItem('Attendance')}
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Ministry Performance Tracker */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ministry Performance Tracker</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Operational Efficiency & Engagement Metrics</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-fh-green"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Member Strength</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-fh-gold"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Financial Support</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ministryPerformance.map((min, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveItem(min.name)}
                className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-fh-gold/30 transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-fh-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-fh-gold/10 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 font-black text-fh-green">
                    {min.name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Score</p>
                    <p className="text-xl font-black text-fh-green">{Math.round(min.score)}%</p>
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 truncate">{min.name}</h4>

                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Members</span>
                    <span className="text-xs font-black text-slate-900">{min.members}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (min.members / (stats.totalMembers / 4)) * 100)}%` }}
                      className="h-full bg-fh-green"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Impact</span>
                    <span className="text-xs font-black text-slate-900">${min.contribution.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (min.contribution / (stats.totalIncome / 10)) * 100)}%` }}
                      className="h-full bg-fh-gold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Performance */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Financial Trajectory</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Income vs Expenses (Last 6 Months)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} id="founder-financial-chart">
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Regional Impact</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Membership Distribution by Region</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart id="founder-branch-pie">
                <Pie
                  data={branchDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {branchDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-6">
            {branchDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Section: Ministers & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Attendance Trend */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Attendance Momentum</h3>
            <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
              Global Average: {stats.avgAttendance}
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrend} id="founder-attendance-bar">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fh-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-fh-gold" />
              <h3 className="text-lg font-black uppercase tracking-tight text-fh-gold">Executive Summary</h3>
            </div>
            <div className="space-y-6">
              <SummaryItem 
                label="Ministerial Strength" 
                value={`${stats.totalMinisters} Ordained Ministers`} 
                description="Across all functional branches and regions."
                onClick={() => setActiveItem('Ministers & Pastors')}
              />
              <SummaryItem 
                label="Financial Efficiency" 
                value={`${stats.financialHealth}% Retention`} 
                description="Ratio of net surplus relative to total global income."
                onClick={() => setActiveItem('Finance')}
              />
              <SummaryItem 
                label="Expansion Index" 
                value="Stable Growth" 
                description="Consistent upward trend in both membership and branch planting."
                onClick={() => setActiveItem('Branches')}
              />
            </div>
          </div>
          <button className="relative z-10 w-full mt-8 py-4 bg-fh-gold text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-xl">
            Generate Annual Report
          </button>
        </div>

      </div>

      {/* Global Activity Feed */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Global Activity Feed</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time updates across the entire ministry</p>
          </div>
          <button onClick={fetchGlobalSummary} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recentGlobalActivity.length > 0 ? (
            recentGlobalActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-fh-gold/20 transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'member' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {activity.type === 'member' ? <Users className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{activity.title}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
                      {format(new Date(activity.time), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">{activity.desc}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent activity detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExecutiveCard = ({ title, value, trend, icon, color, isLoading, onClick }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
          <ArrowUpRight className="w-3 h-3" /> {trend}
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : value}</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{title}</p>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value, description, onClick }: any) => (
  <div 
    onClick={onClick}
    className="border-l-2 border-fh-gold/20 pl-6 py-1 cursor-pointer group hover:border-fh-gold transition-all active:translate-x-1"
  >
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fh-gold/60 group-hover:text-fh-gold transition-colors">{label}</p>
    <p className="text-lg font-black text-white mt-1">{value}</p>
    <p className="text-xs text-white/40 font-medium mt-1">{description}</p>
  </div>
);

export default FounderView;
