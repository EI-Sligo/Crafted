export type StripeClient = any;

let stripePromise: Promise<StripeClient | null> | null = null;

export const stripeService = {
  getPublishableKey(): string {
    return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  },

  async getStripe(): Promise<StripeClient | null> {
    const key = this.getPublishableKey();
    if (!key) {
      console.warn('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not defined in environment');
      return null;
    }

    if (typeof window === 'undefined') return null;

    if ((window as any).Stripe) {
      return (window as any).Stripe(key);
    }

    if (!stripePromise) {
      stripePromise = new Promise((resolve) => {
        const existingScript = document.getElementById('stripe-js-cdn');
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            resolve((window as any).Stripe ? (window as any).Stripe(key) : null);
          });
          return;
        }

        const script = document.createElement('script');
        script.id = 'stripe-js-cdn';
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          resolve((window as any).Stripe ? (window as any).Stripe(key) : null);
        };
        script.onerror = () => {
          console.warn('[Stripe] Failed to load Stripe.js');
          resolve(null);
        };
        document.head.appendChild(script);
      });
    }

    return stripePromise;
  },

  async createCheckoutSession(params: {
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
    itemId?: string;
    userId?: string;
    userEmail?: string;
    billingCycle?: 'monthly' | 'onetime';
  }): Promise<{ sessionId: string; url: string }> {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create Stripe Checkout session');
    }

    return res.json();
  },

  async redirectToCheckout(params: {
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
    itemId?: string;
    userId?: string;
    userEmail?: string;
    billingCycle?: 'monthly' | 'onetime';
  }): Promise<void> {
    const { url } = await this.createCheckoutSession(params);
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned from Stripe');
    }
  },

  async createPortalSession(customerId: string): Promise<string> {
    const res = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to open Stripe Billing portal');
    }

    const data = await res.json();
    return data.url;
  },

  async verifySession(sessionId: string): Promise<{
    paid: boolean;
    status: string;
    customerEmail?: string;
    metadata?: any;
    amountTotal?: number;
    currency?: string;
  }> {
    const res = await fetch(`/api/stripe/verify-session?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      throw new Error('Failed to verify session status');
    }
    return res.json();
  },
};
