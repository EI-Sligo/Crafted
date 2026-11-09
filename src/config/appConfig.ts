/**
 * APPLICATION PRODUCTION & EDITION CONFIGURATION
 * 
 * Supports splitting the codebase into two distinct apps/builds:
 * - 'live': 100% Production App (connects directly to live Supabase, zero mock data, pure real users & posts)
 * - 'demo': 100% Offline Showcase App (contains pre-loaded interactive personas, jobs, classifieds, and radar alerts)
 * - 'hybrid': Preview environment allowing 1-click toggling between the pure Live and Demo apps
 */
export type AppEdition = 'live' | 'demo';

const rawEdition =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_APP_EDITION as string)) ||
  'live';

const activeEdition: AppEdition = rawEdition === 'demo' ? 'demo' : 'live';

export const APP_CONFIG = {
  // Build edition: 'live' (production published app) or 'demo' (showcase sandbox app)
  EDITION: activeEdition,

  // Only enabled when explicitly built as the demo showcase app
  ALLOW_DEMO_SANDBOX: activeEdition === 'demo',
  IS_LIVE: activeEdition === 'live',
  IS_DEMO: activeEdition === 'demo',

  // App Branding: Published app is simply "Crafted"
  APP_NAME: activeEdition === 'demo' ? 'Crafted Demo' : 'Crafted',
  APP_TAGLINE: activeEdition === 'demo' ? 'Interactive Trade Showcase' : 'The Trade Network',
  SUPPORT_EMAIL: 'support@crafted.ie',
} as const;

