
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// API Route for OAuth URL
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
  }

  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    response_type: 'code'
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// OAuth Callback Handler
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token from GitHub');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Faithhouse-CMS'
      }
    });
    const userData: any = await userResponse.json();

    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Faithhouse-CMS'
      }
    });
    const emailsData: any = await emailsResponse.json();
    const primaryEmail = emailsData.find((e: any) => e.primary)?.email || userData.email;

    res.send(`
      <html>
        <body style="background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden;">
          <div style="text-align: center; padding: 40px; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; background: rgba(255,255,255,0.02); backdrop-filter: blur(20px);">
            <div style="width: 64px; height: 64px; background: #CC923E; border-radius: 20px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#09420B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 8px; font-size: 18px;">Authorization Successful</h2>
            <p style="opacity: 0.5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 24px;">Synchronizing ${userData.login} with Faithhouse Database...</p>
            <div style="width: 100px; height: 2px; background: rgba(255,255,255,0.1); margin: 0 auto; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; left: 0; height: 100%; background: #CC923E; width: 50%; animation: slide 1.5s infinite ease-in-out;"></div>
            </div>
          </div>
          <style>
            @keyframes slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          </style>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                provider: 'github',
                user: ${JSON.stringify({
                  email: primaryEmail,
                  name: userData.name || userData.login,
                  avatar: userData.avatar_url,
                  github_id: userData.id
                })}
              }, '*');
              setTimeout(() => window.close(), 1500);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('GitHub OAuth Error:', error);
    res.status(500).send(`
      <html>
        <body style="background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2 style="color: #f86c6b;">Authentication Failed</h2>
            <p style="opacity: 0.5;">${error.message}</p>
            <button onclick="window.close()" style="background: white; color: black; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 20px;">Close Window</button>
          </div>
        </body>
      </html>
    `);
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
