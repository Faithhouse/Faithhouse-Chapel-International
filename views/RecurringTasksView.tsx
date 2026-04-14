import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { RecurringTaskTemplate } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Clock, Settings2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringTasksViewProps {
  currentUser?: any;
}

const RecurringTasksView: React.FC<RecurringTasksViewProps> = ({ currentUser }) => {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_type: 'All' as RecurringTaskTemplate['service_type'],
    assigned_ministry: ''
  });

  const isMinistryRole = (role: string) => {
    const standardRoles = ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance', 'media', 'worker'];
    return !standardRoles.includes(role);
  };

  const isReadOnly = currentUser && isMinistryRole(currentUser.role);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          setTableMissing(true);
          toast.error("Database tables still missing. Please run the SQL script.");
          return;
        }
        throw error;
      }
      setTemplates(data || []);
      setTableMissing(false);
      toast.success("Database restored successfully!");
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('recurring_task_templates')
        .insert([formData]);

      if (error) throw error;

      setNotification("Recurring task template created.");
      setIsModalOpen(false);
      setFormData({ title: '', description: '', service_type: 'All', assigned_ministry: '' });
      fetchTemplates();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert("Error creating template: " + err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Permanently remove this recurring task template?")) return;
    try {
      const { error } = await supabase
        .from('recurring_task_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification("Template removed.");
      fetchTemplates();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert("Error deleting template: " + err.message);
    }
  };

  if (tableMissing) {
    const repairSQL = `CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT NOT NULL,
  assigned_ministry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  description TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, category, branch_id)
);

CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.recurring_task_templates(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending',
  assigned_to TEXT,
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for staff" ON public.recurring_task_templates;
CREATE POLICY "Allow all for staff" ON public.recurring_task_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.task_instances;
CREATE POLICY "Allow all for staff" ON public.task_instances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staff" ON public.events;
CREATE POLICY "Allow all for staff" ON public.events FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-rose-100 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 uppercase mb-4">Task Templates Offline</h2>
          <p className="text-slate-500 mb-8">The recurring task database has not been initialized. Run the following script in your Supabase SQL Editor.</p>
          <pre className="bg-slate-900 text-fh-gold p-6 rounded-2xl text-[10px] font-mono text-left overflow-x-auto mb-8">
            {repairSQL}
          </pre>
          <button 
            onClick={fetchTemplates} 
            disabled={isLoading}
            className="px-12 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify Restoration"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-10 right-10 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          {notification}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-fh-green tracking-tighter uppercase">Recurring Tasks</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Automated Service Checklists</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-fh-green text-fh-gold rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Accessing Templates...</div>
        ) : templates.length > 0 ? templates.map(t => (
          <div key={t.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                {t.service_type}
              </span>
              {!isReadOnly && (
                <button 
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">{t.title}</h3>
            <p className="text-xs text-slate-500 mb-6 line-clamp-2">{t.description || 'No description provided.'}</p>
            
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-auto">
              <Settings2 className="w-3.3 h-3.3" />
              {t.assigned_ministry || 'General Oversight'}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No recurring tasks created</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleCreateTemplate} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl border-b-[12px] border-fh-gold">
            <h2 className="text-2xl font-black text-fh-green uppercase">New Task Template</h2>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Task Title</label>
              <input required placeholder="e.g. Sanitize Sanctuary" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
              <textarea placeholder="Specific instructions for the team..." className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 h-24 resize-none"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Service Type</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 cursor-pointer"
                  value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value as any})}>
                  <option value="All">All Services</option>
                  <option>Prophetic Word Service</option>
                  <option>Help from above service</option>
                  <option>Special services</option>
                  <option>Conferences</option>
                  <option>Sunday Service</option>
                  <option>Mid-week Service</option>
                  <option>Prayer Meeting</option>
                  <option>Youth Service</option>
                  <option>Women's Meeting</option>
                  <option>Men's Meeting</option>
                  <option>Communion Service</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Ministry</label>
                <input placeholder="e.g. Ushering" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800"
                  value={formData.assigned_ministry} onChange={e => setFormData({...formData, assigned_ministry: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase shadow-lg tracking-widest mt-4">
              Create Template
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default RecurringTasksView;
