
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { MapPickerModal } from '../components/MapPickerModal';

const churchImages = [
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1548625361-195fe5772df8?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1477673332464-70cf35293696?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1523059623039-a240d06f214d?auto=format&fit=crop&q=80&w=1000"
];

const PublicEnrollmentView: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>(churchImages);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    phone: '',
    email: '',
    gps_address: '',
    dob: '',
    marital_status: 'Single',
    occupation: '',
    hometown: '',
    spouse_name: '',
    spouse_phone: '',
    children: [] as any[],
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    branch_id: '',
    latitude: 0 as number | null,
    longitude: 0 as number | null,
    maps_url: '',
    water_baptised: false,
    holy_ghost_baptised: false,
    ministry: 'N/A'
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: branchData } = await supabase.from('branches').select('*');
      setBranches(branchData || []);
      
      const { data: ministryData } = await supabase.from('ministries').select('*').order('name');
      setMinistries(ministryData || []);

      // Fetch slideshow images
      try {
        const { data: slideshowData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('id', 'login_slideshow')
          .single();
        
        if (slideshowData && Array.isArray(slideshowData.value)) {
          setImages(slideshowData.value);
        }
      } catch (err) {
        console.error('Error fetching slideshow images:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [images]);

  const getCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.success("Location captured successfully!");
        setIsLocating(false);
      },
      (error) => {
        toast.error("Unable to retrieve your location. Please check your permissions.");
        setIsLocating(false);
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChildChange = (index: number, field: string, value: string) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData({ ...formData, children: newChildren });
  };

  const addChild = () => {
    if (formData.children.length >= 5) return;
    setFormData({
      ...formData,
      children: [...formData.children, { name: '', dob: '', gender: 'Male', phone: '' }]
    });
  };

  const removeChild = (index: number) => {
    const newChildren = formData.children.filter((_, i) => i !== index);
    setFormData({ ...formData, children: newChildren });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch_id) {
      toast.error("Please select a church branch.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('member_enrollment_queue').insert([
        {
          ...formData,
          status: 'Pending'
        }
      ]);
      if (error) {
        if (error.code === '42P01' || error.message.includes('not found') || error.message.includes('schema cache')) {
          throw new Error("The enrollment system is currently being initialized by the administrator. Please try again in a few minutes or contact support.");
        }
        throw error;
      }
      setIsSuccess(true);
      toast.success("Enrollment submitted for review!");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
        {/* Slideshow Background */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              <img
                src={images[currentImageIndex]}
                alt="Background"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[4px]" />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white relative z-10 rounded-[3rem] p-12 text-center shadow-2xl border-b-[12px] border-fh-green"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Submission Received</h2>
          <p className="text-slate-600 font-bold leading-relaxed mb-8">Thank you for registering with Faithhouse Chapel International. Your enrollment has been queued for administrative review. You will be contacted once approved.</p>
          <button onClick={() => window.location.reload()} className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Done</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative p-6 md:p-12 overflow-x-hidden">
      {/* Slideshow Background */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img
              src={images[currentImageIndex]}
              alt="Background"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[6px]" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Church Branding Header */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden border-4 border-fh-green p-1">
             <div className="w-full h-full bg-slate-50 rounded-[1.5rem] flex items-center justify-center overflow-hidden">
               <img 
                 src="https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH" 
                 alt="Faithhouse Logo" 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
             </div>
          </div>
          <p className="text-[10px] md:text-xs font-black text-fh-gold uppercase tracking-[0.5em] mb-2">Welcome to</p>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2">Faithhouse Chapel</h1>
          <h2 className="text-lg md:text-xl font-black text-fh-gold uppercase tracking-tighter leading-none mb-6">International</h2>
          <div className="h-1.5 w-16 bg-fh-gold rounded-full mb-8"></div>
          <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] max-w-sm">Official Membership Enrollment Portal • Your data will be secured and reviewed by the administrative board.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 flex">
            <motion.div 
              className="h-full bg-fh-green"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-fh-green uppercase tracking-tight">1. Personal Identity</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Base Identity Records</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">First Name *</label>
                      <input required name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Last Name *</label>
                      <input required name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Date of Birth</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Marital Status</label>
                      <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option>Single</option>
                        <option>Married</option>
                        <option>Widowed</option>
                        <option>Divorced</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Hometown</label>
                      <input name="hometown" value={formData.hometown} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="e.g. Kumasi" />
                    </div>
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="w-full py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Continue to Contact</button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-fh-green uppercase tracking-tight">2. Contact & Geolocation</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connectivity Protocols</p>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number *</label>
                        <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="+233..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      
                      <div className="space-y-1 relative">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Location / GPS Address</label>
                         
                         {formData.gps_address ? (
                           <div className="w-full px-6 py-4 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <MapPin className="w-4 h-4" />
                                 </div>
                                 <div>
                                   <p className="text-sm font-bold text-slate-800">Location Pinned</p>
                                   <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-bold text-emerald-600 tracking-widest">{formData.gps_address}</p>
                                      {formData.maps_url && (
                                         <a href={formData.maps_url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">View Map</a>
                                      )}
                                   </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button type="button" onClick={() => setShowMapPicker(true)} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Edit</button>
                                 <button type="button" onClick={() => setFormData(prev => ({ ...prev, gps_address: '', latitude: null, longitude: null, maps_url: '' }))} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100">Clear</button>
                              </div>
                           </div>
                         ) : (
                           <button 
                             type="button"
                             onClick={() => setShowMapPicker(true)}
                             className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-inner flex items-center gap-3 text-left"
                           >
                             <MapPin className="w-5 h-5 text-indigo-400" />
                             Pin Map Location
                           </button>
                         )}
                      </div>
                      
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Church Branch *</label>
                      <select required name="branch_id" value={formData.branch_id} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option value="">Select Local Branch...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Occupation / Profession</label>
                      <input name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                    <button type="button" onClick={() => setStep(3)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Continue to Family</button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-fh-green uppercase tracking-tight">3. Family & Household</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kinship Registry</p>
                  </div>
                  
                  {formData.marital_status === 'Married' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Spouse Name</label>
                        <input name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Spouse Phone</label>
                        <input name="spouse_phone" value={formData.spouse_phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Children Records ({formData.children.length}/5)</h4>
                      {formData.children.length < 5 && (
                        <button type="button" onClick={addChild} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-emerald-100">+ Add Record</button>
                      )}
                    </div>

                    {formData.children.map((child, idx) => (
                      <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative space-y-4">
                        <button type="button" onClick={() => removeChild(idx)} className="absolute top-4 right-4 text-slate-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input placeholder="Child Name" value={child.name} onChange={(e) => handleChildChange(idx, 'name', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                          <input type="date" value={child.dob} onChange={(e) => handleChildChange(idx, 'dob', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                          <select value={child.gender} onChange={(e) => handleChildChange(idx, 'gender', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold">
                            <option>Male</option>
                            <option>Female</option>
                          </select>
                          <input placeholder="Phone (Optional)" value={child.phone} onChange={(e) => handleChildChange(idx, 'phone', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(2)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                    <button type="button" onClick={() => setStep(4)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Continue to Emergency</button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-fh-green uppercase tracking-tight">4. Emergency Protocols</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Crisis Management Support</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Primary Emergency Contact</label>
                      <input required name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Full Name" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Relationship</label>
                        <input name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="e.g. Brother, Friend" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Emergency Relay Phone</label>
                        <input required name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="+233..." />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(3)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                    <button type="button" onClick={() => setStep(5)} className="flex-[2] py-5 bg-fh-green text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Continue to Church Life</button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-fh-green uppercase tracking-tight">5. Church Life & Baptism</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Spiritual Integration Records</p>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 text-center ${formData.water_baptised ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`} onClick={() => setFormData({...formData, water_baptised: !formData.water_baptised})}>
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.water_baptised ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-slate-100 text-slate-300'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                         </div>
                         <p className="font-black uppercase text-[10px] tracking-widest">Water Baptised</p>
                      </div>
                      <div className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 text-center ${formData.holy_ghost_baptised ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`} onClick={() => setFormData({...formData, holy_ghost_baptised: !formData.holy_ghost_baptised})}>
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.holy_ghost_baptised ? 'bg-amber-500 text-white shadow-xl shadow-amber-200' : 'bg-slate-100 text-slate-300'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         </div>
                         <p className="font-black uppercase text-[10px] tracking-widest">Holy Ghost Baptised</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Proposed Ministry / Department</label>
                      <select name="ministry" value={formData.ministry} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option value="N/A">General Member</option>
                        {ministries.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setStep(4)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center">
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : 'Finalize Enrollment'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      <MapPickerModal 
        isOpen={showMapPicker} 
        onClose={() => setShowMapPicker(false)} 
        initialCoords={formData.latitude ? { lat: formData.latitude, lng: formData.longitude! } : null}
        onConfirm={(locationData) => {
          setFormData(prev => ({
            ...prev,
            latitude: locationData.lat,
            longitude: locationData.lng,
            gps_address: locationData.gps,
            maps_url: locationData.maps_url
          }));
          setShowMapPicker(false);
        }}
      />
    </div>
  );
};

export default PublicEnrollmentView;
