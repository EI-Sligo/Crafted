import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TabType, TabBar } from './components/TabBar';
import { Navbar } from './components/Navbar';
import { storageService, subscribeToStore } from './services/storage';
import { authService } from './services/authService';
import { stripeSubscriptionManager } from './services/stripeSubscriptionManager';
import { IRISH_LOCATIONS } from './data/seedData';
import { GeoLocation, UserProfile } from './types';
import { useTheme } from './context/ThemeContext';
import { autoDetectLocation } from './services/locationService';
import { APP_CONFIG } from './config/appConfig';

// Lazy-loaded major tab components for effective bundle splitting & faster load times
const FeedTab = lazy(() => import('./components/FeedTab').then((m) => ({ default: m.FeedTab })));
const MarketplaceTab = lazy(() => import('./components/MarketplaceTab').then((m) => ({ default: m.MarketplaceTab })));
const JobsTab = lazy(() => import('./components/JobsTab').then((m) => ({ default: m.JobsTab })));
const CoursesTab = lazy(() => import('./components/CoursesTab').then((m) => ({ default: m.CoursesTab })));
const MessagesTab = lazy(() => import('./components/MessagesTab').then((m) => ({ default: m.MessagesTab })));
const ProfileTab = lazy(() => import('./components/ProfileTab').then((m) => ({ default: m.ProfileTab })));

// Lazy-loaded authentication & secondary modals
const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));
const UserProfileModal = lazy(() => import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const StolenGearAlertModal = lazy(() => import('./components/StolenGearAlertModal').then((m) => ({ default: m.StolenGearAlertModal })));
const StripeCheckoutModal = lazy(() => import('./components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal })));
const BuildInfoModal = lazy(() => import('./components/BuildInfoModal').then((m) => ({ default: m.BuildInfoModal })));
const SolasLogbookModal = lazy(() => import('./components/SolasLogbookModal').then((m) => ({ default: m.SolasLogbookModal })));

const TabLoadingFallback: React.FC = () => (
  <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3">
    <div className="relative">
      <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
      </div>
    </div>
    <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
      Loading TradeNet...
    </span>
  </div>
);

export default function App() {
  const { isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.getSession().isAuthenticated);
  const [currentUser, setCurrentUser] = useState<UserProfile>(storageService.getCurrentUser());

  // Cached or initial location
  const cachedLocationPrefs = storageService.getLocationPrefs();
  const [currentLocation, setCurrentLocation] = useState<GeoLocation>(
    cachedLocationPrefs?.location || currentUser.location || IRISH_LOCATIONS[0]
  );
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [unreadCount, setUnreadCount] = useState<number>(storageService.getTotalUnreadMessages());
  const [activeChatConvId, setActiveChatConvId] = useState<string | null>(null);

  // GPS / Network Auto-location state
  const [isGpsAuto, setIsGpsAuto] = useState<boolean>(cachedLocationPrefs?.isAuto ?? false);
  const [locationSource, setLocationSource] = useState<string>(cachedLocationPrefs?.source || 'manual');
  const [locationMethodDesc, setLocationMethodDesc] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState<string | null>(null);

  // Selected user for profile modal & follow/bucket actions
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);

  // Modals state
  const [isStolenModalOpen, setIsStolenModalOpen] = useState(false);
  const [isReportingStolen, setIsReportingStolen] = useState(false);
  const [isBuildInfoOpen, setIsBuildInfoOpen] = useState(false);
  const [isSolasModalGlobalOpen, setIsSolasModalGlobalOpen] = useState(false);
  const [stripeItem, setStripeItem] = useState<{
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
    itemId?: string;
  } | null>(null);

  // Stolen radar alerts count in 50km
  const nearbyAlerts = storageService.getNearbyStolenAlerts(currentLocation, 50);
  const [stripeBannerMsg, setStripeBannerMsg] = useState<string | null>(null);

  // Handle return from official Stripe hosted checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === 'true') {
      const type = params.get('type') || '';
      const itemId = params.get('item_id') || '';

      if (type === 'boost' && itemId) {
        storageService.boostMarketplaceItem(itemId);
      } else if (type === 'subscription' || type === 'job' || type === 'stolen') {
        const tier = stripeSubscriptionManager.getTierById(itemId || '') || {
          id: itemId || 'custom_tier',
          name: 'Stripe Verified Placement',
          priceEuros: 19.99,
          durationText: 'Active Placement',
          features: [],
        };
        stripeSubscriptionManager.subscribeUser(currentUser.id, tier, 'monthly');
      }

      setStripeBannerMsg('✓ Stripe Payment Verified: Placement is now live across Ireland!');
      setTimeout(() => setStripeBannerMsg(null), 6000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser.id]);

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      const session = authService.getSession();
      setIsAuthenticated(session.isAuthenticated);
      setCurrentUser(storageService.getCurrentUser());
      setUnreadCount(storageService.getTotalUnreadMessages());
    });
    return () => unsubscribe();
  }, []);

  // Automatic Multi-Tier Location Detection on initial mount
  useEffect(() => {
    const prefs = storageService.getLocationPrefs();
    if (!prefs || prefs.isAuto) {
      setGpsLoading(true);
      autoDetectLocation({ gpsTimeoutMs: 4000 })
        .then((result) => {
          setGpsLoading(false);
          if (result.isAuto) {
            setCurrentLocation(result.location);
            setIsGpsAuto(true);
            setLocationSource(result.source);
            setLocationMethodDesc(result.methodDescription);
            const updated = { ...currentUser, location: result.location };
            setCurrentUser(updated);
            storageService.updateCurrentUser(updated);
          }
        })
        .catch((err) => {
          setGpsLoading(false);
          console.warn('Initial auto-location detection error:', err);
        });
    }
  }, []);

  const handleDetectGpsLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    setGpsSuccessMessage(null);

    try {
      const result = await autoDetectLocation({ preferGps: true, gpsTimeoutMs: 5000 });
      setGpsLoading(false);
      setCurrentLocation(result.location);
      setIsGpsAuto(result.isAuto);
      setLocationSource(result.source);
      setLocationMethodDesc(result.methodDescription);

      const updated = { ...currentUser, location: result.location };
      setCurrentUser(updated);
      storageService.updateCurrentUser(updated);

      setGpsSuccessMessage(`Auto-detected: ${result.location.town}, Co. ${result.location.county} (${result.methodDescription})`);
      setTimeout(() => setGpsSuccessMessage(null), 5000);
    } catch (err: any) {
      setGpsLoading(false);
      setGpsError('Could not retrieve location via GPS or Network. Please pick your town from the list.');
    }
  };

  const handleOpenChatWithItem = (conversationId: string) => {
    setActiveChatConvId(conversationId);
    setActiveTab('messages');
  };

  const handleLocationChange = (newLoc: GeoLocation) => {
    setCurrentLocation(newLoc);
    setIsGpsAuto(false);
    setLocationSource('manual');
    setLocationMethodDesc('Manually selected');
    setGpsError(null);
    setGpsSuccessMessage(null);

    storageService.saveLocationPrefs({
      location: newLoc,
      isAuto: false,
      source: 'manual',
    });

    const updated = { ...currentUser, location: newLoc };
    setCurrentUser(updated);
    storageService.updateCurrentUser(updated);
  };

  const handleOpenUserProfile = (user: UserProfile) => {
    setSelectedUserProfile(user);
  };

  // If not authenticated, render Login & Registration screen
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <LoginPage
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }}
        />
      </Suspense>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <FeedTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onOpenUserProfile={handleOpenUserProfile}
          />
        );
      case 'marketplace':
        return (
          <MarketplaceTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onOpenChatWithItem={handleOpenChatWithItem}
            onOpenUserProfile={handleOpenUserProfile}
            onTriggerStripeCheckout={(item) => setStripeItem(item)}
          />
        );
      case 'jobs':
        return (
          <JobsTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onOpenChatWithJob={handleOpenChatWithItem}
            onOpenUserProfile={handleOpenUserProfile}
            onTriggerStripeCheckout={(item) => setStripeItem(item)}
          />
        );
      case 'courses':
        return (
          <CoursesTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onOpenUserProfile={handleOpenUserProfile}
            onTriggerStripeCheckout={(item) => setStripeItem(item)}
          />
        );
      case 'messages':
        return (
          <MessagesTab
            currentUser={currentUser}
            initialConversationId={activeChatConvId}
            onSelectConversation={(id) => setActiveChatConvId(id)}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onTriggerStripeCheckout={(item) => setStripeItem(item)}
            onOpenUserProfile={handleOpenUserProfile}
            onOpenConversation={handleOpenChatWithItem}
            isGpsAuto={isGpsAuto}
            onDetectGpsLocation={handleDetectGpsLocation}
            gpsLoading={gpsLoading}
            locationMethodDesc={locationMethodDesc}
            onLogout={() => {
              authService.logout();
              setIsAuthenticated(false);
            }}
          />
        );
      default:
        return (
          <FeedTab
            currentUser={currentUser}
            currentLocation={currentLocation}
            onOpenUserProfile={handleOpenUserProfile}
            onOpenConversation={handleOpenChatWithItem}
          />
        );
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors pb-20 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Global Navbar */}
      <Navbar
        currentUser={currentUser}
        currentLocation={currentLocation}
        onLocationChange={handleLocationChange}
        nearbyAlertsCount={nearbyAlerts.length}
        onOpenStolenAlerts={() => {
          setIsReportingStolen(false);
          setIsStolenModalOpen(true);
        }}
        onOpenReportStolen={() => {
          setIsReportingStolen(true);
          setIsStolenModalOpen(true);
        }}
        isMobileFrameMode={false}
        onToggleFrameMode={() => {}}
        onOpenBuildInfo={() => setIsBuildInfoOpen(true)}
        isGpsAuto={isGpsAuto}
        onDetectGpsLocation={handleDetectGpsLocation}
        gpsLoading={gpsLoading}
        gpsError={gpsError}
        locationMethodDesc={locationMethodDesc}
        gpsSuccessMessage={gpsSuccessMessage}
        onNavigateToProfile={() => setActiveTab('profile')}
        onNavigateToMessages={() => setActiveTab('messages')}
        onNavigateToJobs={() => setActiveTab('jobs')}
        onOpenSolasLogbook={() => setIsSolasModalGlobalOpen(true)}
        onLogout={() => {
          authService.logout();
          setIsAuthenticated(false);
        }}
      />

      {/* Main Responsive Container */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        {stripeBannerMsg && (
          <div className="w-full bg-emerald-600 text-white py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 shadow-md">
            <span>{stripeBannerMsg}</span>
          </div>
        )}
        <div className="w-full flex-1 flex flex-col">
          <Suspense fallback={<TabLoadingFallback />}>
            <div className="flex-1 w-full">{renderActiveTabContent()}</div>
          </Suspense>
        </div>
      </main>

      {/* Fixed Bottom Tab Bar locked to viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full">
        <TabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'messages') setActiveChatConvId(null);
          }}
          unreadCount={unreadCount}
          hasSafePass={currentUser.hasSafePass}
        />
      </div>

      {/* Modals wrapped in Suspense for zero initial bundle overhead */}
      <Suspense fallback={null}>
        {/* User Profile & Follow / Custom Bucket Modal */}
        {selectedUserProfile && (
          <UserProfileModal
            isOpen={Boolean(selectedUserProfile)}
            user={selectedUserProfile}
            currentUser={currentUser}
            onClose={() => setSelectedUserProfile(null)}
            onOpenDirectMessage={(targetUser: UserProfile) => {
              setSelectedUserProfile(null);
              const convId = storageService.startOrOpenConversationWithUser(targetUser, {
                tag: 'Direct Chat',
                type: 'general',
              });
              handleOpenChatWithItem(convId);
            }}
          />
        )}

        {/* Stolen Gear Red Alert Modal */}
        {isStolenModalOpen && (
          <StolenGearAlertModal
            isOpen={isStolenModalOpen}
            onClose={() => setIsStolenModalOpen(false)}
            currentUser={currentUser}
            currentLocation={currentLocation}
            isReportingMode={isReportingStolen}
            onCloseReportMode={() => setIsReportingStolen(false)}
            onTriggerStripeCheckout={(item) => setStripeItem(item)}
          />
        )}

        {/* Stripe SaaS Checkout Modal */}
        {stripeItem && (
          <StripeCheckoutModal
            isOpen={Boolean(stripeItem)}
            onClose={() => setStripeItem(null)}
            item={stripeItem}
            onSuccess={() => {
              setCurrentUser(storageService.getCurrentUser());
            }}
          />
        )}

        {/* Architecture & Local Build Docs Modal */}
        {isBuildInfoOpen && (
          <BuildInfoModal
            isOpen={isBuildInfoOpen}
            onClose={() => setIsBuildInfoOpen(false)}
          />
        )}

        {/* Global SOLAS Logbook Modal */}
        {isSolasModalGlobalOpen && (
          <SolasLogbookModal
            isOpen={isSolasModalGlobalOpen}
            onClose={() => setIsSolasModalGlobalOpen(false)}
            user={currentUser}
            onUserUpdate={(updated) => setCurrentUser(updated)}
          />
        )}
      </Suspense>
    </div>
  );
}