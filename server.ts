
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Configuration for Backend
const SUPABASE_URL = process.env.SUPABASE_URL || "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv"; // Fallback to anon if service role not found, but service role is preferred for admin tasks
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const JWT_SECRET = process.env.JWT_SECRET || "faithhouse-super-secret-key-2024";

// Default Superuser Configuration
const DEFAULT_ADMIN = {
  email: 'systemadmin@faithhouse.com',
  password: 'FHCIone_@2024',
  role: 'System Administrator'
};

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Middleware for God-Level Access
const authorizeGodLevel = (req: any, res: any, next: any) => {
  const godRoles = ['System Administrator', 'General Overseer', 'General Administrator'];
  if (!godRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions. God-level access required.' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for default superuser if DB is empty or it's the specific email
    let user;
    const { data: dbUser, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Login DB Error:', error);
    }

    if (!dbUser && email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
      // If default admin doesn't exist in DB yet, check against hardcoded credentials
      if (password === DEFAULT_ADMIN.password) {
        // Create the user in DB on first successful login
        const hashedPassword = await bcrypt.hash(password, 10);
        const { data: newUser, error: createError } = await supabase
          .from('profiles')
          .insert([{
            email: DEFAULT_ADMIN.email,
            password_hash: hashedPassword,
            role: DEFAULT_ADMIN.role,
            first_name: 'System',
            last_name: 'Administrator',
            must_change_password: true,
            status: 'Active'
          }])
          .select()
          .single();
        
        if (createError) {
          // If insert fails (maybe table doesn't have the fields yet), still allow login but warn
          console.error('Failed to persist default admin:', createError);
          user = { ...DEFAULT_ADMIN, id: 'system-admin-temp', must_change_password: true };
        } else {
          user = newUser;
        }
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (dbUser) {
      // Verify password
      const validPassword = await bcrypt.compare(password, dbUser.password_hash || '');
      if (!validPassword) {
        // Handle lockout logic here if needed
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      user = dbUser;
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        must_change_password: user.must_change_password
      }
    });

    // Audit Log
    await supabase.from('system_logs').insert([{
      event_type: 'LOGIN_SUCCESS',
      user_email: email,
      details: `User logged in successfully. Role: ${user.role}`
    }]);

  } catch (err: any) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    // Handle temporary system admin session if DB is not yet ready
    if (req.user.id === 'system-admin-temp' || req.user.email === DEFAULT_ADMIN.email) {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', DEFAULT_ADMIN.email)
        .single();
      
      if (!error && user) {
        return res.json(user);
      }

      // Fallback to hardcoded admin if DB fetch fails
      return res.json({
        id: 'system-admin-temp',
        email: DEFAULT_ADMIN.email,
        role: DEFAULT_ADMIN.role,
        first_name: 'System',
        last_name: 'Administrator',
        must_change_password: true,
        status: 'Active'
      });
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        password_hash: hashedPassword, 
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Password updated successfully' });

    // Audit Log
    await supabase.from('system_logs').insert([{
      event_type: 'PASSWORD_CHANGE',
      user_email: req.user.email,
      details: 'User changed their password.'
    }]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, authorizeGodLevel, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, authorizeGodLevel, async (req: any, res) => {
  const { email, password, first_name, last_name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        first_name,
        last_name,
        role,
        must_change_password: true,
        status: 'Active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);

    // Audit Log
    await supabase.from('system_logs').insert([{
      event_type: 'USER_CREATED',
      user_email: req.user.email,
      details: `Created new user: ${email} with role: ${role}`
    }]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, authorizeGodLevel, async (req: any, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'User deleted successfully' });

    // Audit Log
    await supabase.from('system_logs').insert([{
      event_type: 'USER_DELETED',
      user_email: req.user.email,
      details: `Deleted user ID: ${req.params.id}`
    }]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // Dynamic import to keep production bundle clean
    const viteModule = "vite";
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    // Purge all users except the current user
app.post("/api/admin/purge-users", authenticateToken, authorizeGodLevel, async (req, res) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .neq("id", (req as any).user.id);

    if (error) throw error;

    // Log the purge event
    await supabase.from("system_logs").insert([
      {
        user_id: (req as any).user.id,
        action: "PURGE_USERS",
        details: "All users except the current administrator were purged from the directory.",
        timestamp: new Date().toISOString(),
      },
    ]);

    res.json({ message: "Directory purged successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  setupVite();
} else {
  // In Vercel production, just setup the static middleware immediately
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

export default app;
