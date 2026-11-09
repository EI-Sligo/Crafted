import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  UserProfile,
  Post,
  PostComment,
  MarketplaceItem,
  JobListing,
  StolenGearAlert,
  Conversation,
  ChatMessage,
  PricingTier,
  CourseListing,
} from '../types';
import { storageService } from './storage';

/**
 * Helper to resolve the active authenticated Supabase user UUID,
 * falling back to the provided ID if offline or in local demo mode.
 */
async function resolveAuthUserId(fallbackId?: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        return authData.user.id;
      }
    } catch (e) {
      console.warn('[Supabase] Auth session check warning:', e);
    }
  }
  return fallbackId || storageService.getCurrentUser()?.id || '';
}

/**
 * Supabase Data Mapper: converts snake_case database rows to TypeScript application models.
 */
export const supabaseMappers = {
  profileFromRow(row: any): UserProfile {
    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      trade: row.trade,
      accountType: row.account_type === 'business' ? 'business' : 'personal',
      businessCategory: row.business_category || undefined,
      businessTier: row.business_tier || 'standard',
      premiumTier: row.premium_tier || 'none',
      hasSafePass: Boolean(row.has_safe_pass),
      safePassExpiry: row.safe_pass_expiry || 'May 2028',
      isApprentice: Boolean(row.is_apprentice),
      trackSolasLogbook: row.track_logbook ?? true,
      solasId: row.solas_id || undefined,
      apprenticePhase: row.apprentice_phase
        ? parseInt(String(row.apprentice_phase).replace(/\D/g, ''), 10) || undefined
        : undefined,
      yearsExperience: row.years_experience || 0,
      avatar: row.avatar_url || '',
      bio: row.bio || '',
      location: {
        town: row.town || 'Dublin City',
        county: row.county || 'Dublin',
        country: row.country || undefined,
        countryCode: row.country_code || undefined,
        latitude: Number(row.latitude) || 53.3498,
        longitude: Number(row.longitude) || -6.2603,
      },
      hasCifBadge: Boolean(row.has_cif_badge),
      followersCount: row.followers_count || 0,
      followingUserIds: Array.isArray(row.following_user_ids) ? row.following_user_ids : [],
      phone: row.phone || '',
      email: row.email || '',
      portfolio: Array.isArray(row.portfolio) ? row.portfolio : [],
      workHistory: Array.isArray(row.work_history) ? row.work_history : [],
      skills: Array.isArray(row.skills) ? row.skills : [],
    };
  },

  profileToRow(profile: UserProfile): Record<string, any> {
    const row: Record<string, any> = {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      trade: profile.trade || 'Electrician',
      account_type: profile.accountType === 'business' ? 'business' : 'individual',
      business_category: profile.businessCategory || null,
      business_tier: profile.businessTier || 'standard',
      premium_tier: profile.premiumTier || 'none',
      has_safe_pass: Boolean(profile.hasSafePass),
      safe_pass_expiry: profile.safePassExpiry || 'May 2028',
      solas_id: profile.solasId || null,
      apprentice_phase: profile.apprenticePhase ? `Phase ${profile.apprenticePhase}` : null,
      years_experience: profile.yearsExperience || 0,
      avatar_url: profile.avatar || null,
      bio: profile.bio || '',
      phone: profile.phone || '',
      email: profile.email || '',
      town: profile.location?.town || 'Dublin City',
      county: profile.location?.county || 'Dublin',
      latitude: profile.location?.latitude ?? 53.3498,
      longitude: profile.location?.longitude ?? -6.2603,
      has_cif_badge: Boolean(profile.hasCifBadge),
      followers_count: profile.followersCount || 0,
      following_user_ids: profile.followingUserIds || [],
      is_apprentice: Boolean(profile.isApprentice),
      track_logbook: profile.trackSolasLogbook ?? true,
      portfolio: profile.portfolio || [],
      work_history: profile.workHistory || [],
      skills: profile.skills || [],
    };

    if (profile.location?.country !== undefined) {
      row.country = profile.location.country;
    }
    if (profile.location?.countryCode !== undefined) {
      row.country_code = profile.location.countryCode;
    }

    return row;
  },

  postFromRow(row: any, authorProfile?: any): Post {
    return {
      id: row.id,
      userId: row.user_id,
      userName: authorProfile?.name || row.user_name || 'Verified Tradesperson',
      userHandle: authorProfile?.handle || row.user_handle || '@trader',
      userAvatar:
        authorProfile?.avatar_url ||
        row.user_avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      userTrade: authorProfile?.trade || row.trade_tag || 'Electrician',
      userHasSafePass: authorProfile ? Boolean(authorProfile.has_safe_pass) : true,
      userApprenticePhase: authorProfile?.apprentice_phase
        ? parseInt(String(authorProfile.apprentice_phase).replace(/\D/g, ''), 10)
        : undefined,
      content: row.content,
      tradeTag: row.trade_tag || 'Electrician',
      mediaType: row.media_type || 'none',
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
      videoDurationSeconds: row.video_duration_seconds ? Number(row.video_duration_seconds) : undefined,
      likes: row.likes_count || 0,
      likesCount: row.likes_count || 0,
      likedByCurrentUser: false,
      viewsCount: row.views_count || 1,
      commentsCount: row.comments_count || 0,
      createdAt: row.created_at
        ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now',
      location: {
        town: row.town || 'Dublin City',
        county: row.county || 'Dublin',
        latitude: Number(row.latitude) || 53.3498,
        longitude: Number(row.longitude) || -6.2603,
      },
    };
  },

  postToRow(post: Partial<Post> & { userId: string; content: string; tradeTag: any }): Record<string, any> {
    return {
      user_id: post.userId,
      content: post.content,
      trade_tag: post.tradeTag || 'Electrician',
      media_type: post.mediaType || 'none',
      media_urls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
      video_duration_seconds: post.videoDurationSeconds || null,
      likes_count: post.likesCount || 0,
      views_count: post.viewsCount || 1,
      comments_count: 0,
      town: post.location?.town || 'Dublin City',
      county: post.location?.county || 'Dublin',
      latitude: post.location?.latitude ?? 53.3498,
      longitude: post.location?.longitude ?? -6.2603,
    };
  },

  jobFromRow(row: any, employerProfile?: any): JobListing {
    return {
      id: row.id,
      employerId: row.employer_id,
      employerName: employerProfile?.name || row.employer_name || 'Site Contractor',
      employerAvatar:
        employerProfile?.avatar_url ||
        row.employer_avatar ||
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
      employerTrade: employerProfile?.trade || row.trade || 'Electrician',
      employerCompany: employerProfile?.name || row.employer_company || 'Contracting Services',
      hasSafePassRequired: Boolean(row.has_safe_pass_required),
      title: row.title,
      jobType: row.job_type || 'Qualified Hire',
      trade: row.trade || 'Electrician',
      targetApprenticePhase: row.target_apprentice_phase || undefined,
      description: row.description,
      location: {
        town: row.town || 'Dublin City',
        county: row.county || 'Dublin',
        latitude: Number(row.latitude) || 53.3498,
        longitude: Number(row.longitude) || -6.2603,
      },
      rateText: row.rate_text || 'Competitive Site Rate',
      rateType: row.rate_type || 'hourly',
      rateAmount: Number(row.rate_amount) || 0,
      tier: row.tier || (row.is_featured ? 'priority' : 'basic'),
      isFeatured: Boolean(row.is_featured),
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Just now',
      applicationsCount: row.applications_count || 0,
    };
  },

  jobToRow(job: Omit<JobListing, 'id' | 'createdAt' | 'applicationsCount'>): Record<string, any> {
    return {
      employer_id: job.employerId,
      title: job.title,
      job_type: job.jobType || 'Qualified Hire',
      trade: job.trade || 'Electrician',
      target_apprentice_phase: job.targetApprenticePhase ? String(job.targetApprenticePhase) : null,
      description: job.description,
      rate_text: job.rateText || 'Competitive Site Rate',
      rate_type: job.rateType || 'hourly',
      rate_amount: job.rateAmount ?? null,
      duration: (job as any).duration || 'Immediate - 6 Months',
      has_safe_pass_required: Boolean(job.hasSafePassRequired),
      town: job.location?.town || 'Dublin City',
      county: job.location?.county || 'Dublin',
      latitude: job.location?.latitude ?? 53.3498,
      longitude: job.location?.longitude ?? -6.2603,
      tier: job.tier || (job.isFeatured ? 'priority' : 'basic'),
      is_featured: Boolean(job.isFeatured),
    };
  },

  marketplaceItemFromRow(row: any, sellerProfile?: any): MarketplaceItem {
    return {
      id: row.id,
      sellerId: row.seller_id,
      sellerName: sellerProfile?.name || 'Verified Trader',
      sellerAvatar:
        sellerProfile?.avatar_url ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      sellerTrade: sellerProfile?.trade || 'Electrician',
      sellerPhone: sellerProfile?.phone || '087 123 4567',
      title: row.title,
      description: row.description,
      price: Number(row.price_euros ?? row.price ?? 0),
      category: row.category || 'Tools',
      condition: row.condition || 'Good Working Order',
      location: {
        town: row.town || 'Dublin City',
        county: row.county || 'Dublin',
        latitude: Number(row.latitude) || 53.3498,
        longitude: Number(row.longitude) || -6.2603,
      },
      images: Array.isArray(row.images) ? row.images : row.image_url ? [row.image_url] : [],
      tier: row.tier || 'standard',
      isBoosted: Boolean(row.is_boosted),
      isSold: Boolean(row.is_sold),
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Just now',
    };
  },

  marketplaceItemToRow(item: Omit<MarketplaceItem, 'id' | 'createdAt'>): Record<string, any> {
    return {
      seller_id: item.sellerId,
      title: item.title,
      category: item.category || 'Tools',
      price_euros: Number(item.price) || 0,
      condition: item.condition || 'Good Working Order',
      description: item.description,
      images: Array.isArray(item.images) ? item.images : [],
      town: item.location?.town || 'Dublin City',
      county: item.location?.county || 'Dublin',
      latitude: item.location?.latitude ?? 53.3498,
      longitude: item.location?.longitude ?? -6.2603,
      tier: item.tier || 'standard',
      is_boosted: Boolean(item.isBoosted),
    };
  },
};

function handleSupabaseError(err: any, context: string) {
  if (err?.code === 'PGRST205' || err?.message?.includes('schema cache') || err?.message?.includes('does not exist')) {
    console.warn(
      `[Supabase Note] Tables not created yet (${context}). Operating in Local-First mode. Run SUPABASE_SCHEMA.md in your Supabase SQL editor.`
    );
    return;
  }
  console.warn(`[Supabase Warning] ${context}:`, err?.message || err);
}

/**
 * Supabase Service with Local-First fallback to storageService.
 */
export const supabaseService = {
  // ==========================================
  // 1. PROFILES (Users)
  // ==========================================
  async getProfiles(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getUsers();
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      if (data) {
        return data.map(supabaseMappers.profileFromRow);
      }
    } catch (err) {
      handleSupabaseError(err, 'getProfiles');
    }
    return storageService.getUsers();
  },

  async searchProfiles(query: string): Promise<UserProfile[]> {
    const q = query.trim().toLowerCase();
    if (!isSupabaseConfigured()) {
      const allUsers = storageService.getUsers();
      if (!q) return allUsers;
      return allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q) ||
          u.trade.toLowerCase().includes(q) ||
          u.location.town.toLowerCase().includes(q) ||
          u.location.county.toLowerCase().includes(q)
      );
    }
    try {
      let queryBuilder = supabase.from('profiles').select('*');
      if (q) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${q}%,handle.ilike.%${q}%,town.ilike.%${q}%,county.ilike.%${q}%`
        );
      }
      const { data, error } = await queryBuilder.limit(40);
      if (error) throw error;
      if (data) {
        return data.map(supabaseMappers.profileFromRow);
      }
    } catch (err) {
      handleSupabaseError(err, 'searchProfiles');
    }
    const allUsers = storageService.getUsers();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.trade.toLowerCase().includes(q) ||
        u.location.town.toLowerCase().includes(q) ||
        u.location.county.toLowerCase().includes(q)
    );
  },

  async getProfileById(userId: string): Promise<UserProfile | undefined> {
    if (!isSupabaseConfigured()) {
      return storageService.getUserById(userId);
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) return supabaseMappers.profileFromRow(data);
    } catch (err) {
      handleSupabaseError(err, 'getProfileById');
    }
    return storageService.getUserById(userId);
  },

  async upsertProfile(profile: UserProfile): Promise<void> {
    storageService.updateCurrentUser(profile);

    if (!isSupabaseConfigured()) return;
    try {
      const activeId = await resolveAuthUserId(profile.id);
      const updatedProfile = { ...profile, id: activeId };
      const row = supabaseMappers.profileToRow(updatedProfile);
      const { error } = await supabase.from('profiles').upsert(row);
      if (error) throw error;
    } catch (err) {
      handleSupabaseError(err, 'upsertProfile');
    }
  },

  // ==========================================
  // 2, 3, 4. POSTS, COMMENTS & POST LIKES
  // ==========================================
  async getPosts(): Promise<Post[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getPosts();
    }
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (name, handle, avatar_url, trade, has_safe_pass, apprentice_phase)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const posts = data.map((row) => supabaseMappers.postFromRow(row, row.profiles));
        try {
          const isLive = storageService.getAppMode() === 'live';
          const cacheKey = isLive ? 'crafted_live_posts_v2' : 'crafted_posts_v3';
          localStorage.setItem(cacheKey, JSON.stringify(posts));
        } catch (e) {
          console.error(e);
        }
        return posts;
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch posts, using local cache:', err);
    }
    return storageService.getPosts();
  },

  async createPost(postData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'commentsCount'>): Promise<Post> {
    const authorId = await resolveAuthUserId(postData.userId);

    const payload = {
      ...postData,
      userId: authorId,
    };

    const localPost = storageService.createPost(payload);
    if (!isSupabaseConfigured()) return localPost;

    try {
      const row = {
        ...supabaseMappers.postToRow(payload),
        user_id: authorId,
      };

      const { data, error } = await supabase.from('posts').insert(row).select().single();
      if (error) {
        console.warn('[Supabase RLS Note] Post created locally; Supabase sync skipped:', error.message);
      } else if (data) {
        const oldId = localPost.id;
        localPost.id = data.id;
        storageService.updatePostId(oldId, data.id);
      }
    } catch (err: any) {
      console.warn('[Supabase] Post created locally; Supabase sync error:', err?.message || err);
    }

    return localPost;
  },

  async deletePost(postId: string): Promise<void> {
    storageService.deletePost(postId);
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Error deleting post:', err);
    }
  },

  async editPost(postId: string, content: string): Promise<void> {
    storageService.editPost(postId, content);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('posts').update({ content }).eq('id', postId);
    } catch (err) {
      console.warn('[Supabase] Edit post sync note:', err);
    }
  },

  async toggleLikePost(postId: string): Promise<void> {
    storageService.toggleLikePost(postId);
    if (!isSupabaseConfigured()) return;

    try {
      const userId = await resolveAuthUserId();
      if (!userId) return;

      // Check if user already liked this post in post_likes table
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLike?.id) {
        await supabase.from('post_likes').delete().eq('id', existingLike.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      }

      // Sync total count on post if author or permitted
      const post = storageService.getPosts().find((p) => p.id === postId);
      if (post) {
        await supabase.from('posts').update({ likes_count: post.likesCount }).eq('id', postId);
      }
    } catch (err) {
      console.error('[Supabase] Error toggling post like:', err);
    }
  },

  async getComments(postId: string): Promise<PostComment[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getCommentsForPost(postId);
    }
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (name, avatar_url, trade)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        return data.map((r: any) => ({
          id: r.id,
          postId: r.post_id,
          userId: r.user_id,
          userName: r.profiles?.name || 'Tradesperson',
          userAvatar:
            r.profiles?.avatar_url ||
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          userTrade: r.profiles?.trade || 'Electrician',
          text: r.content || r.text,
          createdAt: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching comments:', err);
    }
    return storageService.getCommentsForPost(postId);
  },

  async addComment(postId: string, text: string): Promise<PostComment> {
    const currentUserId = await resolveAuthUserId(storageService.getCurrentUser()?.id);

    const localComment = storageService.addComment(postId, text);
    if (!isSupabaseConfigured()) return localComment;

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: text,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        localComment.id = data.id;
      }
    } catch (err) {
      console.error('[Supabase] Error inserting comment:', err);
    }

    return localComment;
  },

  async editComment(commentId: string, text: string): Promise<void> {
    storageService.editComment(commentId, text);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('post_comments').update({ content: text }).eq('id', commentId);
    } catch (err) {
      console.warn('[Supabase] Edit comment sync note:', err);
    }
  },

  async deleteComment(commentId: string): Promise<void> {
    storageService.deleteComment(commentId);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('post_comments').delete().eq('id', commentId);
    } catch (err) {
      console.warn('[Supabase] Delete comment sync note:', err);
    }
  },

  // ==========================================
  // 5. JOBS (Active Job Board & Subcontract)
  // ==========================================
  async getJobs(): Promise<JobListing[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getJobs();
    }
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles:employer_id (name, avatar_url, trade)
        `)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((r) => supabaseMappers.jobFromRow(r, r.profiles));
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch jobs:', err);
    }
    return storageService.getJobs();
  },

  async createJob(jobData: Omit<JobListing, 'id' | 'createdAt' | 'applicationsCount'>): Promise<JobListing> {
    const employerId = await resolveAuthUserId(jobData.employerId);

    const payload = { ...jobData, employerId };
    const localJob = storageService.createJob(payload);
    if (!isSupabaseConfigured()) return localJob;

    try {
      const row = {
        ...supabaseMappers.jobToRow(payload),
        employer_id: employerId,
      };

      const { data, error } = await supabase.from('jobs').insert(row).select().single();
      if (error) {
        console.warn('[Supabase RLS Note] Job created locally; Supabase sync skipped:', error.message);
      } else if (data) {
        localJob.id = data.id;
      }
    } catch (err: any) {
      console.warn('[Supabase] Job created locally; Supabase sync error:', err?.message || err);
    }

    return localJob;
  },

  async deleteJob(jobId: string): Promise<void> {
    storageService.deleteJob(jobId);
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Error deleting job:', err);
    }
  },

  async editJob(jobId: string, updatedData: Partial<JobListing>): Promise<void> {
    storageService.editJob(jobId, updatedData);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase
        .from('jobs')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          rate_text: updatedData.rateText,
          rate_amount: updatedData.rateAmount,
        })
        .eq('id', jobId);
    } catch (err) {
      console.warn('[Supabase] Edit job sync note:', err);
    }
  },

  // ==========================================
  // 6. MARKETPLACE ITEMS (Classifieds)
  // ==========================================
  async getMarketplaceItems(): Promise<MarketplaceItem[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getMarketplaceItems();
    }
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          profiles:seller_id (name, avatar_url, trade, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return data.map((r) => supabaseMappers.marketplaceItemFromRow(r, r.profiles));
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch marketplace items:', err);
    }
    return storageService.getMarketplaceItems();
  },

  async createMarketplaceItem(itemData: Omit<MarketplaceItem, 'id' | 'createdAt'>): Promise<MarketplaceItem> {
    const sellerId = await resolveAuthUserId(itemData.sellerId);

    const payload = { ...itemData, sellerId };
    const localItem = storageService.createMarketplaceItem(payload);
    if (!isSupabaseConfigured()) return localItem;

    try {
      const row = {
        ...supabaseMappers.marketplaceItemToRow(payload),
        seller_id: sellerId,
      };

      const { data, error } = await supabase.from('marketplace_items').insert(row).select().single();
      if (error) {
        console.warn('[Supabase RLS Note] Classified created locally; Supabase sync skipped:', error.message);
      } else if (data) {
        localItem.id = data.id;
      }
    } catch (err: any) {
      console.warn('[Supabase] Classified created locally; Supabase sync error:', err?.message || err);
    }

    return localItem;
  },

  async deleteMarketplaceItem(itemId: string): Promise<void> {
    storageService.deleteMarketplaceItem(itemId);
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('marketplace_items').delete().eq('id', itemId);
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Error deleting marketplace item:', err);
    }
  },

  async editMarketplaceItem(itemId: string, updatedData: Partial<MarketplaceItem>): Promise<void> {
    storageService.editMarketplaceItem(itemId, updatedData);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase
        .from('marketplace_items')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          price_euros: updatedData.price,
          condition: updatedData.condition,
        })
        .eq('id', itemId);
    } catch (err) {
      console.warn('[Supabase] Edit marketplace item sync note:', err);
    }
  },

  // ==========================================
  // 7. COURSES & TRAINING
  // ==========================================
  async getCourses(): Promise<CourseListing[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getCourses();
    }
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:provider_id (name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return data.map((r: any) => ({
          id: r.id,
          providerId: r.provider_id,
          providerName: r.profiles?.name || r.provider_name || 'Training Provider',
          providerAvatar: r.profiles?.avatar_url || r.provider_avatar || '',
          providerType: r.provider_type || 'Verified Training Provider',
          title: r.title,
          category: r.category || 'Up-skilling & Certification',
          description: r.description || `${r.title} (${r.duration || '2 Days'})`,
          durationText: r.duration || r.duration_text || '2 Days',
          costText: r.cost_text || '€250',
          costAmount: Number(String(r.cost_text || '250').replace(/[^0-9.]/g, '')) || 250,
          location: {
            town: r.town || 'Dublin City',
            county: r.county || 'Dublin',
            latitude: Number(r.latitude) || 53.3498,
            longitude: Number(r.longitude) || -6.2603,
          },
          startDate: r.start_date || 'Upcoming',
          contactEmail: r.contact_email || '',
          contactPhone: r.contact_phone || '',
          isFree: Boolean(r.is_free),
          createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Just now',
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching courses:', err);
    }
    return storageService.getCourses();
  },

  async createCourse(courseData: Omit<CourseListing, 'id' | 'createdAt'>): Promise<CourseListing> {
    const providerId = await resolveAuthUserId(courseData.providerId);

    const payload = { ...courseData, providerId };
    const localCourse = storageService.createCourse(payload);
    if (!isSupabaseConfigured()) return localCourse;

    try {
      // Aligned strictly with public.courses SQL columns
      const { data, error } = await supabase
        .from('courses')
        .insert({
          provider_id: providerId,
          title: payload.title,
          category: payload.category || 'Up-skilling & Certification',
          duration: payload.durationText || '2 Days',
          cost_text: payload.costText || '€250',
          is_free: Boolean(payload.isFree),
          town: payload.location?.town || 'Dublin City',
          county: payload.location?.county || 'Dublin',
          contact_email: payload.contactEmail || '',
          contact_phone: payload.contactPhone || '',
        })
        .select()
        .single();

      if (error) {
        console.warn('[Supabase RLS Note] Course created locally; Supabase sync skipped:', error.message);
      } else if (data) {
        localCourse.id = data.id;
      }
    } catch (err: any) {
      console.warn('[Supabase] Course created locally; Supabase sync error:', err?.message || err);
    }
    return localCourse;
  },

  async deleteCourse(courseId: string): Promise<void> {
    storageService.deleteCourse(courseId);
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Error deleting course:', err);
    }
  },

  // ==========================================
  // 8 & 9. CONVERSATIONS & MESSAGES
  // ==========================================
  async getConversations(userId?: string): Promise<Conversation[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getConversations();
    }
    try {
      const targetUserId = await resolveAuthUserId(userId);

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [targetUserId])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          participantIds: r.participant_ids || [],
          participantNames: {},
          participantAvatars: {},
          participantTrades: {},
          lastMessage: r.last_message_text || r.last_message || 'Active conversation',
          lastMessageTime:
            r.last_message_time || r.updated_at
              ? new Date(r.last_message_time || r.updated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently',
          unreadCount: r.unread_count || 0,
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching conversations:', err);
    }
    return storageService.getConversations();
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getMessages(conversationId);
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        return data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.profiles?.name || 'Trader',
          senderAvatar:
            m.profiles?.avatar_url ||
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          text: m.text,
          createdAt: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching messages:', err);
    }
    return storageService.getMessages(conversationId);
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachedItem?: { id: string; title: string },
    attachedJob?: { id: string; title: string },
    recipientId?: string
  ): Promise<ChatMessage> {
    const currentSenderId = await resolveAuthUserId(senderId);

    const localMsg = storageService.sendMessage(conversationId, currentSenderId, text, attachedItem, attachedJob);
    if (!isSupabaseConfigured()) return localMsg;

    try {
      // Resolve recipient_id (required NOT NULL in public.messages)
      let targetRecipientId = recipientId;
      if (!targetRecipientId) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('participant_ids')
          .eq('id', conversationId)
          .maybeSingle();

        if (convData?.participant_ids && Array.isArray(convData.participant_ids)) {
          targetRecipientId =
            convData.participant_ids.find((id: string) => id !== currentSenderId) || currentSenderId;
        } else {
          targetRecipientId = currentSenderId;
        }
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentSenderId,
        recipient_id: targetRecipientId,
        text,
        attached_tool_name: attachedItem?.title || null,
        attached_job_title: attachedJob?.title || null,
      });

      await supabase
        .from('conversations')
        .update({
          last_message_text: text,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (err) {
      console.error('[Supabase] Error sending message:', err);
    }

    return localMsg;
  },

// ==========================================
  // 10. STOLEN GEAR & VAN BREAK-IN RADAR
  // ==========================================
  async getStolenAlerts(): Promise<StolenGearAlert[]> {
    if (!isSupabaseConfigured()) {
      return storageService.getStolenAlerts();
    }
    try {
      const { data, error } = await supabase
        .from('stolen_gear_alerts')
        .select(`
          *,
          profiles:reporter_id (name, phone, trade)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return data.map((r: any) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterName: r.profiles?.name || r.reporter_name || 'Verified Tradesperson',
          reporterPhone: r.reporter_phone || r.profiles?.phone || '',
          reporterTrade: r.reporter_trade || r.profiles?.trade || 'Electrician',
          itemTitle: r.item_title,
          category: 'Power Tools',
          serialNumbers: r.serial_numbers || '',
          distinguishingMarks: r.distinguishing_marks || r.item_description || '',
          theftLocation: {
            town: r.theft_location_town || 'Dublin City',
            county: r.theft_location_county || r.county || 'Dublin',
            latitude: Number(r.latitude) || 53.3498,
            longitude: Number(r.longitude) || -6.2603,
          },
          stolenDate: r.date_stolen
            ? new Date(r.date_stolen).toLocaleDateString()
            : new Date(r.created_at).toLocaleDateString(),
          stolenTime: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          images: Array.isArray(r.images) ? r.images : [],
          tier: r.tier || 'local',
          urgency: r.urgency || 'CRITICAL',
          status: r.status || 'ACTIVE_ALERT',
          sightingsCount: r.sightings_count || 0,
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching stolen alerts:', err);
    }
    return storageService.getStolenAlerts();
  },

  async createStolenAlert(alertData: Partial<StolenGearAlert>): Promise<StolenGearAlert> {
    const reporterId = await resolveAuthUserId(alertData.reporterId);
    const currentUser = storageService.getCurrentUser();

    const payload = {
      ...alertData,
      reporterId,
      reporterName: alertData.reporterName || currentUser?.name || 'Tradesperson',
      reporterPhone: alertData.reporterPhone || currentUser?.phone || '',
      reporterTrade: alertData.reporterTrade || currentUser?.trade || 'Electrician',
    };

    const localAlert: StolenGearAlert = (storageService as any).createStolenAlert
      ? (storageService as any).createStolenAlert(payload)
      : ({ ...payload, id: `local_${Date.now()}` } as StolenGearAlert);

    if (!isSupabaseConfigured()) return localAlert;

    try {
      // Matches the exact columns required by your SQL schema check constraints
      const { data, error } = await supabase
        .from('stolen_gear_alerts')
        .insert({
          reporter_id: reporterId,
          reporter_phone: payload.reporterPhone || '',
          reporter_trade: payload.reporterTrade || 'Electrician',
          item_title: payload.itemTitle || 'Stolen Equipment',
          item_description: payload.distinguishingMarks || payload.itemTitle || 'No description provided',
          serial_numbers: payload.serialNumbers || null,
          distinguishing_marks: payload.distinguishingMarks || null,
          theft_location_town: payload.theftLocation?.town || 'Dublin City',
          theft_location_county: payload.theftLocation?.county || 'Dublin',
          county: payload.theftLocation?.county || 'Dublin',
          latitude: payload.theftLocation?.latitude ?? 53.3498,
          longitude: payload.theftLocation?.longitude ?? -6.2603,
          date_stolen: new Date().toISOString().split('T')[0],
          images: Array.isArray(payload.images) ? payload.images : [],
          tier: payload.tier || 'local',
          urgency: payload.urgency || 'CRITICAL',
          status: payload.status || 'ACTIVE_ALERT',
        })
        .select()
        .single();

      if (error) {
        console.warn('[Supabase RLS Note] Stolen alert created locally; sync skipped:', error.message);
      } else if (data && localAlert) {
        localAlert.id = data.id;
      }
    } catch (err) {
      console.warn('[Supabase] Stolen alert sync error:', err);
    }
    return localAlert;
  },

  async editStolenAlert(alertId: string, updatedData: Partial<StolenGearAlert>): Promise<void> {
    if ((storageService as any).editStolenAlert) {
      (storageService as any).editStolenAlert(alertId, updatedData);
    }

    if (!isSupabaseConfigured()) return;

    try {
      const updatePayload: Record<string, any> = {};
      if (updatedData.itemTitle !== undefined) updatePayload.item_title = updatedData.itemTitle;
      if (updatedData.serialNumbers !== undefined) updatePayload.serial_numbers = updatedData.serialNumbers;
      if (updatedData.distinguishingMarks !== undefined) {
        updatePayload.distinguishing_marks = updatedData.distinguishingMarks;
        updatePayload.item_description = updatedData.distinguishingMarks;
      }
      if (updatedData.theftLocation?.town !== undefined) {
        updatePayload.theft_location_town = updatedData.theftLocation.town;
      }
      if (updatedData.theftLocation?.county !== undefined) {
        updatePayload.theft_location_county = updatedData.theftLocation.county;
        updatePayload.county = updatedData.theftLocation.county;
      }
      if (updatedData.status !== undefined) updatePayload.status = updatedData.status;
      if (updatedData.urgency !== undefined) updatePayload.urgency = updatedData.urgency;
      if (updatedData.tier !== undefined) updatePayload.tier = updatedData.tier;
      if (updatedData.images !== undefined) updatePayload.images = updatedData.images;

      const { error } = await supabase
        .from('stolen_gear_alerts')
        .update(updatePayload)
        .eq('id', alertId);

      if (error) throw error;
    } catch (err) {
      console.warn('[Supabase] Error editing stolen alert:', err);
    }
  },

  async updateStolenAlert(alertId: string, updatedData: Partial<StolenGearAlert>): Promise<void> {
    return this.editStolenAlert(alertId, updatedData);
  },

  async updateStolenAlertStatus(
    alertId: string,
    status: 'ACTIVE_ALERT' | 'RECOVERED' | 'INVESTIGATING'
  ): Promise<void> {
    return this.editStolenAlert(alertId, { status: status as any });
  },

  async deleteStolenAlert(alertId: string): Promise<void> {
    if ((storageService as any).deleteStolenAlert) {
      (storageService as any).deleteStolenAlert(alertId);
    }
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('stolen_gear_alerts').delete().eq('id', alertId);
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Error deleting stolen alert:', err);
    }
  },
  // ==========================================
  // 11. APPRENTICE LOGBOOK ENTRIES (SOLAS)
  // ==========================================
  async getLogbookEntries(apprenticeId?: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return (storageService as any).getLogbookEntries ? (storageService as any).getLogbookEntries() : [];
    }
    try {
      const targetId = await resolveAuthUserId(apprenticeId);
      const { data, error } = await supabase
        .from('apprentice_logbook_entries')
        .select('*')
        .eq('apprentice_id', targetId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] Error fetching apprentice logbook entries:', err);
      return (storageService as any).getLogbookEntries ? (storageService as any).getLogbookEntries() : [];
    }
  },

  async addLogbookEntry(entry: {
    apprenticeId?: string;
    trade?: string;
    phase: number;
    date?: string;
    moduleCode: string;
    moduleTitle: string;
    hoursLogged: number;
    craftspersonName?: string;
    notes?: string;
    employerSignedOff?: boolean;
  }): Promise<any> {
    const apprenticeId = await resolveAuthUserId(entry.apprenticeId);
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('apprentice_logbook_entries')
        .insert({
          apprentice_id: apprenticeId,
          trade: entry.trade || 'Electrician',
          phase: entry.phase || 2,
          date: entry.date || new Date().toISOString().split('T')[0],
          module_code: entry.moduleCode || 'MOD-101',
          module_title: entry.moduleTitle,
          hours_logged: entry.hoursLogged || 0,
          craftsperson_name: entry.craftspersonName || 'Qualified Supervising Craftsperson',
          notes: entry.notes || '',
          employer_signed_off: Boolean(entry.employerSignedOff),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase] Error adding logbook entry:', err);
      return null;
    }
  },

  // ==========================================
  // 12. CERTIFICATIONS (SOLAS & Safe Pass)
  // ==========================================
  async getCertifications(userId?: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    try {
      // Only fall back to logged-in user if no specific userId was requested
      const targetUserId = userId || (await resolveAuthUserId());
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', targetUserId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] Error fetching certifications:', err);
      return [];
    }
  },

  async addCertification(cert: {
    userId: string;
    certType: string;
    issuedDate: string;
    expiryDate: string;
    verificationCode: string;
    verifiedBy?: string;
  }): Promise<any> {
    if (!isSupabaseConfigured()) return null;
    try {
      const targetUserId = await resolveAuthUserId(cert.userId);

      const { data, error } = await supabase
        .from('certifications')
        .insert({
          user_id: targetUserId,
          cert_type: cert.certType,
          issued_date: cert.issuedDate,
          expiry_date: cert.expiryDate,
          verification_code: cert.verificationCode,
          verified_by: cert.verifiedBy || 'National Registry',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase] Error adding certification:', err);
      return null;
    }
  },

  // ==========================================
  // 13. SKILL ENDORSEMENTS
  // ==========================================
  async getSkillEndorsements(targetUserId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('skill_endorsements')
        .select(`
          *,
          endorser:endorser_user_id (name, handle, trade, avatar_url)
        `)
        .eq('target_user_id', targetUserId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] Error fetching skill endorsements:', err);
      return [];
    }
  },

  async endorseSkill(targetUserId: string, skill: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const endorserId = await resolveAuthUserId();
      if (!endorserId || endorserId === targetUserId) return false;

      const { error } = await supabase.from('skill_endorsements').insert({
        target_user_id: targetUserId,
        skill,
        endorser_user_id: endorserId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Error endorsing skill:', err);
      return false;
    }
  },

  // ==========================================
  // 14. CUSTOM GROUPS (Site Crews)
  // ==========================================
  async getCustomGroups(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase.from('custom_groups').select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] Error fetching custom groups:', err);
      return [];
    }
  },

  async createCustomGroup(name: string, description: string, memberUserIds: string[] = []): Promise<any> {
    if (!isSupabaseConfigured()) return null;
    try {
      const creatorId = await resolveAuthUserId();
      const allMembers = Array.from(new Set([creatorId, ...memberUserIds]));
      const { data, error } = await supabase
        .from('custom_groups')
        .insert({
          creator_id: creatorId,
          name,
          description,
          member_user_ids: allMembers,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase] Error creating custom group:', err);
      return null;
    }
  },

  // ==========================================
  // 15. SUBSCRIPTION TIERS
  // ==========================================
  async getSubscriptionTiers(): Promise<PricingTier[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    try {
      const { data, error } = await supabase.from('subscription_tiers').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          name: r.name,
          priceEuros: Number(r.price_euros),
          durationText: `${r.duration_days} Days`,
          features: Array.isArray(r.features) ? r.features : [],
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching subscription tiers:', err);
    }
    return [];
  },

  // ==========================================
  // AVATAR STORAGE & UPLOAD
  // ==========================================
  async uploadAvatarPhoto(userId: string, fileOrBase64: File | string): Promise<string> {
    const targetUserId = await resolveAuthUserId(userId);
    let avatarUrl = typeof fileOrBase64 === 'string' ? fileOrBase64 : '';

    if (isSupabaseConfigured()) {
      try {
        const fileToUpload: File | Blob =
          typeof fileOrBase64 === 'string' ? await (await fetch(fileOrBase64)).blob() : fileOrBase64;
        const fileName = `avatar_${targetUserId}_${Date.now()}.jpg`;
        const filePath = `${targetUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, fileToUpload, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          avatarUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.warn('[Supabase Storage] Error uploading avatar to bucket, falling back to local data URL:', err);
      }
    }

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', targetUserId);
      }

      const currentUser = storageService.getCurrentUser();
      if (currentUser.id === targetUserId) {
        currentUser.avatar = avatarUrl;
        storageService.updateCurrentUser(currentUser);
      }
    } catch (err) {
      console.error('[Supabase] Error updating profile avatar URL:', err);
    }

    return avatarUrl;
  },

  // ==========================================
  // FULL TWO-WAY HYDRATION / SYNC
  // ==========================================
  async syncAllWithSupabase(): Promise<{ success: boolean; syncedAt: string; message: string }> {
    if (!isSupabaseConfigured()) {
      storageService.updateSyncTimestamp();
      return {
        success: true,
        syncedAt: storageService.getLastSyncTimestamp(),
        message: 'Running in Local-First offline cache mode (Supabase URL/Key not configured).',
      };
    }

    try {
      const [remotePosts, remoteJobs, remoteMarketplace] = await Promise.all([
        this.getPosts(),
        this.getJobs(),
        this.getMarketplaceItems(),
      ]);

      if (storageService.getAppMode() === 'live') {
        storageService.setLiveCache(remotePosts, remoteJobs, remoteMarketplace);
      }

      storageService.updateSyncTimestamp();
      return {
        success: true,
        syncedAt: storageService.getLastSyncTimestamp(),
        message: `Successfully synchronized ${remotePosts.length} posts, ${remoteJobs.length} jobs, and ${remoteMarketplace.length} classified items with Supabase.`,
      };
    } catch (err: any) {
      return {
        success: false,
        syncedAt: storageService.getLastSyncTimestamp(),
        message: `Sync failed: ${err.message || 'Network error'}`,
      };
    }
  },
};

export default supabaseService;