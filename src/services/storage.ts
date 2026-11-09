import {
  UserProfile,
  Post,
  PostComment,
  MarketplaceItem,
  StolenGearAlert,
  Conversation,
  ChatMessage,
  GeoLocation,
  JobListing,
  CustomUserGroup,
  SolasLogEntry,
  CourseListing,
} from '../types';
import {
  INITIAL_CURRENT_USER,
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_COMMENTS,
  INITIAL_MARKETPLACE,
  INITIAL_STOLEN_ALERTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_JOBS,
  INITIAL_CUSTOM_GROUPS,
  INITIAL_COURSES,
  IRISH_LOCATIONS,
} from '../data/seedData';
import { isWithin50KmRadius, calculateHaversineDistanceKm } from '../utils/calculations';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEYS = {
  CURRENT_USER: 'crafted_current_user_v3',
  USERS: 'crafted_users_v3',
  POSTS: 'crafted_posts_v3',
  COMMENTS: 'crafted_comments_v3',
  MARKETPLACE: 'crafted_marketplace_v3',
  STOLEN_ALERTS: 'crafted_stolen_alerts_v3',
  CONVERSATIONS: 'crafted_conversations_v3',
  MESSAGES: 'crafted_messages_v3',
  JOBS: 'crafted_jobs_v3',
  CUSTOM_GROUPS: 'crafted_custom_groups_v3',
  NOTIFICATIONS_ENABLED: 'crafted_notifications_enabled_v3',
  LOCATION_PREFS: 'crafted_location_prefs_v3',
  APP_MODE: 'crafted_app_mode_v2',
  LIVE_POSTS: 'crafted_live_posts_v2',
  LIVE_JOBS: 'crafted_live_jobs_v2',
  LIVE_MARKETPLACE: 'crafted_live_marketplace_v2',
  LIVE_STOLEN_ALERTS: 'crafted_live_stolen_alerts_v2',
  LIVE_CURRENT_USER: 'crafted_live_current_user_v2',
  LIVE_USERS: 'crafted_live_users_v2',
  LIVE_CUSTOM_GROUPS: 'crafted_live_custom_groups_v2',
  LIVE_CONVERSATIONS: 'crafted_live_conversations_v2',
  LIVE_MESSAGES: 'crafted_live_messages_v2',
  LIVE_LOGBOOK: 'crafted_live_logbook_v2',
  LIVE_COMMENTS: 'crafted_live_comments_v2',
  SOLAS_LOGBOOK: 'crafted_solas_logbook_v2',
  SOLAS_COMPETENCIES: 'crafted_solas_competencies_v2',
  COURSES: 'crafted_courses_v3',
  LIVE_COURSES: 'crafted_live_courses_v2',
};

export const INITIAL_SOLAS_LOG_ENTRIES: SolasLogEntry[] = [
  {
    id: 'solas_log_1',
    userId: 'u_sean_electrician',
    phase: 6,
    date: '2025-05-12',
    hours: 38,
    craftspersonName: 'Declan Byrne (National Craft Cert #4912)',
    moduleTitle: 'Distribution Board Commissioning & Megger Testing',
    notes: 'Completed insulation resistance and polarity verification on sub-distribution boards at Dublin Airport cargo hub. Calibrated test instruments verified.',
    employerSigned: true,
    signoffDate: '2025-05-14',
    signoffCode: 'APP-MTR-8821',
  },
  {
    id: 'solas_log_2',
    userId: 'u_sean_electrician',
    phase: 6,
    date: '2025-05-05',
    hours: 40,
    craftspersonName: 'Declan Byrne (National Craft Cert #4912)',
    moduleTitle: '3-Phase Motor Control Wiring & Star-Delta Starters',
    notes: 'Installed emergency stop interlocking circuits and thermal overload protection relays for industrial ventilation fans. Verified fault disconnection times.',
    employerSigned: true,
    signoffDate: '2025-05-07',
    signoffCode: 'APP-MTR-8819',
  },
  {
    id: 'solas_log_3',
    userId: 'u_sean_electrician',
    phase: 6,
    date: '2025-04-28',
    hours: 39,
    craftspersonName: 'Declan Byrne (National Craft Cert #4912)',
    moduleTitle: 'Cable Tray, Basket & Heavy Steel Conduit Containment',
    notes: 'Fabricated 90-degree gusset bends and offsets in 50mm steel conduit. Pulled 16mm² SWA power feed cables in pharmaceutical plant cleanroom corridor.',
    employerSigned: true,
    signoffDate: '2025-04-30',
    signoffCode: 'APP-MTR-8802',
  },
];


export const BLANK_LIVE_USER: UserProfile = {
  id: 'live_user_unregistered',
  name: 'New Tradesperson',
  handle: '@new_tradesperson',
  trade: 'Electrician',
  accountType: 'personal',
  hasSafePass: false,
  hasCifBadge: false,
  avatar: '',
  phone: '',
  email: '',
  location: IRISH_LOCATIONS[0],
  followingUserIds: [],
  followersCount: 0,
  bio: 'Live profile not registered yet. Complete registration to unlock the live network.',
  yearsExperience: 0,
  certifications: [],
  portfolio: [],
  workHistory: [],
};

// Event listener for in-memory reactive updates across components
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStoreChange(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Store subscriber error', e);
    }
  });
}

// Client-side image compression handler
export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Client-side video validation & 30-second limit check handler
export async function validateAndProcessVideoFile(
  file: File,
  maxDurationSeconds = 30
): Promise<{ isValid: boolean; dataUrl: string; durationSeconds: number; error?: string }> {
  return new Promise((resolve) => {
    // Check file size (e.g. limit to 25MB before conversion)
    if (file.size > 25 * 1024 * 1024) {
      resolve({
        isValid: false,
        dataUrl: '',
        durationSeconds: 0,
        error: 'Video file size exceeds 25MB. Please choose a shorter or compressed clip.',
      });
      return;
    }

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    const blobUrl = URL.createObjectURL(file);
    videoEl.src = blobUrl;

    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(blobUrl);
      const duration = Math.round(videoEl.duration);

      if (duration > maxDurationSeconds) {
        resolve({
          isValid: false,
          dataUrl: '',
          durationSeconds: duration,
          error: `Video duration is ${duration}s. On-site work videos must be 30 seconds or less to optimize storage.`,
        });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            isValid: true,
            dataUrl: reader.result as string,
            durationSeconds: duration,
          });
        };
        reader.onerror = () => {
          resolve({
            isValid: false,
            dataUrl: '',
            durationSeconds: duration,
            error: 'Failed to read video file.',
          });
        };
        reader.readAsDataURL(file);
      }
    };

    videoEl.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({
        isValid: false,
        dataUrl: '',
        durationSeconds: 0,
        error: 'Unsupported video format. Please upload MP4 or WebM.',
      });
    };
  });
}

// Storage helpers
export const storageService = {
  isDemoEnabled(): boolean {
    return APP_CONFIG.ALLOW_DEMO_SANDBOX && APP_CONFIG.EDITION !== 'live';
  },

  getAppMode(): 'demo' | 'live' {
    if (APP_CONFIG.EDITION === 'live') return 'live';
    if (APP_CONFIG.EDITION === 'demo') return 'demo';
    if (!this.isDemoEnabled()) return 'live';
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
      if (mode === 'live' || mode === 'demo') return mode;
    } catch (e) {
      console.error(e);
    }
    return 'live'; // Default to live mode for production and real user accounts
  },

  setAppMode(mode: 'demo' | 'live'): void {
    if (!this.isDemoEnabled() && mode === 'demo') return;
    localStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
    notifyStoreChange();
  },

  getCurrentUser(): UserProfile {
    try {
      const isLive = this.getAppMode() === 'live';
      const key = isLive ? STORAGE_KEYS.LIVE_CURRENT_USER : STORAGE_KEYS.CURRENT_USER;
      const raw = localStorage.getItem(key);
      if (raw) {
        const user = JSON.parse(raw);
        // Sanitize any demo following IDs in live mode
        if (isLive && user && Array.isArray(user.followingUserIds)) {
          const DEMO_IDS = new Set(['usr_me', 'usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_sisk', 'usr_makita', 'usr_chloe']);
          if (user.followingUserIds.some((id: string) => DEMO_IDS.has(id))) {
            user.followingUserIds = user.followingUserIds.filter((id: string) => !DEMO_IDS.has(id));
            localStorage.setItem(key, JSON.stringify(user));
          }
        }
        return user;
      }
      if (isLive) return BLANK_LIVE_USER;
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CURRENT_USER;
  },

  hasLiveProfile(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LIVE_CURRENT_USER);
      return !!raw;
    } catch {
      return false;
    }
  },

  updateCurrentUser(user: UserProfile): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CURRENT_USER : STORAGE_KEYS.CURRENT_USER;
    const usersKey = isLive ? STORAGE_KEYS.LIVE_USERS : STORAGE_KEYS.USERS;

    // In live mode, ensure demo IDs are never in followingUserIds
    if (isLive && Array.isArray(user.followingUserIds)) {
      const DEMO_IDS = new Set(['usr_me', 'usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_sisk', 'usr_makita', 'usr_chloe']);
      user.followingUserIds = user.followingUserIds.filter((id) => !DEMO_IDS.has(id));
    }

    localStorage.setItem(key, JSON.stringify(user));
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(usersKey, JSON.stringify(users));
    notifyStoreChange();
  },

  getUsers(): UserProfile[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_USERS : STORAGE_KEYS.USERS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_USERS;
  },

  getUserById(userId: string): UserProfile | undefined {
    return this.getUsers().find((u) => u.id === userId);
  },

  // Following logic
  followUser(targetUserId: string): void {
    const isLive = this.getAppMode() === 'live';
    const usersKey = isLive ? STORAGE_KEYS.LIVE_USERS : STORAGE_KEYS.USERS;
    const user = this.getCurrentUser();
    if (!user.followingUserIds.includes(targetUserId)) {
      user.followingUserIds.push(targetUserId);
      this.updateCurrentUser(user);

      // Also increment follower count on target user
      const users = this.getUsers();
      const target = users.find((u) => u.id === targetUserId);
      if (target) {
        target.followersCount = (target.followersCount || 0) + 1;
        localStorage.setItem(usersKey, JSON.stringify(users));
      }
      notifyStoreChange();
    }
  },

  unfollowUser(targetUserId: string): void {
    const isLive = this.getAppMode() === 'live';
    const usersKey = isLive ? STORAGE_KEYS.LIVE_USERS : STORAGE_KEYS.USERS;
    const user = this.getCurrentUser();
    user.followingUserIds = user.followingUserIds.filter((id) => id !== targetUserId);
    this.updateCurrentUser(user);

    const users = this.getUsers();
    const target = users.find((u) => u.id === targetUserId);
    if (target && target.followersCount && target.followersCount > 0) {
      target.followersCount -= 1;
      localStorage.setItem(usersKey, JSON.stringify(users));
    }
    notifyStoreChange();
  },

  isFollowing(targetUserId: string): boolean {
    const user = this.getCurrentUser();
    return user.followingUserIds.includes(targetUserId);
  },

  endorseSkill(targetUserId: string, skillName: string, endorserUserId: string): UserProfile | undefined {
    const users = this.getUsers();
    let target = users.find((u) => u.id === targetUserId);
    const currentUser = this.getCurrentUser();

    if (!target && currentUser.id === targetUserId) {
      target = currentUser;
    }

    if (!target) return undefined;

    const skills = target.skills ? [...target.skills] : [];
    const existingIndex = skills.findIndex((s) => s.skill.toLowerCase() === skillName.toLowerCase());

    if (existingIndex >= 0) {
      const endorsers = [...skills[existingIndex].endorserUserIds];
      const endorserIdx = endorsers.indexOf(endorserUserId);
      if (endorserIdx >= 0) {
        // Toggle off endorsement
        endorsers.splice(endorserIdx, 1);
      } else {
        // Add endorsement
        endorsers.push(endorserUserId);
      }
      skills[existingIndex] = {
        ...skills[existingIndex],
        endorserUserIds: endorsers,
      };
    } else {
      // Add new skill with first endorsement
      skills.push({
        skill: skillName,
        endorserUserIds: [endorserUserId],
      });
    }

    target.skills = skills;

    const idx = users.findIndex((u) => u.id === target.id);
    if (idx >= 0) {
      users[idx] = target;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    if (currentUser.id === target.id) {
      this.updateCurrentUser(target);
    }
    notifyStoreChange();
    return target;
  },

  addCustomSkill(targetUserId: string, skillName: string): UserProfile | undefined {
    const users = this.getUsers();
    let target = users.find((u) => u.id === targetUserId);
    const currentUser = this.getCurrentUser();

    if (!target && currentUser.id === targetUserId) {
      target = currentUser;
    }

    if (!target) return undefined;

    const skills = target.skills ? [...target.skills] : [];
    if (!skills.some((s) => s.skill.toLowerCase() === skillName.toLowerCase())) {
      skills.push({
        skill: skillName,
        endorserUserIds: [],
      });
      target.skills = skills;

      const idx = users.findIndex((u) => u.id === target.id);
      if (idx >= 0) {
        users[idx] = target;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
      if (currentUser.id === target.id) {
        this.updateCurrentUser(target);
      }
      notifyStoreChange();
    }
    return target;
  },

  // Custom Groups logic
  getCustomGroups(): CustomUserGroup[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CUSTOM_GROUPS : STORAGE_KEYS.CUSTOM_GROUPS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_CUSTOM_GROUPS;
  },

  createCustomGroup(name: string, description?: string, initialMemberIds: string[] = []): CustomUserGroup {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CUSTOM_GROUPS : STORAGE_KEYS.CUSTOM_GROUPS;
    const user = this.getCurrentUser();
    const groups = this.getCustomGroups();
    const newGroup: CustomUserGroup = {
      id: `grp_${Date.now()}`,
      creatorId: user.id,
      name: name.trim(),
      description: description?.trim(),
      memberUserIds: initialMemberIds,
      createdAt: 'Just now',
    };
    groups.unshift(newGroup);
    localStorage.setItem(key, JSON.stringify(groups));
    notifyStoreChange();
    return newGroup;
  },

  deleteCustomGroup(groupId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CUSTOM_GROUPS : STORAGE_KEYS.CUSTOM_GROUPS;
    const groups = this.getCustomGroups().filter((g) => g.id !== groupId);
    localStorage.setItem(key, JSON.stringify(groups));
    notifyStoreChange();
  },

  addUserToCustomGroup(groupId: string, userId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CUSTOM_GROUPS : STORAGE_KEYS.CUSTOM_GROUPS;
    const groups = this.getCustomGroups();
    const grp = groups.find((g) => g.id === groupId);
    if (grp && !grp.memberUserIds.includes(userId)) {
      grp.memberUserIds.push(userId);
      localStorage.setItem(key, JSON.stringify(groups));
      notifyStoreChange();
    }
  },

  removeUserFromCustomGroup(groupId: string, userId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CUSTOM_GROUPS : STORAGE_KEYS.CUSTOM_GROUPS;
    const groups = this.getCustomGroups();
    const grp = groups.find((g) => g.id === groupId);
    if (grp) {
      grp.memberUserIds = grp.memberUserIds.filter((id) => id !== userId);
      localStorage.setItem(key, JSON.stringify(groups));
      notifyStoreChange();
    }
  },

  // Posts logic
  getPosts(): Post[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_POSTS;
  },

  createPost(newPostData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'commentsCount'>): Post {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const posts = this.getPosts();
    const post: Post = {
      ...newPostData,
      id: `post_${Date.now()}`,
      createdAt: 'Just now',
      likes: 0,
      isLiked: false,
      viewsCount: 15,
      commentsCount: 0,
    };
    posts.unshift(post);
    localStorage.setItem(key, JSON.stringify(posts));
    notifyStoreChange();
    return post;
  },

  updatePostId(oldId: string, newId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const posts = this.getPosts().map((p) => (p.id === oldId ? { ...p, id: newId } : p));
    localStorage.setItem(key, JSON.stringify(posts));
    notifyStoreChange();
  },

  deletePost(postId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const posts = this.getPosts().filter((p) => p.id !== postId);
    localStorage.setItem(key, JSON.stringify(posts));

    const comments = this.getComments().filter((c) => c.postId !== postId);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));

    notifyStoreChange();
  },

  editPost(postId: string, content: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      post.content = content;
      localStorage.setItem(key, JSON.stringify(posts));
      notifyStoreChange();
    }
  },

  toggleLikePost(postId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      if (post.isLiked || post.likedByCurrentUser) {
        post.likes = Math.max(0, (post.likes || 1) - 1);
        post.isLiked = false;
        post.likedByCurrentUser = false;
        post.likesCount = post.likes;
      } else {
        post.likes = (post.likes || 0) + 1;
        post.isLiked = true;
        post.likedByCurrentUser = true;
        post.likesCount = post.likes;
      }
      localStorage.setItem(key, JSON.stringify(posts));
      notifyStoreChange();
    }
  },

  likePost(postId: string): void {
    this.toggleLikePost(postId);
  },

  getComments(): PostComment[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_COMMENTS : STORAGE_KEYS.COMMENTS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_COMMENTS;
  },

  getCommentsForPost(postId: string): PostComment[] {
    return this.getComments().filter((c) => c.postId === postId);
  },

  addComment(postId: string, text: string): PostComment {
    const isLive = this.getAppMode() === 'live';
    const commentsKey = isLive ? STORAGE_KEYS.LIVE_COMMENTS : STORAGE_KEYS.COMMENTS;
    const postsKey = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const user = this.getCurrentUser();
    const comments = this.getComments();
    const comment: PostComment = {
      id: `comm_${Date.now()}`,
      postId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userTrade: user.trade,
      text,
      createdAt: 'Just now',
    };
    comments.push(comment);
    localStorage.setItem(commentsKey, JSON.stringify(comments));

    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      post.commentsCount += 1;
      localStorage.setItem(postsKey, JSON.stringify(posts));
    }

    notifyStoreChange();
    return comment;
  },

  deleteComment(commentId: string): void {
    const isLive = this.getAppMode() === 'live';
    const commentsKey = isLive ? STORAGE_KEYS.LIVE_COMMENTS : STORAGE_KEYS.COMMENTS;
    const postsKey = isLive ? STORAGE_KEYS.LIVE_POSTS : STORAGE_KEYS.POSTS;
    const comments = this.getComments();
    const commentToDelete = comments.find((c) => c.id === commentId);
    if (!commentToDelete) return;

    const remaining = comments.filter((c) => c.id !== commentId);
    localStorage.setItem(commentsKey, JSON.stringify(remaining));

    const posts = this.getPosts();
    const post = posts.find((p) => p.id === commentToDelete.postId);
    if (post && post.commentsCount > 0) {
      post.commentsCount -= 1;
      localStorage.setItem(postsKey, JSON.stringify(posts));
    }

    notifyStoreChange();
  },

  editComment(commentId: string, text: string): void {
    const isLive = this.getAppMode() === 'live';
    const commentsKey = isLive ? STORAGE_KEYS.LIVE_COMMENTS : STORAGE_KEYS.COMMENTS;
    const comments = this.getComments();
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      comment.text = text;
      localStorage.setItem(commentsKey, JSON.stringify(comments));
      notifyStoreChange();
    }
  },

  // Jobs logic
  getJobs(): JobListing[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_JOBS : STORAGE_KEYS.JOBS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_JOBS;
  },

  createJob(jobData: Omit<JobListing, 'id' | 'createdAt' | 'applicationsCount'>): JobListing {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_JOBS : STORAGE_KEYS.JOBS;
    const jobs = this.getJobs();
    const job: JobListing = {
      ...jobData,
      id: `job_${Date.now()}`,
      createdAt: 'Just now',
      applicationsCount: 0,
    };
    if (job.isFeatured) {
      jobs.unshift(job);
    } else {
      const featured = jobs.filter((j) => j.isFeatured);
      const regular = jobs.filter((j) => !j.isFeatured);
      jobs.length = 0;
      jobs.push(...featured, job, ...regular);
    }
    localStorage.setItem(key, JSON.stringify(jobs));
    notifyStoreChange();
    return job;
  },

  deleteJob(jobId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_JOBS : STORAGE_KEYS.JOBS;
    const jobs = this.getJobs().filter((j) => j.id !== jobId);
    localStorage.setItem(key, JSON.stringify(jobs));
    notifyStoreChange();
  },

  editJob(jobId: string, updatedData: Partial<JobListing>): JobListing | undefined {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_JOBS : STORAGE_KEYS.JOBS;
    const jobs = this.getJobs();
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], ...updatedData };
      localStorage.setItem(key, JSON.stringify(jobs));
      notifyStoreChange();
      return jobs[idx];
    }
    return undefined;
  },

  getCourses(): CourseListing[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_COURSES : STORAGE_KEYS.COURSES;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_COURSES;
  },

  createCourse(courseData: Omit<CourseListing, 'id' | 'createdAt'>): CourseListing {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_COURSES : STORAGE_KEYS.COURSES;
    const courses = this.getCourses();
    const course: CourseListing = {
      ...courseData,
      id: `course_${Date.now()}`,
      createdAt: 'Just now',
    };
    courses.unshift(course);
    localStorage.setItem(key, JSON.stringify(courses));
    notifyStoreChange();
    return course;
  },

  deleteCourse(courseId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_COURSES : STORAGE_KEYS.COURSES;
    const courses = this.getCourses().filter((c) => c.id !== courseId);
    localStorage.setItem(key, JSON.stringify(courses));
    notifyStoreChange();
  },

  applyForJob(jobId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_JOBS : STORAGE_KEYS.JOBS;
    const jobs = this.getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      job.applicationsCount += 1;
      localStorage.setItem(key, JSON.stringify(jobs));
      notifyStoreChange();
    }
  },

  // Marketplace logic
  getMarketplaceItems(): MarketplaceItem[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MARKETPLACE : STORAGE_KEYS.MARKETPLACE;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_MARKETPLACE;
  },

  createMarketplaceItem(itemData: Omit<MarketplaceItem, 'id' | 'createdAt'>): MarketplaceItem {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MARKETPLACE : STORAGE_KEYS.MARKETPLACE;
    const items = this.getMarketplaceItems();
    const item: MarketplaceItem = {
      ...itemData,
      id: `mkt_${Date.now()}`,
      createdAt: 'Just now',
    };
    if (item.isBoosted || item.tier !== 'standard') {
      items.unshift(item);
    } else {
      const boosted = items.filter((i) => i.isBoosted || i.tier !== 'standard');
      const normal = items.filter((i) => !i.isBoosted && i.tier === 'standard');
      items.length = 0;
      items.push(...boosted, item, ...normal);
    }
    localStorage.setItem(key, JSON.stringify(items));
    notifyStoreChange();
    return item;
  },

  boostMarketplaceItem(itemId: string, tier: 'boosted' | 'premium' = 'boosted'): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MARKETPLACE : STORAGE_KEYS.MARKETPLACE;
    const items = this.getMarketplaceItems();
    const item = items.find((i) => i.id === itemId);
    if (item) {
      item.isBoosted = true;
      item.tier = tier;
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + (tier === 'premium' ? 14 : 7));
      item.boostExpiresAt = expireDate.toISOString();
      const remaining = items.filter((i) => i.id !== itemId);
      localStorage.setItem(key, JSON.stringify([item, ...remaining]));
      notifyStoreChange();
    }
  },

  deleteMarketplaceItem(itemId: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MARKETPLACE : STORAGE_KEYS.MARKETPLACE;
    const items = this.getMarketplaceItems().filter((i) => i.id !== itemId);
    localStorage.setItem(key, JSON.stringify(items));
    notifyStoreChange();
  },

  editMarketplaceItem(itemId: string, updatedData: Partial<MarketplaceItem>): MarketplaceItem | undefined {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MARKETPLACE : STORAGE_KEYS.MARKETPLACE;
    const items = this.getMarketplaceItems();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...updatedData };
      localStorage.setItem(key, JSON.stringify(items));
      notifyStoreChange();
      return items[idx];
    }
    return undefined;
  },

  // Stolen Gear Alerts
  getStolenAlerts(): StolenGearAlert[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_STOLEN_ALERTS : STORAGE_KEYS.STOLEN_ALERTS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_STOLEN_ALERTS;
  },

  createStolenAlert(data: Omit<StolenGearAlert, 'id' | 'status' | 'sightingsCount'>): StolenGearAlert {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_STOLEN_ALERTS : STORAGE_KEYS.STOLEN_ALERTS;
    const alerts = this.getStolenAlerts();
    const alert: StolenGearAlert = {
      ...data,
      id: `stolen_${Date.now()}`,
      status: 'ACTIVE_ALERT',
      sightingsCount: 0,
    };
    alerts.unshift(alert);
    localStorage.setItem(key, JSON.stringify(alerts));
    notifyStoreChange();
    return alert;
  },

  reportSighting(alertId: string): void {
    const alerts = this.getStolenAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.sightingsCount += 1;
      localStorage.setItem(STORAGE_KEYS.STOLEN_ALERTS, JSON.stringify(alerts));
      notifyStoreChange();
    }
  },

  getNearbyStolenAlerts(userLocation: GeoLocation, radiusKm = 50): { alert: StolenGearAlert; distanceKm: number }[] {
    const alerts = this.getStolenAlerts().filter((a) => a.status === 'ACTIVE_ALERT');
    return alerts
      .map((alert) => {
        const distanceKm = calculateHaversineDistanceKm(
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: alert.theftLocation.latitude, longitude: alert.theftLocation.longitude }
        );
        return { alert, distanceKm };
      })
      .filter((item) => {
        if (item.alert.tier === 'national') return true;
        if (item.alert.tier === 'regional') return item.distanceKm <= 150.0;
        return item.distanceKm <= radiusKm;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  // Messaging & Conversations
  getConversations(): Conversation[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_CONVERSATIONS : STORAGE_KEYS.CONVERSATIONS;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : INITIAL_CONVERSATIONS;
  },

  getMessages(conversationId: string): ChatMessage[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_MESSAGES : STORAGE_KEYS.MESSAGES;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const map = JSON.parse(raw);
        return map[conversationId] || [];
      }
    } catch (e) {
      console.error(e);
    }
    return isLive ? [] : (INITIAL_MESSAGES[conversationId] || []);
  },

  sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachedItem?: { id: string; title: string },
    attachedJob?: { id: string; title: string }
  ): ChatMessage {
    const isLive = this.getAppMode() === 'live';
    const msgsKey = isLive ? STORAGE_KEYS.LIVE_MESSAGES : STORAGE_KEYS.MESSAGES;
    const convsKey = isLive ? STORAGE_KEYS.LIVE_CONVERSATIONS : STORAGE_KEYS.CONVERSATIONS;
    const user = this.getCurrentUser();
    const allMsgsMap: { [id: string]: ChatMessage[] } = (() => {
      try {
        const raw = localStorage.getItem(msgsKey);
        if (raw) return JSON.parse(raw);
      } catch {}
      return isLive ? {} : { ...INITIAL_MESSAGES };
    })();

    const list = allMsgsMap[conversationId] || [];
    const sender = this.getUserById(senderId) || user;
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
      attachedItemId: attachedItem?.id,
      attachedItemTitle: attachedItem?.title,
      attachedJobId: attachedJob?.id,
      attachedJobTitle: attachedJob?.title,
    };
    list.push(newMsg);
    allMsgsMap[conversationId] = list;
    localStorage.setItem(msgsKey, JSON.stringify(allMsgsMap));

    const convs = this.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = text;
      conv.lastMessageTime = 'Just now';
      conv.unreadCount = 0;
      localStorage.setItem(convsKey, JSON.stringify(convs));
    }

    notifyStoreChange();
    return newMsg;
  },

  startOrOpenConversationWithUser(targetUser: UserProfile, context?: { tag: string; type: 'general' | 'job' | 'marketplace' }): string {
    const currentUser = this.getCurrentUser();
    const convs = this.getConversations();

    const existing = convs.find(
      (c) =>
        c.participantIds.includes(currentUser.id) &&
        c.participantIds.includes(targetUser.id) &&
        (!context || c.contextTag === context.tag)
    );

    if (existing) return existing.id;

    const convId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      participantIds: [currentUser.id, targetUser.id],
      participantNames: {
        [currentUser.id]: currentUser.name,
        [targetUser.id]: targetUser.name,
      },
      participantAvatars: {
        [currentUser.id]: currentUser.avatar,
        [targetUser.id]: targetUser.avatar,
      },
      participantTrades: {
        [currentUser.id]: currentUser.trade,
        [targetUser.id]: targetUser.trade,
      },
      lastMessage: context ? `Inquiry regarding: ${context.tag}` : 'Direct Trade Connection',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      contextTag: context?.tag,
      contextType: context?.type || 'general',
    };
    convs.unshift(newConv);
    const convsKey = this.getAppMode() === 'live' ? STORAGE_KEYS.LIVE_CONVERSATIONS : STORAGE_KEYS.CONVERSATIONS;
    localStorage.setItem(convsKey, JSON.stringify(convs));

    this.sendMessage(
      convId,
      currentUser.id,
      context
        ? `Hi ${targetUser.name}, I am reaching out regarding ${context.tag}.`
        : `Hi ${targetUser.name}, connected with you on TradeNet.`
    );

    return convId;
  },

  startOrOpenConversationForJob(job: JobListing): string {
    const user = this.getCurrentUser();
    const employer = this.getUserById(job.employerId) || {
      id: job.employerId,
      name: job.employerName,
      avatar: job.employerAvatar,
      trade: job.employerTrade,
    };

    const convId = this.startOrOpenConversationWithUser(employer as any, {
      tag: job.title,
      type: 'job',
    });

    this.sendMessage(
      convId,
      user.id,
      `Hi ${job.employerName}, I would like to apply for the "${job.title}" role. I hold a valid Safe Pass and have relevant on-site experience.`,
      undefined,
      { id: job.id, title: job.title }
    );

    this.applyForJob(job.id);
    return convId;
  },

  startOrOpenConversationWithSeller(item: MarketplaceItem): string {
    const user = this.getCurrentUser();
    const seller = this.getUserById(item.sellerId) || {
      id: item.sellerId,
      name: item.sellerName,
      avatar: item.sellerAvatar,
      trade: item.sellerTrade,
    };

    const convId = this.startOrOpenConversationWithUser(seller as any, {
      tag: item.title,
      type: 'marketplace',
    });

    this.sendMessage(
      convId,
      user.id,
      `Hi ${item.sellerName}, is this "${item.title}" still available? I am interested in collecting it.`,
      { id: item.id, title: item.title }
    );
    return convId;
  },

  startGroupConversation(group: CustomUserGroup): string {
    const user = this.getCurrentUser();
    const convs = this.getConversations();

    const existing = convs.find((c) => c.groupId === group.id);
    if (existing) return existing.id;

    const convId = `conv_grp_${Date.now()}`;
    const allMembers = [user.id, ...group.memberUserIds];
    const names: { [id: string]: string } = { [user.id]: user.name };
    const avatars: { [id: string]: string } = { [user.id]: user.avatar };
    const trades: { [id: string]: any } = { [user.id]: user.trade };

    group.memberUserIds.forEach((uid) => {
      const u = this.getUserById(uid);
      if (u) {
        names[u.id] = u.name;
        avatars[u.id] = u.avatar;
        trades[u.id] = u.trade;
      }
    });

    const newConv: Conversation = {
      id: convId,
      groupId: group.id,
      participantIds: allMembers,
      participantNames: names,
      participantAvatars: avatars,
      participantTrades: trades,
      lastMessage: `Group chat created for ${group.name}`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      contextTag: group.name,
      contextType: 'group',
    };
    convs.unshift(newConv);
    const convsKey = this.getAppMode() === 'live' ? STORAGE_KEYS.LIVE_CONVERSATIONS : STORAGE_KEYS.CONVERSATIONS;
    localStorage.setItem(convsKey, JSON.stringify(convs));

    this.sendMessage(
      convId,
      user.id,
      `Welcome crew to ${group.name} coordination chat! Use this thread for shift coordination, tools, and site updates.`
    );

    return convId;
  },

  getTotalUnreadMessages(): number {
    const convs = this.getConversations();
    return convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  },

  upgradeSubscription(tier: 'apprentice_sponsor' | 'master_contractor'): void {
    const user = this.getCurrentUser();
    user.premiumTier = tier;
    this.updateCurrentUser(user);
  },

  saveLocationPrefs(prefs: { location: GeoLocation; isAuto: boolean; source: string }): void {
    localStorage.setItem(STORAGE_KEYS.LOCATION_PREFS, JSON.stringify(prefs));
  },

  getLocationPrefs(): { location: GeoLocation; isAuto: boolean; source: string } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATION_PREFS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  resetToDefaultSeed(): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_CURRENT_USER));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(INITIAL_POSTS));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(INITIAL_COMMENTS));
    localStorage.setItem(STORAGE_KEYS.MARKETPLACE, JSON.stringify(INITIAL_MARKETPLACE));
    localStorage.setItem(STORAGE_KEYS.STOLEN_ALERTS, JSON.stringify(INITIAL_STOLEN_ALERTS));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(INITIAL_CONVERSATIONS));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_GROUPS, JSON.stringify(INITIAL_CUSTOM_GROUPS));
    localStorage.setItem('crafted_last_sync_timestamp', 'Just now (Fresh Seed)');
    notifyStoreChange();
  },

  // --- Local-First & Offline Caching Resilience ---
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getLastSyncTimestamp(): string {
    const raw = localStorage.getItem('crafted_last_sync_timestamp');
    return raw || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  updateSyncTimestamp(): void {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + new Date().toLocaleDateString() + ')';
    localStorage.setItem('crafted_last_sync_timestamp', ts);
  },

  getCachedPostsWithStatus(): { posts: Post[]; isOffline: boolean; lastSynced: string } {
    const posts = this.getPosts();
    const isOffline = !this.isOnline();
    const lastSynced = this.getLastSyncTimestamp();
    try {
      localStorage.setItem('crafted_offline_posts_backup', JSON.stringify(posts));
    } catch (e) {
      console.error(e);
    }
    return { posts, isOffline, lastSynced };
  },

  getCachedMarketplaceWithStatus(): { items: MarketplaceItem[]; isOffline: boolean; lastSynced: string } {
    const items = this.getMarketplaceItems();
    const isOffline = !this.isOnline();
    const lastSynced = this.getLastSyncTimestamp();
    try {
      localStorage.setItem('crafted_offline_marketplace_backup', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
    return { items, isOffline, lastSynced };
  },

  setLiveCache(posts?: Post[], jobs?: JobListing[], items?: MarketplaceItem[]): void {
    if (posts) localStorage.setItem(STORAGE_KEYS.LIVE_POSTS, JSON.stringify(posts));
    if (jobs) localStorage.setItem(STORAGE_KEYS.LIVE_JOBS, JSON.stringify(jobs));
    if (items) localStorage.setItem(STORAGE_KEYS.LIVE_MARKETPLACE, JSON.stringify(items));
    notifyStoreChange();
  },

  async syncWithSupabase(): Promise<{ success: boolean; syncedAt: string; message: string }> {
    const { supabaseService } = await import('./supabaseService');
    return supabaseService.syncAllWithSupabase();
  },

  getSolasLogEntries(userId?: string): SolasLogEntry[] {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_LOGBOOK : STORAGE_KEYS.SOLAS_LOGBOOK;
    try {
      const raw = localStorage.getItem(key);
      const entries: SolasLogEntry[] = raw ? JSON.parse(raw) : (isLive ? [] : INITIAL_SOLAS_LOG_ENTRIES);
      if (userId) {
        return entries.filter((e) => e.userId === userId);
      }
      return entries;
    } catch (e) {
      console.error(e);
      return isLive ? [] : INITIAL_SOLAS_LOG_ENTRIES;
    }
  },

  addSolasLogEntry(entry: Omit<SolasLogEntry, 'id'>): SolasLogEntry {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_LOGBOOK : STORAGE_KEYS.SOLAS_LOGBOOK;
    const entries = this.getSolasLogEntries();
    const newEntry: SolasLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = [newEntry, ...entries];
    localStorage.setItem(key, JSON.stringify(updated));
    notifyStoreChange();
    return newEntry;
  },

  deleteSolasLogEntry(id: string): void {
    const isLive = this.getAppMode() === 'live';
    const key = isLive ? STORAGE_KEYS.LIVE_LOGBOOK : STORAGE_KEYS.SOLAS_LOGBOOK;
    const entries = this.getSolasLogEntries().filter((e) => e.id !== id);
    localStorage.setItem(key, JSON.stringify(entries));
    notifyStoreChange();
  },

  getSolasCheckedCompetencies(userId?: string): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SOLAS_COMPETENCIES);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return [
      'p1_safepass',
      'p1_tools',
      'p1_manual',
      'p2_firstfix',
      'p2_cables',
      'p2_regs',
      'p3_theory',
      'p3_math',
      'p4_3phase',
      'p4_containment',
      'p5_automation',
      'p6_is10101',
    ];
  },

  toggleSolasCompetency(userId: string, competencyId: string): string[] {
    const checked = this.getSolasCheckedCompetencies(userId);
    const exists = checked.includes(competencyId);
    const updated = exists ? checked.filter((id) => id !== competencyId) : [...checked, competencyId];
    localStorage.setItem(STORAGE_KEYS.SOLAS_COMPETENCIES, JSON.stringify(updated));
    notifyStoreChange();
    return updated;
  },

  advanceApprenticePhase(userId: string, nextPhase: number): UserProfile {
    const user = this.getCurrentUser();
    const updated: UserProfile = {
      ...user,
      apprenticePhase: Math.min(7, Math.max(1, nextPhase)),
    };
    this.updateCurrentUser(updated);
    notifyStoreChange();
    return updated;
  },

  subscribe(listener: () => void): () => void {
    return subscribeToStore(listener);
  },
};
