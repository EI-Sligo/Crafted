import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  MapPin,
  Tag,
  MessageCircle,
  X,
  CheckCircle,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MarketplaceItem, UserProfile, GeoLocation, CLASSIFIEDS_TIERS } from '../types';
import { storageService, compressImageFile } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { calculateHaversineDistanceKm } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';

interface MarketplaceTabProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onOpenChatWithItem: (conversationId: string) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onTriggerStripeCheckout: (item: { title: string; priceEuros: number; type: 'boost' | 'subscription' | 'job'; itemId?: string }) => void;
}

const CATEGORIES = [
  'All',
  'Tools',
  'Power Tools',
  'Vans & Vehicles',
  'Materials',
  'Safety Gear',
  'Testing Equipment',
];

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
  currentUser,
  currentLocation,
  onOpenChatWithItem,
  onOpenUserProfile,
  onTriggerStripeCheckout,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [items, setItems] = useState<MarketplaceItem[]>(storageService.getMarketplaceItems());
  const [offlineStatus, setOfflineStatus] = useState(storageService.getCachedMarketplaceWithStatus());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<MarketplaceItem | null>(null);

  // New item form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState<number>(150);
  const [formCategory, setFormCategory] = useState<MarketplaceItem['category']>('Power Tools');
  const [formCondition, setFormCondition] = useState<MarketplaceItem['condition']>('Good Working Order');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formTierIndex, setFormTierIndex] = useState<number>(0); // 0 = €0.99, 1 = €2.99, 2 = €4.99
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const refreshItems = () => {
    storageService.updateSyncTimestamp();
    const status = storageService.getCachedMarketplaceWithStatus();
    setItems(status.items);
    setOfflineStatus(status);
  };

  useEffect(() => {
    let isMounted = true;
    supabaseService
      .getMarketplaceItems()
      .then((remote) => {
        if (isMounted && remote) {
          setItems(remote);
        }
      })
      .catch((err) => {
        console.warn('Initial marketplace fetch failed:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await storageService.syncWithSupabase();
      refreshItems();
    } catch (e) {
      console.error(e);
      refreshItems();
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

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (maxPrice !== '' && item.price > Number(maxPrice)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchLoc = item.location.town.toLowerCase().includes(q) || item.location.county.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }
    return true;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(files[0], 1000, 0.75);
      setFormImages([compressed]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formPrice <= 0) return;

    const chosenTier = CLASSIFIEDS_TIERS[formTierIndex];
    const isBoosted = formTierIndex > 0;

    try {
      const newItem = await supabaseService.createMarketplaceItem({
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        sellerAvatar: currentUser.avatar,
        sellerTrade: currentUser.trade,
        sellerPhone: currentUser.phone,
        title: formTitle.trim(),
        description: formDesc.trim(),
        price: formPrice,
        category: formCategory,
        condition: formCondition,
        location: currentLocation,
        images:
          formImages.length > 0
            ? formImages
            : ['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80'],
        tier: formTierIndex === 2 ? 'premium' : formTierIndex === 1 ? 'boosted' : 'standard',
        isBoosted,
        boostExpiresAt: isBoosted
          ? new Date(Date.now() + (formTierIndex === 2 ? 14 : 7) * 86400000).toISOString()
          : undefined,
        isSold: false,
      });

      // Trigger Stripe SaaS checkout for the selected tier (€0.99 / €2.99 / €4.99)
      onTriggerStripeCheckout({
        title: `${chosenTier.name} for "${newItem.title}"`,
        priceEuros: chosenTier.priceEuros,
        type: 'boost',
        itemId: newItem.id,
      });

      setFormTitle('');
      setFormDesc('');
      setFormImages([]);
      setFormTierIndex(0);
      setShowCreateModal(false);
      refreshItems();
    } catch (err: any) {
      console.error('Failed to create marketplace item:', err);
      alert(`Could not create classified listing in database: ${err.message || 'Please check connection'}`);
    }
  };

  const handleMessageSeller = (item: MarketplaceItem) => {
    const convId = storageService.startOrOpenConversationWithSeller(item);
    onOpenChatWithItem(convId);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="pb-16 max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 relative"
    >
      {(pullDistance > 10 || isRefreshing) && (
        <div className="flex items-center justify-center py-2 text-xs text-amber-500 font-bold transition-all">
          <div className="animate-spin mr-1.5">⚡</div>
          <span>{isRefreshing ? 'Syncing latest classifieds from database...' : pullDistance > 60 ? 'Release to refresh items' : 'Pull down to refresh'}</span>
        </div>
      )}
      {/* Top Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-xl ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <Tag className="w-48 h-48 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Gear & Tool Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Trades Classifieds
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Verified tools, vans, copper, and plant machinery from Irish tradespeople.
          </p>

          <div className="pt-1">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Post Gear for Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Card */}
      <div className={`rounded-2xl p-4 border space-y-3 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Search input and price filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search Makita, Rothenberger, Fluke, Transit vans, generators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="relative">
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`}>
              Max €
            </span>
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className={`w-full pl-16 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Masonry Grid */}
      {filteredItems.length === 0 ? (
        <div className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'} border rounded-2xl p-12 text-center`}>
          <Tag className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm">No classifieds match your criteria.</p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setMaxPrice('');
            }}
            className="mt-3 text-amber-500 text-xs font-semibold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const distanceKm = calculateHaversineDistanceKm(
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: item.location.latitude, longitude: item.location.longitude }
            );
            const isMyItem = item.sellerId === currentUser.id;

            return (
              <div
                key={item.id}
                className={`${isDark ? 'bg-slate-900' : 'bg-white'} border rounded-2xl overflow-hidden shadow-sm flex flex-col transition hover:border-slate-500 ${
                  item.isBoosted
                    ? 'border-amber-500 ring-1 ring-amber-500/40'
                    : isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                {/* Image Container with Badges */}
                <div className="relative aspect-video bg-black/60 overflow-hidden">
                  <img
                    src={item.images[0] || 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    loading="lazy"
                  />

                  {/* Boosted Gold Badge */}
                  {item.isBoosted && (
                    <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md">
                      <Sparkles className="w-3 h-3 fill-slate-950" />
                      <span>FEATURED (€5 BOOST)</span>
                    </div>
                  )}

                  {/* Condition badge */}
                  <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700/60">
                    {item.condition}
                  </span>

                  {/* Price Tag */}
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-950/90 text-amber-400 font-black text-sm px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-lg">
                    €{item.price.toLocaleString()}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm line-clamp-1 mb-1`}>
                      {item.title}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} line-clamp-2 leading-relaxed mb-2.5`}>
                      {item.description}
                    </p>
                  </div>

                  <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
                    {/* Location & Seller info */}
                    <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="flex items-center space-x-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location.town} ({distanceKm} km)</span>
                      </span>
                      <button
                        onClick={() => {
                          const sellerUser = storageService.getUserById(item.sellerId);
                          if (sellerUser) onOpenUserProfile(sellerUser);
                        }}
                        className="text-amber-500 hover:underline font-medium truncate cursor-pointer text-left"
                        title="View Seller Profile"
                      >
                        {item.sellerName}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-1">
                      {isMyItem ? (
                        <>
                          {!item.isBoosted && (
                            <button
                              onClick={() => {
                                onTriggerStripeCheckout({
                                  title: `7-Day Boost for "${item.title}"`,
                                  priceEuros: 2.99,
                                  type: 'boost',
                                  itemId: item.id,
                                });
                              }}
                              className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/40 text-xs font-bold py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <Flame className="w-3.5 h-3.5 text-amber-500" />
                              <span>Boost (€2.99)</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              storageService.deleteMarketplaceItem(item.id);
                              refreshItems();
                            }}
                            className={`${isDark ? 'bg-slate-800 hover:bg-red-500/20 text-slate-400 border-slate-700' : 'bg-slate-100 hover:bg-red-100 text-slate-600 border-slate-200'} hover:text-red-600 text-xs py-1.5 px-3 rounded-xl border transition`}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleMessageSeller(item)}
                          className={`w-full ${isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'} hover:bg-amber-500 hover:text-slate-950 border text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Message Seller</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Post New Classified Item */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-4`}>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'} flex items-center space-x-2`}>
                <span>Post Gear or Vehicle on Classifieds</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Item Title (Make, Model, Specs)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milwaukee M18 Fuel Twin Kit with 2x 5Ah Batteries"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400`}
                  >
                    <option value="Tools">Tools</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Vans & Vehicles">Vans & Vehicles</option>
                    <option value="Materials">Materials</option>
                    <option value="Testing Equipment">Testing Equipment</option>
                    <option value="Safety Gear">Safety Gear</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Condition
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as any)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400`}
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good Working Order">Good Working Order</option>
                    <option value="Needs Service">Needs Service</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Price in Euros (€)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Description & Specs
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify age, accessories, calibration dates, receipts, or inspection availability..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl p-3 text-xs focus:outline-none focus:border-amber-400 leading-relaxed`}
                  required
                />
              </div>

              {/* Photo Upload with Compression */}
              <div className={`border border-dashed ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-300 bg-slate-50'} rounded-xl p-3 text-center`}>
                <input
                  type="file"
                  id="marketplace-photo"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="marketplace-photo"
                  className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white flex flex-col items-center justify-center space-y-1"
                >
                  <span className="font-semibold text-amber-500">+ Upload Tool/Vehicle Photo</span>
                  <span className="text-[10px] text-slate-400">
                    Automatically compressed client-side
                  </span>
                </label>
                {isCompressing && (
                  <p className="text-xs text-amber-500 mt-1">Compressing image...</p>
                )}
                {formImages.length > 0 && (
                  <img
                    src={formImages[0]}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded-lg border border-slate-300 dark:border-slate-700 mx-auto"
                  />
                )}
              </div>

              {/* 3 TIERS of Pricing starting at €0.99 */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-amber-500 mb-1.5 uppercase tracking-wider">
                  Select Classified Placement Tier (From €0.99)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CLASSIFIEDS_TIERS.map((tier, idx) => {
                    const isSelected = formTierIndex === idx;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setFormTierIndex(idx)}
                        className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500'
                            : isDark
                            ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{tier.name}</span>
                            {tier.isPopular && (
                              <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded">
                                POPULAR
                              </span>
                            )}
                          </div>
                          <div className="text-base font-black text-amber-500 font-mono mt-1">
                            €{tier.priceEuros.toFixed(2)}
                          </div>
                          <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tier.durationText}</div>
                        </div>
                        <ul className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-2 space-y-0.5`}>
                          {tier.features.slice(0, 2).map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-end space-x-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim() || isCompressing}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  Proceed & Pay €{CLASSIFIEDS_TIERS[formTierIndex].priceEuros.toFixed(2)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
