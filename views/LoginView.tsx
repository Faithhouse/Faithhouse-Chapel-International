
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const LoginView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  useEffect(() => {
    checkTables();
  }, []);

  const checkTables = async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message.includes('not found'))) {
      setTableMissing(true);
    }
  };

  const logAuthAttempt = async (email: string, status: 'success' | 'failed', details: string) => {
    try {
      await supabase.from('system_logs').insert([{
        event_type: 'auth_attempt',
        user_email: email,
        status,
        details,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }]);
    } catch (e) {
      console.error("Logging failed:", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'request') {
        const isAdminEmail = email.toLowerCase() === 'fcbhahbtwog@gmail.com';
        
        if (isAdminEmail) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName || 'System',
                last_name: lastName || 'Administrator',
              }
            }
          });

          if (signUpError) throw signUpError;
          
          if (signUpData.user) {
            await supabase.from('profiles').upsert([{
              id: signUpData.user.id,
              email,
              first_name: firstName || 'System',
              last_name: lastName || 'Administrator',
              role: 'System Administrator',
              status: 'Active'
            }]);
            
            await logAuthAttempt(email, 'success', 'Admin account authorized');
            setSuccess("AUTHORIZATION SUCCESSFUL: Your System Administrator account has been initialized. Please check your email to confirm your identity, then return to the login portal.");
          }
        } else {
          setSuccess("ACCESS REQUEST SUBMITTED: Your request has been logged and sent to the System Administrator. You will be notified via email once your clearance is approved.");
          await logAuthAttempt(email, 'failed', `Access request submitted by ${firstName} ${lastName}`);
        }
        return;
      }

      // Standard Auth Flow
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        await logAuthAttempt(email, 'failed', authError.message);
        if (authError.message.includes("Email not confirmed")) {
          setError("SECURITY NOTICE: Your account has not been verified via email yet. Please check your inbox.");
          return;
        }
        throw authError;
      }

      // 2. Verify Profile Status
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          // Auto-repair if missing (first user)
          await supabase.from('profiles').upsert([
            {
              id: authData.user.id,
              email,
              first_name: 'Admin',
              last_name: 'User',
              role: 'System Administrator' as UserRole,
              status: 'Active'
            }
          ]);
          await logAuthAttempt(email, 'success', 'Profile auto-repaired and logged in');
        } else if (profile.status !== 'Active') {
          await supabase.auth.signOut();
          await logAuthAttempt(email, 'failed', `Account status is ${profile.status}`);
          setError(`SECURITY LOCKOUT: Your account status is currently [${profile.status}]. Please contact the System Administrator for clearance.`);
          return;
        } else {
          await logAuthAttempt(email, 'success', 'Successful login');
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (tableMissing) {
    const repairSQL = `-- ROBUST AUTH INFRASTRUCTURE REPAIR
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'General Admin',
  status TEXT DEFAULT 'Active', -- Active, Inactive, Pending
  is_mfa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_email TEXT,
  status TEXT,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.system_logs FOR ALL USING (true) WITH CHECK (true);`;

    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 text-center max-w-lg">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Security Infrastructure Reset</h2>
          <p className="text-white/40 text-xs mb-8">The internal security protocols are not initialized. Run the script below to authorize the system.</p>
          <pre className="bg-black p-6 rounded-2xl text-[10px] font-mono text-emerald-400 text-left h-48 overflow-y-auto mb-8 border border-white/5">{repairSQL}</pre>
          <button onClick={() => window.location.reload()} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">Verify Protocols</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans selection:bg-white selection:text-black">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 mb-6"
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-12 h-12 object-contain"
              onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=F&background=000&color=fff')}
            />
          </motion.div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
            Faithhouse Chapel International
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.4em]">
              Internal Secure Access Only
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold uppercase tracking-wider text-center space-y-4"
              >
                <p>{error}</p>
                {error.includes("verified via email") && (
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                      });
                      setLoading(false);
                      if (resendError) setError(resendError.message);
                      else setSuccess("Verification email resent. Please check your inbox.");
                    }}
                    className="block w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl transition-all"
                  >
                    Resend Verification Email
                  </button>
                )}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[11px] font-bold uppercase tracking-wider text-center space-y-4"
              >
                <p>{success}</p>
                {mode === 'request' && (
                  <button 
                    onClick={() => { setMode('login'); setSuccess(null); }}
                    className="block w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all"
                  >
                    Return to Login
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-6">
            {mode === 'request' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">First Name</label>
                  <input 
                    required 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Last Name</label>
                  <input 
                    required 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Authorized Email</label>
              <input 
                type="email"
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@faithhouse.church"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all placeholder:text-white/10"
              />
              {mode === 'request' && email.toLowerCase() === 'fcbhahbtwog@gmail.com' && (
                <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest ml-4 mt-1 animate-pulse">
                  Genesis Administrator Node Detected
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Security Key</label>
              <input 
                type="password"
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all placeholder:text-white/10"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
              ) : (
                mode === 'login' ? 'Authenticate Access' : 'Request Clearance'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'request' : 'login')}
              className="text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white transition-colors"
            >
              {mode === 'login' ? "Unauthorized? Request Clearance" : "Return to Secure Login"}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.6em]">
            Faithhouse Chapel International • CMS v2.0
          </p>
          <div className="flex items-center justify-center gap-4 opacity-20">
            <div className="h-[1px] w-12 bg-white/50"></div>
            <p className="text-[8px] font-black uppercase tracking-widest">Secure Terminal</p>
            <div className="h-[1px] w-12 bg-white/50"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
