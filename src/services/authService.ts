import { UserProfile } from '../types';
import { storageService } from './storage';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseService } from './supabaseService';
import { IRISH_LOCATIONS } from '../data/seedData';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEY_AUTH_DEMO = 'crafted_auth_session_demo_v2';
const STORAGE_KEY_AUTH_LIVE = 'crafted_auth_session_live_v2';

export interface AuthSession {
  isAuthenticated: boolean;
  userId: string;
  email: string;
  token: string;
}

export const authService = {
  getSession(): AuthSession {
    const isLive = storageService.getAppMode() === 'live';
    const authKey = isLive ? STORAGE_KEY_AUTH_LIVE : STORAGE_KEY_AUTH_DEMO;
    try {
      const raw = localStorage.getItem(authKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(e);
    }

    // On fresh install of the Demo Showcase build, auto-authenticate with the default showcase persona
    if (!isLive || APP_CONFIG.IS_DEMO) {
      const defaultUser = storageService.getCurrentUser();
      const defaultSession: AuthSession = {
        isAuthenticated: true,
        userId: defaultUser.id,
        email: defaultUser.email,
        token: `demo_token_${defaultUser.id}`,
      };
      this.setSession(defaultSession);
      return defaultSession;
    }

    // On fresh install of the Live build, default to unauthenticated
    return {
      isAuthenticated: false,
      userId: '',
      email: '',
      token: '',
    };
  },

  loginAsGuest(): UserProfile {
    const defaultUser = storageService.getCurrentUser();
    this.setSession({
      isAuthenticated: true,
      userId: defaultUser.id,
      email: defaultUser.email,
      token: `guest_token_${defaultUser.id}`,
    });
    return defaultUser;
  },

  setSession(session: AuthSession): void {
    const isLive = storageService.getAppMode() === 'live';
    const authKey = isLive ? STORAGE_KEY_AUTH_LIVE : STORAGE_KEY_AUTH_DEMO;
    try {
      localStorage.setItem(authKey, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  },

  getAppMode(): 'demo' | 'live' {
    return storageService.getAppMode();
  },

  setAppMode(mode: 'demo' | 'live'): void {
    storageService.setAppMode(mode);
  },

  async login(
    email: string,
    password?: string,
    mode?: 'demo' | 'live'
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const activeMode = mode || storageService.getAppMode();
    storageService.setAppMode(activeMode);

    // 1. LIVE PRODUCTION MODE (Talks to Supabase)
    if (activeMode === 'live') {
      if (!isSupabaseConfigured()) {
        return {
          success: false,
          error:
            'Live Production Mode requires a provisioned Supabase database. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in your environment, or switch to Sandbox Demo Mode to test with pre-loaded mock data.',
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'jobsite123',
        });

        if (error) {
          return { success: false, error: error.message };
        } else if (data.user) {
          const userId = data.user.id;
          let profile = await supabaseService.getProfileById(userId);

          if (!profile) {
            const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Tradesperson';
            profile = {
              id: userId,
              name: userName,
              handle: `@${userName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              trade: data.user.user_metadata?.trade || 'Electrician',
              accountType: data.user.user_metadata?.accountType === 'business' ? 'business' : 'personal',
              hasSafePass: Boolean(data.user.user_metadata?.hasSafePass ?? false),
              safePassExpiry: '',
              hasCifBadge: Boolean(data.user.user_metadata?.hasCifBadge),
              avatar: data.user.user_metadata?.avatar || '',
              phone: data.user.user_metadata?.phone || '',
              email: data.user.email || email,
              location: data.user.user_metadata?.location || IRISH_LOCATIONS[0],
              followingUserIds: [],
              followersCount: 0,
              bio: data.user.user_metadata?.bio || 'Qualified Irish tradesperson active on site.',
              yearsExperience: Number(data.user.user_metadata?.yearsExperience || 0),
              certifications: [],
              portfolio: [],
              workHistory: [],
              skills: [],
              isApprentice: Boolean(data.user.user_metadata?.isApprentice),
              apprenticePhase: data.user.user_metadata?.apprenticePhase,
              trackSolasLogbook: Boolean(data.user.user_metadata?.trackLogbook ?? true),
              solasId: data.user.user_metadata?.solasId,
            };
            await supabaseService.upsertProfile(profile);
          } else {
            // Sanitize any stale demo IDs from existing profiles
            if (Array.isArray(profile.followingUserIds)) {
              const DEMO_IDS = new Set(['usr_me', 'usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_sisk', 'usr_makita', 'usr_chloe']);
              profile.followingUserIds = profile.followingUserIds.filter((id) => !DEMO_IDS.has(id));
            }
          }

          storageService.updateCurrentUser(profile);
          this.setSession({
            isAuthenticated: true,
            userId: profile.id,
            email: profile.email,
            token: data.session?.access_token || `token_${profile.id}`,
          });

          return { success: true, user: profile };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to authenticate with Supabase' };
      }
    }

    // 2. SANDBOX DEMO MODE (Local instant mock data)
    const users = storageService.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!found) {
      const currentUser = storageService.getCurrentUser();
      storageService.updateCurrentUser(currentUser);
      this.setSession({
        isAuthenticated: true,
        userId: currentUser.id,
        email: currentUser.email,
        token: `token_${currentUser.id}`,
      });
      return { success: true, user: currentUser };
    }

    storageService.updateCurrentUser(found);
    this.setSession({
      isAuthenticated: true,
      userId: found.id,
      email: found.email,
      token: `token_${found.id}`,
    });

    return { success: true, user: found };
  },

  loginAsDemoUser(userId: string): UserProfile {
    storageService.setAppMode('demo');
    const users = storageService.getUsers();
    let user = users.find((u) => u.id === userId);
    if (!user) {
      user = storageService.getCurrentUser();
    }
    storageService.updateCurrentUser(user);
    this.setSession({
      isAuthenticated: true,
      userId: user.id,
      email: user.email,
      token: `token_${user.id}`,
    });
    return user;
  },

  async registerNewUser(
    data: {
      name: string;
      email: string;
      password?: string;
      trade: any;
      accountType: 'personal' | 'business';
      businessCategory?: any;
      phone: string;
      location: any;
    },
    mode?: 'demo' | 'live'
  ): Promise<UserProfile> {
    const activeMode = mode || storageService.getAppMode();
    storageService.setAppMode(activeMode);
    const isApprentice = data.accountType !== 'business' && data.trade.includes('Apprentice');
    const userId = `usr_${Date.now()}`;
    const newUser: UserProfile = {
      id: userId,
      name: data.name,
      handle: `@${data.name.toLowerCase().replace(/\s+/g, '_')}`,
      trade: data.trade,
      isApprentice,
      apprenticePhase: isApprentice ? 1 : undefined,
      trackSolasLogbook: isApprentice ? true : false,
      avatar: '',
      bio: `${data.name} - Verified ${
        data.accountType === 'business' ? 'Business Enterprise' : 'Irish Tradesperson'
      } specializing in ${data.trade}.`,
      phone: data.phone || '',
      email: data.email,
      location: data.location,
      yearsExperience:
        (data as any).yearsExperience !== undefined
          ? Math.max(0, Number((data as any).yearsExperience))
          : isApprentice
          ? 1
          : 0,
      hasSafePass: false,
      safePassExpiry: '',
      solasId: isApprentice ? `APP-IE-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      hasCifBadge: data.accountType === 'business',
      portfolio: [],
      workHistory: [],
      certifications: [],
      accountType: data.accountType,
      businessCategory: data.businessCategory,
      businessTier: data.accountType === 'business' ? 'employer_pro' : 'standard',
      premiumTier: data.accountType === 'business' ? 'master_contractor' : 'none',
      followingUserIds: [],
      followersCount: 0,
    };

    // 1. If Supabase is configured, register with Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password || 'jobsite123',
          options: {
            data: {
              name: data.name,
              trade: data.trade,
              accountType: data.accountType === 'business' ? 'business' : 'individual',
              phone: data.phone || '',
              town: data.location?.town || 'Dublin City',
              county: data.location?.county || 'Dublin',
              location: data.location,
              isApprentice,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (authData.user) {
          newUser.id = authData.user.id;
        }

        // Only upsert from the browser if Supabase returned an immediate active session.
        // If Email Verification is ON, authData.session is null until they click the email link,
        // so the PostgreSQL trigger (handle_new_user) creates the profile row automatically!
        if (authData.session) {
          await supabaseService.upsertProfile(newUser);
        } else {
          storageService.updateCurrentUser(newUser);
        }
      } catch (err) {
        console.warn('[Supabase Auth] Registration error, proceeding with local profile:', err);
      }
    } else {
      await supabaseService.upsertProfile(newUser);
    }

    this.setSession({
      isAuthenticated: true,
      userId: newUser.id,
      email: newUser.email,
      token: `token_${newUser.id}`,
    });

    return newUser;
  },

  async logout(): Promise<void> {
    const isLive = storageService.getAppMode() === 'live';
    if (isLive && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem(STORAGE_KEY_AUTH_LIVE);
    localStorage.removeItem(STORAGE_KEY_AUTH_DEMO);
    localStorage.removeItem('crafted_auth_session_v1');
    if (isLive) {
      localStorage.removeItem('crafted_live_current_user_v2');
    }
  },
};