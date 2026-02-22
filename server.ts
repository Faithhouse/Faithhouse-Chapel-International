
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for OAuth URL
  app.get('/api/auth/github/url', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
    }

    // Use window.location.origin on client side to construct redirect_uri
    // but here we can just return the base URL
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
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    // In a real app, you'd exchange the code for a token here.
    // For this bridge, we'll just send the success message back to the opener.
    // The client-side will then handle the Supabase session if needed, 
    // or we can just acknowledge the "bridge" is active.
    
    res.send(`
      <html>
        <body style="background: #050505; color: white; font-family: sans-serif; display: flex; items-center; justify-center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Authorization Successful</h2>
            <p style="opacity: 0.5; font-size: 12px; text-transform: uppercase;">Synchronizing with Faithhouse Vault...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'github' }, '*');
                setTimeout(() => window.close(), 1000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
