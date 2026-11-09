import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'server_data.json');

// Initial default data if file doesn't exist
const initialServerData = {
  posts: [],
  jobs: [],
  marketplace: [],
  users: [],
  stolenAlerts: [],
  conversations: [],
  messages: [],
  comments: {},
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading server data:', e);
  }
  return initialServerData;
}

function saveData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving server data:', e);
  }
}

let db = loadData();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Simple IP-based rate limiter middleware
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 120; // 120 requests per minute per IP

  const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
      rateLimitMap.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Too many requests, please try again in a minute.',
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };

  app.use('/api/', apiRateLimiter);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Posts API
  app.get('/api/posts', (req, res) => {
    res.json(db.posts || []);
  });

  app.post('/api/posts', (req, res) => {
    const newPost = {
      id: 'post_' + Date.now() + Math.random().toString(36).substr(2, 5),
      createdAt: 'Just now',
      likesCount: 0,
      likedByCurrentUser: false,
      viewsCount: 1,
      ...req.body,
    };
    db.posts = [newPost, ...(db.posts || [])];
    saveData(db);
    res.json(newPost);
  });

  app.delete('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    db.posts = (db.posts || []).filter((p: any) => p.id !== id);
    saveData(db);
    res.json({ success: true });
  });

  app.post('/api/posts/:id/like', (req, res) => {
    const { id } = req.params;
    const post = (db.posts || []).find((p: any) => p.id === id);
    if (post) {
      post.likedByCurrentUser = !post.likedByCurrentUser;
      post.likesCount += post.likedByCurrentUser ? 1 : -1;
      saveData(db);
      res.json(post);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  app.get('/api/posts/:id/comments', (req, res) => {
    const { id } = req.params;
    res.json(db.comments?.[id] || []);
  });

  app.post('/api/posts/:id/comments', (req, res) => {
    const { id } = req.params;
    const comment = {
      id: 'comm_' + Date.now(),
      postId: id,
      createdAt: 'Just now',
      ...req.body,
    };
    if (!db.comments) db.comments = {};
    if (!db.comments[id]) db.comments[id] = [];
    db.comments[id].push(comment);
    saveData(db);
    res.json(comment);
  });

  // Jobs API
  app.get('/api/jobs', (req, res) => {
    res.json(db.jobs || []);
  });

  app.post('/api/jobs', (req, res) => {
    const newJob = {
      id: 'job_' + Date.now(),
      createdAt: 'Just now',
      applicationsCount: 0,
      ...req.body,
    };
    db.jobs = [newJob, ...(db.jobs || [])];
    saveData(db);
    res.json(newJob);
  });

  app.delete('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    db.jobs = (db.jobs || []).filter((j: any) => j.id !== id);
    saveData(db);
    res.json({ success: true });
  });

  // Marketplace API
  app.get('/api/marketplace', (req, res) => {
    res.json(db.marketplace || []);
  });

  app.post('/api/marketplace', (req, res) => {
    const newItem = {
      id: 'item_' + Date.now(),
      createdAt: 'Just now',
      ...req.body,
    };
    db.marketplace = [newItem, ...(db.marketplace || [])];
    saveData(db);
    res.json(newItem);
  });

  // Stolen Alerts API
  app.get('/api/stolen-alerts', (req, res) => {
    res.json(db.stolenAlerts || []);
  });

  app.post('/api/stolen-alerts', (req, res) => {
    const alert = {
      id: 'alert_' + Date.now(),
      createdAt: 'Just now',
      ...req.body,
    };
    db.stolenAlerts = [alert, ...(db.stolenAlerts || [])];
    saveData(db);
    res.json(alert);
  });

  // ==========================================
  // STRIPE BILLING & PAYMENTS API
  // ==========================================
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

  app.get('/api/stripe/config', (req, res) => {
    res.json({
      configured: Boolean(stripe),
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
      currency: 'eur',
    });
  });

  // Create Checkout Session for One-Time Payments (Boosts, Stolen Alerts, Job Ads) or Recurring Billing Subscriptions
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured with STRIPE_SECRET_KEY' });
    }

    try {
      const {
        title = 'Crafted Placement',
        priceEuros = 4.99,
        type = 'boost',
        itemId = '',
        userId = 'usr_anonymous',
        userEmail = '',
        billingCycle = 'onetime',
      } = req.body;

      const isSubscription = billingCycle === 'monthly' || type === 'subscription';
      const unitAmountCents = Math.round(Number(priceEuros) * 100);

      // Determine client base URL
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: title,
                description: `Crafted TradeNet Ireland • ${type.toUpperCase()} Placement`,
                images: [
                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
                ],
                tax_code: 'txcd_10000000',
              },
              unit_amount: unitAmountCents,
              ...(isSubscription ? { recurring: { interval: 'month' } } : {}),
            },
            quantity: 1,
          },
        ],
        mode: isSubscription ? 'subscription' : 'payment',
        customer_email: userEmail || undefined,
        metadata: {
          userId,
          type,
          itemId,
          title,
        },
        success_url: `${origin}/?stripe_success=true&session_id={CHECKOUT_SESSION_ID}&type=${encodeURIComponent(type)}&item_id=${encodeURIComponent(itemId)}`,
        cancel_url: `${origin}/?stripe_cancelled=true`,
        managed_payments: { enabled: false },
      } as any);

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (err: any) {
      console.error('[Stripe] Error creating checkout session:', err);
      res.status(500).json({ error: err.message || 'Failed to create Stripe Checkout session' });
    }
  });

  // Create Customer Billing Portal Session
  app.post('/api/stripe/create-portal-session', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    try {
      const { customerId, returnUrl } = req.body;
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:3000';

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || origin,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error('[Stripe] Error creating billing portal session:', err);
      res.status(500).json({ error: err.message || 'Failed to create Customer Portal session' });
    }
  });

  // Verify Checkout Session
  app.get('/api/stripe/verify-session', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId parameter is required' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json({
        paid: session.payment_status === 'paid',
        status: session.status,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
    } catch (err: any) {
      console.error('[Stripe] Error verifying session:', err);
      res.status(500).json({ error: err.message || 'Failed to verify session' });
    }
  });

  // Vite middleware setup in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Backend Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer();
