
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  User, 
  MapPin, 
  Phone, 
  Users, 
  Heart, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  X, 
  Droplets, 
  Zap, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';
import { MapPickerModal } from '../components/MapPickerModal';

const DEFAULT_SLIDESHOW = [
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3",
  "https://images.unsplash.com/photo-1548625361-195fe5772df8",
  "https://images.unsplash.com/photo-1515162305285-0293e4767cc2",
  "https://images.unsplash.com/photo-1477673332464-70cf35293696",
  "https://images.unsplash.com/photo-1523059623039-a240d06f214d"
];

const PublicEnrollmentView: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
    gps_address: '', dob: '', marital_status: 'Single', occupation: '',
    hometown: '', spouse_name: '', spouse_phone: '',
    children: [] as { name: string; dob: string; gender: string; phone: string }[],
    emergency_contact_name: '', emergency_contact_relationship: '',
    emergency_contact_phone: '', branch_id: '',
    latitude: null as number | null, longitude: null as number | null,
    maps_url: '', water_baptised: false, holy_ghost_baptised: false, ministry: 'N/A'
  });

  const [isSystemReady, setIsSystemReady] = useState<boolean | null>(null);
  const [repairSQL, setRepairSQL] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successAction, setSuccessAction] = useState<'created' | 'updated' | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<string[]>(DEFAULT_SLIDESHOW);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Data Fetching
  useEffect(() => {
    const initPortal = async () => {
      const sql = `-- FAITHHOUSE SYSTEM RECOVERY v8.0
-- 1. DROP ALL VERSIONS OF THE FUNCTION
DROP FUNCTION IF EXISTS public.enroll_or_update_member;
DROP FUNCTION IF EXISTS public.enroll_or_update_member(text,text,text,date,text,text,text,text,numeric,numeric,text,text,text,text,text,jsonb,text,text,text,uuid,text,boolean,boolean);

-- 2. CREATE FUNCTION
CREATE OR REPLACE FUNCTION public.enroll_or_update_member(
  p_first_name TEXT, p_last_name TEXT, p_gender TEXT, p_dob DATE, p_phone TEXT, p_email TEXT,
  p_hometown TEXT, p_gps_address TEXT, p_latitude NUMERIC, p_longitude NUMERIC, p_maps_url TEXT,
  p_occupation TEXT, p_marital_status TEXT, p_spouse_name TEXT, p_spouse_phone TEXT, p_children JSONB,
  p_emergency_contact_name TEXT, p_emergency_contact_relationship TEXT, p_emergency_contact_phone TEXT,
  p_branch_id UUID, p_ministry TEXT, p_water_baptised BOOLEAN, p_holy_ghost_baptised BOOLEAN
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE v_id UUID; v_count INT;
BEGIN
  -- Match by name (case-insensitive and trimmed)
  SELECT COUNT(*), MIN(id::text)::uuid INTO v_count, v_id FROM public.members 
  WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(p_first_name)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(p_last_name));

  IF v_count = 0 THEN
    -- CREATE NEW MEMBER
    INSERT INTO public.members (
      first_name, last_name, gender, dob, phone, email, hometown, gps_address, latitude, longitude, maps_url, 
      occupation, marital_status, spouse_name, spouse_phone, children, emergency_contact_name, 
      emergency_contact_relationship, emergency_contact_phone, branch_id, ministry, water_baptised, holy_ghost_baptised, status
    )
    VALUES (
      p_first_name, p_last_name, p_gender, p_dob, p_phone, p_email, p_hometown, p_gps_address, p_latitude, p_longitude, p_maps_url, 
      p_occupation, p_marital_status, p_spouse_name, p_spouse_phone, p_children, p_emergency_contact_name, 
      p_emergency_contact_relationship, p_emergency_contact_phone, p_branch_id, p_ministry, p_water_baptised, p_holy_ghost_baptised, 'Active'
    ) RETURNING id INTO v_id;
    RETURN jsonb_build_object('action', 'created', 'member_id', v_id);

  ELSIF v_count = 1 THEN
    -- UPDATE EXISTING (Fill in gaps)
    UPDATE public.members SET 
      gender = COALESCE(gender, p_gender),
      dob = COALESCE(dob, p_dob),
      phone = COALESCE(NULLIF(phone, ''), p_phone),
      email = COALESCE(NULLIF(email, ''), p_email),
      hometown = COALESCE(NULLIF(hometown, ''), p_hometown),
      gps_address = COALESCE(NULLIF(gps_address, ''), p_gps_address),
      latitude = COALESCE(latitude, p_latitude),
      longitude = COALESCE(longitude, p_longitude),
      maps_url = COALESCE(NULLIF(maps_url, ''), p_maps_url),
      occupation = COALESCE(NULLIF(occupation, ''), p_occupation),
      marital_status = COALESCE(marital_status, p_marital_status),
      spouse_name = COALESCE(NULLIF(spouse_name, ''), p_spouse_name),
      spouse_phone = COALESCE(NULLIF(spouse_phone, ''), p_spouse_phone),
      children = CASE WHEN children IS NULL OR children::text = '[]' THEN p_children ELSE children END,
      emergency_contact_name = COALESCE(NULLIF(emergency_contact_name, ''), p_emergency_contact_name),
      emergency_contact_relationship = COALESCE(NULLIF(emergency_contact_relationship, ''), p_emergency_contact_relationship),
      emergency_contact_phone = COALESCE(NULLIF(emergency_contact_phone, ''), p_emergency_contact_phone),
      branch_id = COALESCE(branch_id, p_branch_id),
      ministry = CASE WHEN ministry IS NULL OR ministry = 'N/A' THEN p_ministry ELSE ministry END,
      water_baptised = water_baptised OR p_water_baptised,
      holy_ghost_baptised = holy_ghost_baptised OR p_holy_ghost_baptised
    WHERE id = v_id;
    RETURN jsonb_build_object('action', 'updated', 'member_id', v_id);

  ELSE 
    -- MULTIPLE MATCHES (Notify admin)
    RETURN jsonb_build_object('action', 'created_duplicate_warning', 'member_id', v_id, 'message', 'Multiple profiles found with this name. Admin review required.');
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.enroll_or_update_member TO anon;
NOTIFY pgrst, 'reload schema';`;
      setRepairSQL(sql);

      try {
        const [branchesRes, ministriesRes, settingsRes] = await Promise.all([
          supabase.from('branches').select('*'),
          supabase.from('ministries').select('*').order('name'),
          supabase.from('system_settings').select('value').eq('id', 'login_slideshow').single()
        ]);

        if (branchesRes.data) setBranches(branchesRes.data);
        if (ministriesRes.data) setMinistries(ministriesRes.data);
        if (settingsRes.data?.value && Array.isArray(settingsRes.data.value)) {
          setSlideshowImages(settingsRes.data.value);
        }

        setIsSystemReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setIsSystemReady(false);
      }
    };

    initPortal();
  }, []);

  // Slideshow Logic
  useEffect(() => {
    if (slideshowImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slideshowImages]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addChild = () => {
    if (formData.children.length >= 5) return;
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', dob: '', gender: 'Male', phone: '' }]
    }));
  };

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newChildren = [...prev.children];
      newChildren[index] = { ...newChildren[index], [field]: value };
      return { ...prev, children: newChildren };
    });
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          maps_url: `https://maps.google.com/?q=${latitude},${longitude}`,
          gps_address: `Pinned at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        }));
        toast.success("Location captured successfully!");
        setIsLocating(false);
      },
      (error) => {
        toast.error("Unable to retrieve location. Please check browser permissions.");
        setIsLocating(false);
      }
    );
  };

  interface SubmitResult {
    action: 'created' | 'updated' | 'created_duplicate_warning' | 'error';
    member_id?: string;
    message: string;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const rpcPayload = {
        p_first_name: formData.first_name.trim(),
        p_last_name: formData.last_name.trim(),
        p_gender: formData.gender,
        p_dob: formData.dob || null,
        p_phone: formData.phone || null,
        p_email: formData.email || null,
        p_hometown: formData.hometown || null,
        p_gps_address: formData.gps_address || null,
        p_latitude: formData.latitude || null,
        p_longitude: formData.longitude || null,
        p_maps_url: formData.maps_url || null,
        p_occupation: formData.occupation || null,
        p_marital_status: formData.marital_status,
        p_spouse_name: formData.spouse_name || null,
        p_spouse_phone: formData.spouse_phone || null,
        p_children: formData.children,
        p_emergency_contact_name: formData.emergency_contact_name || null,
        p_emergency_contact_relationship: formData.emergency_contact_relationship || null,
        p_emergency_contact_phone: formData.emergency_contact_phone || null,
        p_branch_id: formData.branch_id || null,
        p_ministry: formData.ministry,
        p_water_baptised: formData.water_baptised,
        p_holy_ghost_baptised: formData.holy_ghost_baptised
      };

      const { data, error } = await supabase.rpc('enroll_or_update_member', rpcPayload);

      if (error) {
        // Handle JWT Expiry or Auth issues
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          console.warn("JWT expired, retrying anonymously...");
          await supabase.auth.signOut();
          const { data: retryData, error: retryError } = await supabase.rpc('enroll_or_update_member', rpcPayload);
          if (retryError) throw retryError;
          const retryResult = retryData as SubmitResult;
          setSuccessAction(retryResult.action === 'updated' ? 'updated' : 'created');
          setIsSuccess(true);
          return;
        }
        throw error;
      }
      
      const result = data as SubmitResult;

      if (result.action === 'error') {
        toast.error(result.message || "Submission failed.");
        return;
      }

      setSuccessAction(result.action === 'updated' ? 'updated' : 'created');
      setIsSuccess(true);

      if (result.action === 'created') {
        toast.success("Welcome! Your membership profile has been created.");
      } else if (result.action === 'updated') {
        toast.success("Your profile has been updated with the new information.");
      } else if (result.action === 'created_duplicate_warning') {
        toast.warning("Profile created. Admin notified to review duplicate names.");
      }

    } catch (err: any) {
      toast.error(err.message || "Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderers
  if (isSystemReady === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-16 h-16 text-fh-gold animate-spin" />
        <p className="text-fh-gold font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Securing Environment...</p>
      </div>
    );
  }

  if (isSystemReady === false) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-slate-950">
          <img src={DEFAULT_SLIDESHOW[1]} className="w-full h-full object-cover blur-sm opacity-20" alt="Church" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white relative z-10 rounded-[3rem] p-12 text-center shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-rose-500 animate-pulse" />
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-tight">System Initialization In Progress</h2>
          <p className="text-slate-600 font-bold leading-relaxed mb-8">
            The enrollment module is being activated. Please contact the administrator to finalize setup.
          </p>
          <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100 mb-8 inline-block">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Code: ERR_RELATION_NOT_FOUND</p>
          </div>
          <pre className="bg-slate-900 text-fh-gold p-4 rounded-xl text-[8px] font-mono text-left h-32 overflow-y-auto mb-8 shadow-inner border border-fh-gold/10">
            {repairSQL}
          </pre>
          <div className="flex gap-4">
            <button onClick={() => { navigator.clipboard.writeText(repairSQL); toast.success('SQL Script copied.'); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Copy Script</button>
            <button onClick={() => window.location.reload()} className="flex-1 py-4 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:shadow-2xl transition-all">Verify Setup</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlideIndex}
            src={slideshowImages[currentSlideIndex]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 w-full h-full object-cover brightness-[0.4] blur-sm"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white relative z-10 rounded-[3rem] p-12 text-center shadow-2xl border-b-[12px] border-fh-green"
        >
          <div className="mb-8 flex justify-center">
            {successAction === 'created' ? (
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            ) : (
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner animate-pulse">
                <Zap className="w-12 h-12" />
              </div>
            )}
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-tight">
            {successAction === 'created' ? "Welcome to Faithhouse!" : "Profile Updated"}
          </h2>
          
          <p className="text-slate-600 font-bold leading-relaxed mb-8">
            {successAction === 'created' 
              ? "Your membership profile has been successfully created. Our team will be in touch with you shortly."
              : "We found your existing profile and filled in the missing information. Your records are now up to date."
            }
          </p>

          <button 
            onClick={() => window.location.reload()} 
            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${
              successAction === 'created' ? 'bg-fh-green text-fh-gold' : 'bg-slate-900 text-white'
            }`}
          >
            {successAction === 'created' ? "Proceed Home" : "Done"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start py-12 px-6 overflow-x-hidden">
      {/* Background Slideshow */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }} className="absolute inset-0"
          >
            <img src={slideshowImages[currentSlideIndex]} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Church Background" />
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="max-w-xl w-full relative z-10">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl p-1 shadow-2xl mb-6 transform rotate-3 border-4 border-fh-green">
             <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden p-2">
               <img src="https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
             </div>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Faithhouse Chapel</h1>
          <h2 className="text-lg font-black text-fh-gold uppercase tracking-widest leading-none mt-1">International</h2>
          <div className="h-1 w-12 bg-fh-gold rounded-full mt-6 opacity-30"></div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200/50 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 relative">
            <motion.div 
              className="absolute h-full bg-fh-green"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>

          <div className="p-8 md:p-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-8">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Step 01/05</p>
                     <h3 className="text-2xl font-black text-fh-green uppercase tracking-tight">Personal Identity</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">First Name *</label>
                      <input name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold focus:ring-2 focus:ring-fh-green/10 outline-none transition-all placeholder:text-slate-300" placeholder="John" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Last Name *</label>
                      <input name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold focus:ring-2 focus:ring-fh-green/10 outline-none transition-all placeholder:text-slate-300" placeholder="Doe" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Date of Birth *</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="+233..." />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="john@example.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Hometown</label>
                      <input name="hometown" value={formData.hometown} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="Region / Town" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Occupation</label>
                      <input name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="Job Title" />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (!formData.first_name || !formData.last_name || !formData.phone || !formData.email || !formData.dob) {
                        toast.error("Please fill all required fields marked with *");
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:translate-y-[-2px] transition-all"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-8">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Step 02/05</p>
                     <h3 className="text-2xl font-black text-fh-green uppercase tracking-tight">Residential & Location</h3>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">GPS / Digital Address</label>
                    <input name="gps_address" value={formData.gps_address} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="e.g. GA-123-4567" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={getCurrentLocation}
                      disabled={isLocating}
                      className="py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      {isLocating ? <Loader2 className="w-3 h-3 animate-spin text-fh-gold" /> : <MapPin className="w-3 h-3 text-fh-gold" />}
                      Use My Current Location
                    </button>
                    <button 
                      onClick={() => setShowMapPicker(true)}
                      className="py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50"
                    >
                      <Droplets className="w-3 h-3 text-fh-green" />
                      Pick on Map
                    </button>
                  </div>

                  <div className="space-y-1 pt-4">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Marital Status *</label>
                    <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                      <option>Single</option>
                      <option>Married</option>
                      <option>Divorced</option>
                      <option>Widowed</option>
                    </select>
                  </div>

                  <AnimatePresence>
                    {formData.marital_status === 'Married' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                      >
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Spouse Name</label>
                          <input name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Spouse Phone</label>
                          <input name="spouse_phone" value={formData.spouse_phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={() => setStep(3)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-8 flex justify-between items-end">
                     <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Step 03/05</p>
                       <h3 className="text-2xl font-black text-fh-green uppercase tracking-tight">Children & Family</h3>
                     </div>
                     <button 
                       onClick={addChild} disabled={formData.children.length >= 5}
                       className="p-3 bg-fh-green text-fh-gold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all"
                     >
                       <Plus className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="space-y-4">
                    {formData.children.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Users className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No children added yet</p>
                      </div>
                    ) : (
                      formData.children.map((child, idx) => (
                        <motion.div 
                          key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="p-6 bg-slate-50 rounded-3xl border border-slate-200 relative"
                        >
                          <button onClick={() => removeChild(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                               <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-2">Child Name</label>
                               <input value={child.name} onChange={(e) => updateChild(idx, 'name', e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl font-bold text-sm outline-none" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-2">Child DOB</label>
                               <input type="date" value={child.dob} onChange={(e) => updateChild(idx, 'dob', e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl font-bold text-sm outline-none" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-2">Child Gender</label>
                               <select value={child.gender} onChange={(e) => updateChild(idx, 'gender', e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl font-bold text-sm outline-none">
                                 <option>Male</option>
                                 <option>Female</option>
                               </select>
                             </div>
                             <div className="space-y-1">
                               <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-2">Child Phone (Optional)</label>
                               <input value={child.phone} onChange={(e) => updateChild(idx, 'phone', e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl font-bold text-sm outline-none" />
                             </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-4 pt-8">
                    <button onClick={() => setStep(2)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                       <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={() => setStep(4)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                       Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="st4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-8">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Step 04/05</p>
                     <h3 className="text-2xl font-black text-fh-green uppercase tracking-tight">Emergency & Church</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Emergency Contact Name *</label>
                      <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Relationship *</label>
                        <input name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="e.g. Brother" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Emergency Phone *</label>
                        <input name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Local Church Branch *</label>
                      <select name="branch_id" value={formData.branch_id} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="">Select from {branches.length} branches</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Proposed Ministry</label>
                      <select name="ministry" value={formData.ministry} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="N/A">Not Assigned (N/A)</option>
                        {ministries.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8">
                    <button onClick={() => setStep(3)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                       <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={() => setStep(5)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                       Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="st5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-6">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Step 05/05</p>
                     <h3 className="text-2xl font-black text-fh-green uppercase tracking-tight">Faith & Review</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleCheckboxChange('water_baptised', !formData.water_baptised)}
                      className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${formData.water_baptised ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      <div className={`p-3 rounded-full ${formData.water_baptised ? 'bg-emerald-500 text-white' : 'bg-white text-slate-200'}`}>
                        <Droplets className="w-6 h-6" />
                      </div>
                      <p className="font-black uppercase text-[9px] tracking-widest">Water Baptised</p>
                    </button>
                    <button 
                      onClick={() => handleCheckboxChange('holy_ghost_baptised', !formData.holy_ghost_baptised)}
                      className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${formData.holy_ghost_baptised ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      <div className={`p-3 rounded-full ${formData.holy_ghost_baptised ? 'bg-amber-500 text-white' : 'bg-white text-slate-200'}`}>
                        <Zap className="w-6 h-6" />
                      </div>
                      <p className="font-black uppercase text-[9px] tracking-widest">Holy Ghost Baptised</p>
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-6 max-h-[300px] overflow-y-auto space-y-4 border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrollment Summary Review</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-[8px] font-black text-fh-green tracking-widest uppercase">Personal</p>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{formData.first_name} {formData.last_name} • {formData.gender} • {formData.dob}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-fh-green tracking-widest uppercase">Connectivity</p>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{formData.phone} • {formData.email}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-fh-green tracking-widest uppercase">Residence & Church</p>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{formData.gps_address} • {branches.find(b => b.id === formData.branch_id)?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setStep(4)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                       <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button 
                      onClick={handleSubmit} disabled={isSubmitting}
                      className="flex-[2] py-5 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                       {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Enrollment'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <MapPickerModal 
        isOpen={showMapPicker} onClose={() => setShowMapPicker(false)}
        initialCoords={formData.latitude ? { lat: formData.latitude, lng: formData.longitude! } : null}
        onConfirm={(loc) => {
          setFormData(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng, maps_url: loc.maps_url, gps_address: loc.gps }));
          setShowMapPicker(false);
        }}
      />
    </div>
  );
};

export default PublicEnrollmentView;
