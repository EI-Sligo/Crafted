import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageSquare,
  Trash2,
  X,
  Plus,
  ShieldCheck,
  Send,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  AlertCircle,
  UserCheck,
  Filter,
  SlidersHorizontal,
  Check,
  Search,
  Camera,
  FolderOpen,
  Share2,
  Eye,
  User,
  Users,
  Flame,
  Award,
  Building2,
  UserPlus,
} from 'lucide-react';
import { Post, PostComment, TradeType, UserProfile, GeoLocation, GENERATION_APPRENTICESHIP_SECTORS } from '../types';
import { storageService, compressImageFile, validateAndProcessVideoFile } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { calculateHaversineDistanceKm, matchesTradeFilter } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';
import { IRISH_LOCATIONS } from '../data/seedData';

interface FeedTabProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onOpenUserProfile: (user: UserProfile) => void;
  onOpenConversation?: (conversationId: string) => void;
}

const TRADE_FILTERS: Array<'All' | TradeType> = [
  'All',
  'Electrician',
  'Plumber',
  'Carpentry & Joinery',
  'Brick & Stonelaying',
  'Plastering & Drylining',
  'Painting & Decorating',
  'Roofing & Cladding',
  'Refrigeration & Air Conditioning',
  'Electrical Instrumentation',
  'Instrumentation',
  'Electronic Security Systems',
  'Mechanical Automation and Maintenance Fitting (MAMF)',
  'Metal Fabrication & Welding',
  'Toolmaking',
  'Pipefitting',
  'Engineering Services Maintenance',
  'OEM Engineering',
  'Manufacturing Engineering',
  'Polymer Processing',
  'Motor Mechanics',
  'Heavy Vehicle Mechanics',
  'Vehicle Body Repairs',
  'Agricultural Mechanics',
  'Construction Plant Fitting',
  'Scaffolding',
  'Wood Manufacturing & Finishing',
  'Civil Engineering',
  'Geo-drilling',
  'Logistics Associate',
  'Network Engineer',
  'Cybersecurity',
  'Telecommunications Field Technician',
  'Arboriculture',
  'Apprentice (Phase 1-3)',
  'Apprentice (Phase 4-7)',
  'General Contractor',
];

export const FeedTab: React.FC<FeedTabProps> = ({
  currentUser,
  currentLocation,
  onOpenUserProfile,
  onOpenConversation,
}) => {
  const { isDark } = useTheme();
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'people'>('feed');

  // People Search Directory state
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [peopleSelectedTrade, setPeopleSelectedTrade] = useState('All');
  const [peopleSelectedCounty, setPeopleSelectedCounty] = useState('All');
  const [peopleSelectedRole, setPeopleSelectedRole] = useState<'all' | 'apprentice' | 'qualified' | 'business'>('all');
  const [peopleList, setPeopleList] = useState<UserProfile[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (Array.isArray(currentUser.followingUserIds)) {
      currentUser.followingUserIds.forEach((id) => { map[id] = true; });
    }
    return map;
  });

  const fetchPeople = async (query = peopleSearchQuery) => {
    setIsLoadingPeople(true);
    try {
      const results = await supabaseService.searchProfiles(query);
      setPeopleList(results);
    } catch (e) {
      console.error('Failed to search people:', e);
      setPeopleList(storageService.getUsers());
    } finally {
      setIsLoadingPeople(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleToggleFollow = (targetUser: UserProfile) => {
    const isNowFollowing = !followingMap[targetUser.id];
    setFollowingMap((prev) => ({ ...prev, [targetUser.id]: isNowFollowing }));
    if (isNowFollowing) {
      storageService.followUser(targetUser.id);
    } else {
      storageService.unfollowUser(targetUser.id);
    }
  };

  const handleStartMessageWithUser = (targetUser: UserProfile) => {
    const convId = storageService.startOrOpenConversationWithUser(targetUser);
    if (onOpenConversation) {
      onOpenConversation(convId);
    }
  };

  const filteredPeople = peopleList.filter((p) => {
    if (p.id === currentUser.id) return false;
    if (peopleSelectedTrade !== 'All' && !matchesTradeFilter(peopleSelectedTrade, p.trade)) return false;
    if (peopleSelectedCounty !== 'All' && p.location?.county !== peopleSelectedCounty) return false;
    if (peopleSelectedRole === 'apprentice') {
      if (p.accountType === 'business' || !p.isApprentice) return false;
    } else if (peopleSelectedRole === 'qualified') {
      if (p.accountType === 'business' || p.isApprentice) return false;
    } else if (peopleSelectedRole === 'business') {
      if (p.accountType !== 'business') return false;
    }
    return true;
  });

  const [posts, setPosts] = useState<Post[]>(storageService.getPosts());
  const [offlineStatus, setOfflineStatus] = useState(storageService.getCachedPostsWithStatus());
  const [selectedTrades, setSelectedTrades] = useState<string[]>(['All']);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | 'all'>('all');
  const [feedKeywordSearch, setFeedKeywordSearch] = useState('');
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFiltersExpanded, setShowFiltersExpanded] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showAllTradesModal, setShowAllTradesModal] = useState(false);
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const tradeScrollRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // New post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTradeTag, setNewTradeTag] = useState<TradeType>(currentUser.trade);
  const [newUserLevel, setNewUserLevel] = useState<string>(
    currentUser.accountType === 'business' ? 'Employer / Contractor' : 'Qualified Tradesperson'
  );
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaStatusMsg, setMediaStatusMsg] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [touchStartY, setTouchStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditPostText(post.content);
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editPostText.trim()) return;
    await supabaseService.editPost(postId, editPostText.trim());
    setEditingPostId(null);
    refreshPosts();
  };

  const handleDeleteComment = async (commentId: string) => {
    await (supabaseService as any).deleteComment(commentId);
    refreshPosts();
  };

  const handleStartEditComment = (comment: PostComment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await supabaseService.editComment(commentId, editCommentText.trim());
    setEditingCommentId(null);
    refreshPosts();
  };

  const refreshPosts = () => {
    storageService.updateSyncTimestamp();
    const status = storageService.getCachedPostsWithStatus();
    setPosts(status.posts);
    setOfflineStatus(status);
  };

  useEffect(() => {
    let isMounted = true;
    supabaseService
      .getPosts()
      .then((remotePosts) => {
        if (isMounted && remotePosts) {
          setPosts(remotePosts);
          setOfflineStatus(storageService.getCachedPostsWithStatus());
        }
      })
      .catch((err) => {
        console.warn('Initial post fetch from Supabase:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await storageService.syncWithSupabase();
      refreshPosts();
    } catch (e) {
      console.error(e);
      refreshPosts();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY;
      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !isRefreshing) {
      handlePullToRefresh();
    } else {
      setPullDistance(0);
    }
    setTouchStartY(0);
  };

  const scrollTrades = (direction: 'left' | 'right') => {
    if (!tradeScrollRef.current) return;
    const amount = direction === 'left' ? -240 : 240;
    tradeScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tradeScrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX - tradeScrollRef.current.offsetLeft;
    dragScrollLeft.current = tradeScrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tradeScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tradeScrollRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    tradeScrollRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!tradeScrollRef.current) return;
    if (e.deltaY !== 0) {
      tradeScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleToggleTrade = (trade: string) => {
    if (trade === 'All') {
      setSelectedTrades(['All']);
      return;
    }
    setSelectedTrades((prev) => {
      const withoutAll = prev.filter((t) => t !== 'All');
      if (withoutAll.includes(trade)) {
        const next = withoutAll.filter((t) => t !== trade);
        return next.length === 0 ? ['All'] : next;
      } else {
        return [...withoutAll, trade];
      }
    });
  };

  const filteredPosts = posts.filter((post) => {
    if (feedMode === 'following') {
      const isMe = post.userId === currentUser.id;
      const isFollowed = currentUser.followingUserIds.includes(post.userId);
      if (!isMe && !isFollowed) return false;
    }

    if (!selectedTrades.includes('All') && selectedTrades.length > 0) {
      const postTrade = post.tradeTag || post.userTrade;
      const matchesAny = selectedTrades.some((t) => matchesTradeFilter(t, postTrade));
      if (!matchesAny) return false;
    }

    if (selectedRadiusKm !== 'all') {
      const distance = calculateHaversineDistanceKm(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: post.location.latitude, longitude: post.location.longitude }
      );
      if (distance > selectedRadiusKm) return false;
    }

    if (feedKeywordSearch.trim()) {
      const q = feedKeywordSearch.toLowerCase();
      const matchContent = post.content.toLowerCase().includes(q);
      const matchAuthor = post.userName.toLowerCase().includes(q);
      const matchTrade = (post.tradeTag || '').toLowerCase().includes(q);
      if (!matchContent && !matchAuthor && !matchTrade) return false;
    }

    return true;
  });

  const handleLike = async (postId: string) => {
    await supabaseService.toggleLikePost(postId);
    refreshPosts();
  };

  const handleDeletePost = async (postId: string) => {
    await supabaseService.deletePost(postId);
    refreshPosts();
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await supabaseService.addComment(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    refreshPosts();
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaError(null);
    setMediaStatusMsg(null);
    try {
      const file = files[0];
      const isVideo = file.type.startsWith('video');

      if (isVideo) {
        const result = await validateAndProcessVideoFile(file);
        if (!result.isValid) {
          setMediaError(result.error || 'Video duration exceeds 30-second limit.');
          return;
        }
        setSelectedMediaType('video');
        setMediaUrls([result.dataUrl]);
        setVideoDuration(result.durationSeconds);
        setMediaStatusMsg(`Video verified: ${result.durationSeconds?.toFixed(1)}s`);
      } else {
        const originalSizeKb = Math.round(file.size / 1024);
        const compressedDataUrl = await compressImageFile(file, 1200, 0.75);
        const compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        setSelectedMediaType('image');
        setMediaUrls([compressedDataUrl]);
        setVideoDuration(undefined);
        setMediaStatusMsg(`Photo loaded: ${originalSizeKb}KB → ${compressedSizeKb}KB`);
      }
    } catch (err) {
      console.error(err);
      setMediaError('Failed to process media file.');
    } finally {
      setIsProcessingMedia(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsProcessingMedia(true);
    setMediaError(null);
    setMediaStatusMsg('Publishing post to Crafted network...');

    try {
      await supabaseService.createPost({
        userId: currentUser.id,
        userName: currentUser.name,
        userHandle: currentUser.handle,
        userAvatar: currentUser.avatar,
        userTrade: currentUser.trade,
        userHasSafePass: currentUser.hasSafePass,
        userApprenticePhase: currentUser.apprenticePhase,
        hasSafePass: currentUser.hasSafePass,
        userPhase: currentUser.apprenticePhase,
        content: newContent.trim(),
        mediaType: selectedMediaType,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : [],
        videoDurationSeconds: videoDuration,
        location: currentLocation,
        tradeTag: newTradeTag,
        userLevel: newUserLevel,
      });

      setNewContent('');
      setSelectedMediaType('none');
      setMediaUrls([]);
      setVideoDuration(undefined);
      setMediaStatusMsg(null);
      setMediaError(null);
      setShowCreateModal(false);
      refreshPosts();
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setMediaError(`Could not publish post: ${err.message || 'Please verify database connection.'}`);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="pb-16 max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-3 relative"
    >
      {/* Segmented Top Switcher: Feed vs Search Tradespeople */}
      <div className={`p-1 rounded-2xl flex items-center border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        <button
          onClick={() => setActiveMainTab('feed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeMainTab === 'feed'
              ? 'bg-amber-500 text-slate-950 shadow font-black'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Site Feed</span>
        </button>
        <button
          onClick={() => {
            setActiveMainTab('people');
            if (peopleList.length === 0) {
              fetchPeople();
            }
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeMainTab === 'people'
              ? 'bg-amber-500 text-slate-950 shadow font-black'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Find Tradespeople</span>
        </button>
      </div>

      {activeMainTab === 'feed' ? (
        <>
          {(pullDistance > 10 || isRefreshing) && (
            <div className="flex items-center justify-center py-2 text-xs text-amber-500 font-bold transition-all">
              <div className="animate-spin mr-1.5">⚡</div>
              <span>{isRefreshing ? 'Syncing latest site posts from database...' : pullDistance > 60 ? 'Release to refresh feed' : 'Pull down to refresh'}</span>
            </div>
          )}
      {/* Top Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-xl ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <Flame className="w-48 h-48 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Irish Trades Community & Site Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Site Feed & Updates
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time updates, photos, and site notes from qualified tradespeople across Ireland.
          </p>

          <div className="pt-1">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create Post / Update</span>
            </button>
          </div>
        </div>
      </div>

      {/* ULTRA-COMPACT STREAMLINED FEED CONTROL CENTER */}
      <div
        className={`rounded-2xl p-2.5 shadow-sm space-y-2 border transition-colors w-full min-w-0 relative ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2 relative">
          <div
            className={`transition-all duration-300 ${
              isSearchFocused
                ? 'absolute inset-x-0 -top-0.5 z-40 flex items-center bg-slate-900 dark:bg-slate-900 rounded-xl'
                : 'flex-1 relative'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feed posts by keyword, trade, or author..."
              value={feedKeywordSearch}
              onChange={(e) => setFeedKeywordSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 shadow-md ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            {isSearchFocused && feedKeywordSearch && (
              <button
                type="button"
                onClick={() => setFeedKeywordSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className={`flex items-center space-x-1 shrink-0 transition-all duration-300 ${
              isSearchFocused ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            <button
              onClick={() => setFeedMode(feedMode === 'all' ? 'following' : 'all')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                feedMode === 'following'
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Toggle All vs Following"
            >
              {feedMode === 'following' ? `Following (${currentUser.followingUserIds.length})` : 'All Activity'}
            </button>

            <button
              onClick={() => setShowFiltersExpanded(!showFiltersExpanded)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                !selectedTrades.includes('All')
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Filter Trades"
            >
              <Filter className="w-3 h-3 text-amber-500" />
              <span>{selectedTrades.includes('All') ? 'Trades' : selectedTrades.length}</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post</span>
            </button>
          </div>
        </div>

        {/* Expandable Trade Filter Multi-Select Pill Bar */}
        {showFiltersExpanded && (
          <div className={`pt-2 border-t space-y-2 animate-fadeIn ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Select multiple trades to filter simultaneously:
              </span>
              <button
                onClick={() => setSelectedTrades(['All'])}
                className="text-amber-500 font-semibold hover:underline cursor-pointer"
              >
                Reset Trades
              </button>
            </div>

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => scrollTrades('left')}
                className={`p-1 rounded-xl border transition shrink-0 z-10 cursor-pointer mr-1 ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                ref={tradeScrollRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className={`flex-1 flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth select-none no-scrollbar scrollbar-none touch-pan-x overscroll-x-contain ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                {TRADE_FILTERS.map((trade) => {
                  const isChosen = selectedTrades.includes(trade) || (trade === 'All' && selectedTrades.includes('All'));
                  return (
                    <button
                      key={trade}
                      onClick={() => handleToggleTrade(trade)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                        isChosen
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{trade}</span>
                      {isChosen && trade !== 'All' && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollTrades('right')}
                className={`p-1 rounded-xl border transition shrink-0 z-10 cursor-pointer ml-1 ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {!selectedTrades.includes('All') && (
          <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-100'} text-xs`}>
            <span className={`flex items-center space-x-1.5 flex-wrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <span>Active multi-trade filter:</span>
              <strong className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                {selectedTrades.join(', ')}
              </strong>
            </span>
            <button
              onClick={() => setSelectedTrades(['All'])}
              className="text-slate-400 hover:text-amber-500 font-semibold cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL: SEE ALL TRADES ORGANIZED BY SOLAS SECTORS */}
      {showAllTradesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`border rounded-3xl max-w-xl w-full p-5 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} flex items-center space-x-2`}>
                  <span>Generation Apprenticeship Trades (Multi-Select)</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded">
                    National Framework
                  </span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select multiple trades to filter site activity and questions simultaneously
                </p>
              </div>
              <button
                onClick={() => setShowAllTradesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Electrician, Plumber, Carpentry, Welding..."
                  value={tradeSearchQuery}
                  onChange={(e) => setTradeSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedTrades(['All']);
                  setShowAllTradesModal(false);
                }}
                className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                  selectedTrades.includes('All')
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900'
                }`}
              >
                <span>All Trades (Show Everything)</span>
                {selectedTrades.includes('All') && <Check className="w-4 h-4" />}
              </button>

              {GENERATION_APPRENTICESHIP_SECTORS.map((sector) => {
                const matchingTrades = sector.trades.filter((t) =>
                  tradeSearchQuery.trim()
                    ? t.toLowerCase().includes(tradeSearchQuery.toLowerCase())
                    : true
                );

                if (matchingTrades.length === 0) return null;

                return (
                  <div key={sector.sector} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                      {sector.sector}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {matchingTrades.map((t) => {
                        const isChosen = selectedTrades.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleToggleTrade(t)}
                            className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                              isChosen
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                : isDark
                                ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-200'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{t}</span>
                            {isChosen && <Check className="w-3.5 h-3.5 shrink-0 ml-1 font-bold" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`pt-3 border-t flex justify-end ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setShowAllTradesModal(false)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Apply Filters ({selectedTrades.includes('All') ? 'All' : selectedTrades.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Post List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div
            className={`rounded-2xl p-8 text-center space-y-2 border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <p className="text-sm">
              {feedMode === 'following'
                ? "No posts from tradespeople you follow in this trade or radius."
                : "No site updates found for selected trades."}
            </p>
            <button
              onClick={() => {
                setSelectedTrades(['All']);
                setFeedMode('all');
                setSelectedRadiusKm('all');
              }}
              className="text-amber-500 text-xs font-semibold hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const distanceKm = calculateHaversineDistanceKm(
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: post.location.latitude, longitude: post.location.longitude }
            );
            const isAuthor = post.userId === currentUser.id;
            const comments = storageService.getCommentsForPost(post.id);
            const isCommentsOpen = expandedCommentsPostId === post.id;
            const isFollowingAuthor = currentUser.followingUserIds.includes(post.userId);

            const authorProfile = storageService.getUserById(post.userId) || {
              id: post.userId,
              name: post.userName,
              handle: post.userHandle,
              trade: post.userTrade,
              hasSafePass: post.hasSafePass,
              apprenticePhase: post.userPhase,
              avatar: post.userAvatar,
              location: post.location,
              yearsExperience: 5,
              bio: '',
              phone: '',
              email: '',
              hasCifBadge: false,
              followingUserIds: [],
              followersCount: 10,
              portfolio: [],
              workHistory: [],
            };

            return (
              <article
                key={post.id}
                className={`rounded-2xl border shadow-sm transition space-y-3.5 p-4 sm:p-5 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onOpenUserProfile(authorProfile as UserProfile)}
                      className="cursor-pointer group relative"
                      title="View user profile & credentials"
                    >
                      {post.userAvatar ? (
                        <img
                          src={post.userAvatar}
                          alt={post.userName}
                          className="w-11 h-11 rounded-full object-cover border-2 border-amber-500/60 group-hover:border-amber-400 transition"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-800 text-amber-500 border-2 border-amber-500/60 flex items-center justify-center font-bold text-xs select-none">
                          {post.userName ? post.userName.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <button
                          onClick={() => onOpenUserProfile(authorProfile as UserProfile)}
                          className={`font-black text-sm text-left hover:text-amber-500 transition cursor-pointer ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {post.userName}
                        </button>
                        {isFollowingAuthor && !isAuthor && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            Following
                          </span>
                        )}
                        {post.hasSafePass && (
                          <span
                            className="inline-flex items-center space-x-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded"
                            title="Safe Pass Certified & Validated"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Safe Pass</span>
                          </span>
                        )}
                        {post.userPhase && (
                          <span className="text-[10px] bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold px-1.5 py-0.2 rounded">
                            Phase {post.userPhase}
                          </span>
                        )}
                        {post.userLevel && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold px-1.5 py-0.2 rounded">
                            {post.userLevel}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center space-x-2 text-[11px] mt-0.5 flex-wrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="text-amber-500 font-semibold">{post.userTrade}</span>
                        <span>•</span>
                        <span>{post.createdAt}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>
                            {post.location.town} ({distanceKm} km away)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAuthor && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEditPost(post)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'
                        }`}
                        title="Edit post"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                        }`}
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {editingPostId === post.id ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={editPostText}
                      onChange={(e) => setEditPostText(e.target.value)}
                      rows={3}
                      className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEditPost(post.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {post.content}
                  </p>
                )}

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    {post.mediaType === 'video' ? (
                      <div className="relative">
                        <video
                          src={post.mediaUrls[0]}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full max-h-96 object-contain mx-auto"
                        />
                        {post.videoDurationSeconds && (
                          <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded border border-amber-500/40 flex items-center space-x-1 pointer-events-none">
                            <Clock className="w-3 h-3" />
                            <span>{post.videoDurationSeconds.toFixed(1)}s (Max 30s)</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <img
                        src={post.mediaUrls[0]}
                        alt="Work capture"
                        className="w-full max-h-96 object-cover hover:scale-[1.01] transition duration-200"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}

                <div
                  className={`flex items-center justify-between pt-2 border-t text-xs ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-1.5 transition cursor-pointer ${
                        post.likedByCurrentUser
                          ? 'text-red-500 font-bold'
                          : isDark
                          ? 'hover:text-red-400'
                          : 'hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.likedByCurrentUser ? 'fill-red-500' : ''}`}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedCommentsPostId(isCommentsOpen ? null : post.id)
                      }
                      className={`flex items-center space-x-1.5 transition cursor-pointer ${
                        isDark ? 'hover:text-white' : 'hover:text-slate-900'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{comments.length}</span>
                    </button>

                    <div className="flex items-center space-x-1 opacity-80" title="Post Views Tracker">
                      <Eye className="w-4 h-4" />
                      <span>{post.viewsCount || 142} views</span>
                    </div>

                    <button
                      onClick={async () => {
                        const shareData = {
                          title: `Crafted TradeNet Ireland - Post by ${post.userName}`,
                          text: post.content,
                          url: window.location.href,
                        };
                        try {
                          if (navigator.share) {
                            await navigator.share(shareData);
                          } else {
                            await navigator.clipboard.writeText(`${post.content}\n\nShared via Crafted TradeNet Ireland`);
                            alert('Post content copied to clipboard successfully!');
                          }
                        } catch (err) {
                          console.log('Share canceled or failed', err);
                        }
                      }}
                      className={`flex items-center space-x-1.5 transition cursor-pointer ${
                        isDark ? 'hover:text-amber-400' : 'hover:text-amber-600'
                      }`}
                      title="Share Post"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {post.tradeTag && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{post.tradeTag.replace(/\s+/g, '')}
                    </span>
                  )}
                </div>

                {isCommentsOpen && (
                  <div
                    className={`pt-3 border-t space-y-3 ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    {comments.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {comments.map((comment) => {
                          const isCommentAuthor = comment.userId === currentUser.id;
                          return (
                            <div
                              key={comment.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {comment.userName}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {comment.createdAt}
                                  </span>
                                  {isCommentAuthor && (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleStartEditComment(comment)}
                                        className="text-amber-500 font-semibold hover:underline cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-red-400 hover:text-red-500 font-semibold cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {editingCommentId === comment.id ? (
                                <div className="space-y-2 pt-1">
                                  <input
                                    type="text"
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    className={`w-full p-2 rounded-lg border text-xs ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="text-slate-400 hover:text-white text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveEditComment(comment.id)}
                                      className="text-amber-500 font-bold text-[11px]"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{comment.text}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Add on-site advice or comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold p-2 rounded-xl transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
        </>
      ) : (
        /* FIND TRADESPEOPLE DIRECTORY */
        <div className="space-y-3 animate-fadeIn">
          {/* Search Bar & Filters Card */}
          <div
            className={`rounded-2xl p-3 shadow-sm border space-y-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by trade, name, handle (@...), or Irish town..."
                  value={peopleSearchQuery}
                  onChange={(e) => setPeopleSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchPeople(peopleSearchQuery);
                    }
                  }}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 shadow-inner ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                  }`}
                />
                {peopleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeopleSearchQuery('');
                      fetchPeople('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchPeople(peopleSearchQuery)}
                disabled={isLoadingPeople}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
              >
                {isLoadingPeople ? (
                  <span className="animate-spin text-sm">⚡</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Filter Dropdowns: Trade & County */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/30">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Trade Discipline
                </label>
                <select
                  value={peopleSelectedTrade}
                  onChange={(e) => setPeopleSelectedTrade(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-amber-500 cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="All">All Trades & Disciplines</option>
                  <option value="Electrical">Electrical / Electrician</option>
                  <option value="Plumbing">Plumbing & Heating</option>
                  <option value="Carpentry">Carpentry & Joinery</option>
                  <option value="Bricklaying">Bricklaying / Masonry</option>
                  <option value="Plastering">Plastering & Drylining</option>
                  <option value="Painting">Painting & Decorating</option>
                  <option value="Roofing">Roofing & Cladding</option>
                  <option value="Mechanical">Mechanical Automation</option>
                  <option value="Refrigeration">Refrigeration & AC</option>
                  <option value="Scaffolding">Scaffolding</option>
                  <option value="General Operative">General Operative</option>
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Irish County
                </label>
                <select
                  value={peopleSelectedCounty}
                  onChange={(e) => setPeopleSelectedCounty(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-amber-500 cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="All">All 32 Irish Counties</option>
                  {['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kildare', 'Meath', 'Wicklow', 'Louth', 'Wexford', 'Kilkenny', 'Carlow', 'Laois', 'Offaly', 'Westmeath', 'Longford', 'Tipperary', 'Clare', 'Kerry', 'Mayo', 'Roscommon', 'Sligo', 'Leitrim', 'Donegal', 'Cavan', 'Monaghan'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'apprentice', label: 'Apprentices' },
                { id: 'qualified', label: 'Qualified' },
                { id: 'business', label: 'Contractors / Co.' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPeopleSelectedRole(r.id as any)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    peopleSelectedRole === r.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between px-1">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {filteredPeople.length} {filteredPeople.length === 1 ? 'Tradesperson' : 'Tradespeople'} Found
            </span>
            {(peopleSelectedTrade !== 'All' || peopleSelectedCounty !== 'All' || peopleSelectedRole !== 'all' || peopleSearchQuery) && (
              <button
                onClick={() => {
                  setPeopleSearchQuery('');
                  setPeopleSelectedTrade('All');
                  setPeopleSelectedCounty('All');
                  setPeopleSelectedRole('all');
                  fetchPeople('');
                }}
                className="text-xs text-amber-500 hover:underline cursor-pointer font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* People Cards Grid */}
          {isLoadingPeople ? (
            <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="animate-spin text-2xl text-amber-500 mb-2">⚡</div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Searching verified tradespeople across Ireland...
              </p>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                No Tradespeople Found
              </h4>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {storageService.getAppMode() === 'live'
                  ? 'No members matching this search are registered yet. Invite site colleagues to sign up and join your network!'
                  : 'Try expanding your trade or county filters to view more profiles.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPeople.map((person) => {
                const isFollowing = Boolean(followingMap[person.id]);
                const initials = person.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={person.id}
                    className={`rounded-2xl p-3.5 border shadow-sm transition hover:border-amber-500/50 ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-3">
                      {/* Avatar & Info */}
                      <button
                        onClick={() => onOpenUserProfile(person)}
                        className="flex items-start space-x-3 text-left cursor-pointer group flex-1 min-w-0"
                      >
                        {person.avatar ? (
                          <img
                            src={person.avatar}
                            alt={person.name}
                            className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className={`text-sm font-bold group-hover:text-amber-500 transition truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {person.name}
                            </span>
                            {person.hasSafePass && (
                              <span
                                title="Safe Pass Verified"
                                className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0"
                              >
                                <ShieldCheck className="w-3 h-3 mr-0.5" />
                                Safe Pass
                              </span>
                            )}
                          </div>

                          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                            @{person.handle} • <span className="font-semibold text-amber-500">{person.trade}</span>
                          </div>

                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400 flex-wrap gap-y-1">
                            <span className="flex items-center space-x-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>
                                {person.location?.town ? `${person.location.town}, Co. ${person.location.county}` : (person.location?.county || 'Ireland')}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              {person.yearsExperience > 0
                                ? `${person.yearsExperience} yrs on site`
                                : person.isApprentice
                                ? `Apprentice (${person.apprenticePhase || 'Phase 1'})`
                                : 'New to trade'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleFollow(person)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                            isFollowing
                              ? isDark
                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                              : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleStartMessageWithUser(person)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center space-x-1 ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                              : 'bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                          title="Send Direct Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                          <span className="hidden sm:inline">Message</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Post */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`border rounded-3xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Share Site Update or Technical Query</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tag Generation Apprenticeship Discipline
                </label>
                <select
                  value={newTradeTag}
                  onChange={(e) => setNewTradeTag(e.target.value as TradeType)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  {GENERATION_APPRENTICESHIP_SECTORS.map((sector) => (
                    <optgroup key={sector.sector} label={sector.sector}>
                      {sector.trades.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  User Level / Persona
                </label>
                <select
                  value={newUserLevel}
                  onChange={(e) => setNewUserLevel(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Apprentice">Apprentice</option>
                  <option value="Qualified Tradesperson">Qualified Tradesperson</option>
                  <option value="Employer / Contractor">Employer / Contractor</option>
                  <option value="Tool / Material Supplier">Tool / Material Supplier</option>
                </select>
              </div>

              <div>
                <textarea
                  rows={4}
                  placeholder="Describe the job, conduit runs, press-fit fittings, timber details, or site challenges..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              {/* Media Upload Box with 2 Buttons: Camera and Gallery */}
              <div
                className={`border border-dashed rounded-2xl p-4 text-center space-y-3 ${
                  isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-300 bg-slate-50'
                }`}
              >
                {/* Hidden File Inputs: Photo Camera, Video Camera (30s), and Gallery */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="video/*"
                  capture="environment"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <input
                  type="file"
                  id="gallery-picker-input"
                  accept="image/*,video/*"
                  onChange={handleFilePick}
                  className="hidden"
                />

                <div className="grid grid-cols-3 gap-2">
                  {/* Photo Camera Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer transition ${
                      selectedMediaType === 'image'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : isDark
                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1 text-amber-500" />
                    <span className="font-bold text-[11px]">Take Photo</span>
                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Camera Capture</span>
                  </button>

                  {/* Video Camera Button (30s Limit) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (galleryInputRef.current) {
                        galleryInputRef.current.click();
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer transition ${
                      selectedMediaType === 'video'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : isDark
                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1 text-red-400" />
                    <span className="font-bold text-[11px]">Record 30s Video</span>
                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max 30s Clip</span>
                  </button>

                  {/* Gallery Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('gallery-picker-input');
                      if (input) input.click();
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer transition ${
                      selectedMediaType !== 'none'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : isDark
                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 mb-1 text-sky-400" />
                    <span className="font-bold text-[11px]">From Gallery</span>
                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Photos & Videos</span>
                  </button>
                </div>

                {isProcessingMedia && (
                  <div className="text-amber-500 text-xs font-semibold animate-pulse">
                    Processing media file...
                  </div>
                )}

                {mediaStatusMsg && (
                  <div className="text-emerald-500 text-xs font-semibold bg-emerald-500/15 p-2 rounded-xl">
                    {mediaStatusMsg}
                  </div>
                )}

                {mediaError && (
                  <div className="text-red-400 text-xs font-semibold bg-red-500/15 p-2 rounded-xl flex items-center justify-center space-x-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mediaError}</span>
                  </div>
                )}

                {mediaUrls.length > 0 && (
                  <div className="relative mt-2 rounded-xl overflow-hidden max-h-48 bg-slate-950 border border-slate-700">
                    {selectedMediaType === 'video' ? (
                      <video src={mediaUrls[0]} controls className="w-full max-h-48 object-contain" />
                    ) : (
                      <img src={mediaUrls[0]} alt="Preview" className="w-full max-h-48 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrls([]);
                        setSelectedMediaType('none');
                        setVideoDuration(undefined);
                        setMediaStatusMsg(null);
                      }}
                      className="absolute top-2 right-2 bg-black/80 text-white p-1 rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim() || isProcessingMedia}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  Publish to Trade Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};