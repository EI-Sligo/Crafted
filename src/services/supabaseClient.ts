import { createClient, SupabaseClient } from '@supabase/supabase-js';

function isPlaceholderValue(val?: string | null): boolean {
  if (!val) return true;
  const v = val.toLowerCase().trim();
  return (
    v === '' ||
    v.includes('your-project.supabase.co') ||
    v.includes('placeholder') ||
    v === 'your-anon-key-here' ||
    v === 'your-supabase-anon-key-here' ||
    v === 'your_supabase_anon_key' ||
    v === 'your-publishable-key-here' ||
    v === 'your-supabase-publishable-key-here' ||
    v === 'your_supabase_publishable_key'
  );
}

function sanitizeUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  let u = rawUrl.trim().replace(/^["']|["']$/g, ''); // strip quotes
  u = u.replace(/\/+$/, ''); // strip trailing slash
  if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
    u = `https://${u}`;
  }
  return u;
}

function sanitizeKey(rawKey?: string | null): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '');
}

export function getActiveSupabaseUrl(): string {
  try {
    const local = localStorage.getItem('tradenet_supabase_url');
    if (local && !isPlaceholderValue(local)) {
      return sanitizeUrl(local);
    }
  } catch {}

  const envVal = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;
  if (envVal && !isPlaceholderValue(envVal)) {
    return sanitizeUrl(envVal);
  }

  return '';
}

export function getActiveSupabaseAnonKey(): string {
  try {
    const localPub = localStorage.getItem('tradenet_supabase_publishable_key');
    if (localPub && !isPlaceholderValue(localPub)) {
      return sanitizeKey(localPub);
    }
    const localAnon = localStorage.getItem('tradenet_supabase_anon_key');
    if (localAnon && !isPlaceholderValue(localAnon)) {
      return sanitizeKey(localAnon);
    }
    const localKey = localStorage.getItem('tradenet_supabase_key');
    if (localKey && !isPlaceholderValue(localKey)) {
      return sanitizeKey(localKey);
    }
  } catch {}

  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as any);

  // Modern Supabase Publishable Key (sbp_...)
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (publishableKey && !isPlaceholderValue(publishableKey)) {
    return sanitizeKey(publishableKey);
  }

  // Standard / Legacy Supabase Anon Key (eyJ...)
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (anonKey && !isPlaceholderValue(anonKey)) {
    return sanitizeKey(anonKey);
  }

  // Generic key fallback
  const genericKey = env.VITE_SUPABASE_KEY as string | undefined;
  if (genericKey && !isPlaceholderValue(genericKey)) {
    return sanitizeKey(genericKey);
  }

  return '';
}

// Modern and legacy aliases
export const getActiveSupabaseKey = getActiveSupabaseAnonKey;
export const getActiveSupabasePublishableKey = getActiveSupabaseAnonKey;

/**
 * Checks whether valid Supabase configuration is present in the environment or runtime storage.
 */
export function isSupabaseConfigured(): boolean {
  const url = getActiveSupabaseUrl();
  const anonKey = getActiveSupabaseAnonKey();

  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !isPlaceholderValue(url) &&
    !isPlaceholderValue(anonKey)
  );
}

/**
 * Returns diagnostic metadata about current Supabase credentials.
 */
export function getSupabaseConfigDiagnostics() {
  const url = getActiveSupabaseUrl();
  const anonKey = getActiveSupabaseAnonKey();
  const hasBuildEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && !isPlaceholderValue(import.meta.env.VITE_SUPABASE_URL));
  let source: 'localStorage' | 'env' | 'none' = 'none';

  try {
    const local = localStorage.getItem('tradenet_supabase_url');
    if (local && !isPlaceholderValue(local)) source = 'localStorage';
    else if (hasBuildEnv) source = 'env';
  } catch {}

  return {
    isConfigured: isSupabaseConfigured(),
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasBuildEnv,
    source,
    urlPreview: url ? (url.length > 28 ? url.substring(0, 25) + '...' : url) : '(not set)',
    keyPreview: anonKey ? `${anonKey.substring(0, 8)}...${anonKey.substring(anonKey.length - 4)}` : '(not set)',
  };
}

function initClient(): SupabaseClient {
  const configured = isSupabaseConfigured();
  const url = configured ? getActiveSupabaseUrl() : 'https://placeholder.supabase.co';
  const key = configured ? getActiveSupabaseAnonKey() : 'placeholder-anon-key';

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let activeClient: SupabaseClient = initClient();

/**
 * Dynamically updates credentials at runtime, persisting to localStorage and refreshing the client.
 */
export function updateSupabaseCredentials(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = sanitizeUrl(url);
    const cleanKey = sanitizeKey(anonKey);

    if (cleanUrl && cleanKey && !isPlaceholderValue(cleanUrl) && !isPlaceholderValue(cleanKey)) {
      localStorage.setItem('tradenet_supabase_url', cleanUrl);
      localStorage.setItem('tradenet_supabase_publishable_key', cleanKey);
      localStorage.setItem('tradenet_supabase_anon_key', cleanKey);
    } else {
      localStorage.removeItem('tradenet_supabase_url');
      localStorage.removeItem('tradenet_supabase_publishable_key');
      localStorage.removeItem('tradenet_supabase_anon_key');
      localStorage.removeItem('tradenet_supabase_key');
    }
    activeClient = initClient();
    return true;
  } catch (e) {
    console.error('Failed to update Supabase credentials', e);
    return false;
  }
}

/**
 * Real-time probe to test connection to Supabase database.
 */
export async function testSupabaseConnection(
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; userCount?: number }> {
  try {
    const targetUrl = testUrl !== undefined ? sanitizeUrl(testUrl) : getActiveSupabaseUrl();
    const targetKey = testKey !== undefined ? sanitizeKey(testKey) : getActiveSupabaseAnonKey();

    if (!targetUrl || !targetKey || isPlaceholderValue(targetUrl) || isPlaceholderValue(targetKey)) {
      return {
        success: false,
        message: 'Please provide both your Supabase Project URL and Anon/Public Key.',
      };
    }

    const client = createClient(targetUrl, targetKey, {
      auth: { persistSession: false },
    });

    // Probe 1: Check if 'profiles' table exists and query count
    const { count, error } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.profiles" does not exist') || error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but the "profiles" table was not found. Please run the script in SUPABASE_SCHEMA.md in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase error (${error.code || 'API'}): ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to live Supabase database!',
      userCount: count || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network connection to Supabase failed.',
    };
  }
}

/**
 * Shared Supabase Client instance for Crafted TradeNet.
 * Proxied so that updating credentials at runtime will instantly route all database/auth calls to the new client,
 * with function binding preserved.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const val = (activeClient as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  },
});

export default supabase;
