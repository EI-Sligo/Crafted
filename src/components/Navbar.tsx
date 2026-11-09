import React, { useState } from 'react';
import {
  MapPin,
  AlertTriangle,
  Hammer,
  CheckCircle2,
  Navigation,
  Loader2,
  Search,
  Bell,
  User,
  LogOut,
  X,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Briefcase,
  CheckCheck,
} from 'lucide-react';
import { GeoLocation, UserProfile } from '../types';
import { IRISH_LOCATIONS, GLOBAL_LOCATIONS } from '../data/seedData';
import { useTheme } from '../context/ThemeContext';
import { storageService } from '../services/storage';
import { APP_CONFIG } from '../config/appConfig';

interface NavbarProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onLocationChange: (loc: GeoLocation) => void;
  nearbyAlertsCount: number;
  onOpenStolenAlerts: () => void;
  onOpenReportStolen: () => void;
  isMobileFrameMode: boolean;
  onToggleFrameMode: () => void;
  onOpenBuildInfo: () => void;
  isGpsAuto?: boolean;
  onDetectGpsLocation?: () => void;
  gpsLoading?: boolean;
  gpsError?: string | null;
  locationMethodDesc?: string;
  gpsSuccessMessage?: string | null;
  onNavigateToProfile: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToJobs?: () => void;
  onOpenSolasLogbook?: () => void;
  onLogout: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  isRead: boolean;
  type: 'stolen' | 'logbook' | 'message' | 'job';
  badgeColor: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentLocation,
  onLocationChange,
  nearbyAlertsCount,
  onOpenStolenAlerts,
  onOpenReportStolen,
  onOpenBuildInfo,
  isGpsAuto = false,
  onDetectGpsLocation,
  gpsLoading = false,
  gpsError = null,
  locationMethodDesc = '',
  gpsSuccessMessage = null,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToJobs,
  onOpenSolasLogbook,
  onLogout,
}) => {
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchTown, setSearchTown] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'IE' | 'UK' | 'EU' | 'US' | 'AU'>('ALL');
  const { isDark, toggleTheme } = useTheme();

  const isCompany = currentUser.accountType === 'business' || Boolean(currentUser.businessCategory);
  const isApprentice = !isCompany && (
    currentUser.isApprentice === true ||
    currentUser.trade.includes('Apprentice') ||
    (currentUser.isApprentice !== false && currentUser.apprenticePhase !== undefined && currentUser.apprenticePhase > 0)
  );

  // Initialize interactive notifications (only mock in demo mode, empty in live mode)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (storageService.getAppMode() === 'live') {
      return [];
    }
    return [
      {
        id: 'notif_1',
        title: 'Stolen Tool Radar Alert',
        desc: `Hilti Rotary Hammer reported stolen in ${currentLocation.town}. Tap to review stolen alert details.`,
        time: '10 mins ago',
        isRead: false,
        type: 'stolen',
        badgeColor: 'text-amber-500',
      },
      ...(isApprentice
        ? [
            {
              id: 'notif_2',
              title: 'Apprentice Logbook Signed Off',
              desc: 'Sisk Group approved Phase 4 conduit installation & containment competency.',
              time: '1 hour ago',
              isRead: false,
              type: 'logbook' as const,
              badgeColor: 'text-emerald-400',
            },
          ]
        : [
            {
              id: 'notif_2_job',
              title: 'Commercial Subcontract Match',
              desc: `New urgent subcontract match available near ${currentLocation.town}. Tap to inspect.`,
              time: '1 hour ago',
              isRead: false,
              type: 'job' as const,
              badgeColor: 'text-emerald-400',
            },
          ]),
      {
        id: 'notif_3',
        title: 'Direct Message Received',
        desc: "Liam O'Brien sent you a message regarding 1st Fix commercial subcontract agreements.",
        time: '3 hours ago',
        isRead: false,
        type: 'message',
        badgeColor: 'text-sky-400',
      },
    ];
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark clicked item as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setShowNotifMenu(false);

    // Route to destination
    if (item.type === 'stolen') {
      onOpenStolenAlerts();
    } else if (item.type === 'logbook') {
      if (onOpenSolasLogbook) {
        onOpenSolasLogbook();
      } else {
        onNavigateToProfile();
      }
    } else if (item.type === 'job') {
      if (onNavigateToJobs) {
        onNavigateToJobs();
      } else {
        onNavigateToProfile();
      }
    } else if (item.type === 'message') {
      if (onNavigateToMessages) {
        onNavigateToMessages();
      } else {
        onNavigateToProfile();
      }
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const allAvailableLocations: GeoLocation[] = React.useMemo(() => {
    const list: GeoLocation[] = [];
    const seen = new Set<string>();
    for (const loc of [...GLOBAL_LOCATIONS, ...IRISH_LOCATIONS]) {
      const key = `${loc.town.toLowerCase()}-${loc.county.toLowerCase()}-${loc.country || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(loc);
      }
    }
    return list;
  }, []);

  const filteredLocations = allAvailableLocations.filter((loc) => {
    if (selectedRegion === 'IE' && loc.country && loc.country !== 'Ireland') return false;
    if (selectedRegion === 'UK' && loc.country !== 'United Kingdom' && loc.country !== 'Northern Ireland') return false;
    if (selectedRegion === 'EU' && !['France', 'Germany', 'Netherlands', 'Spain', 'Italy', 'Poland', 'Sweden'].includes(loc.country || '')) return false;
    if (selectedRegion === 'US' && loc.country !== 'United States' && loc.country !== 'Canada') return false;
    if (selectedRegion === 'AU' && loc.country !== 'Australia' && loc.country !== 'New Zealand') return false;

    if (!searchTown.trim()) return true;
    const q = searchTown.toLowerCase();
    return (
      loc.town.toLowerCase().includes(q) ||
      loc.county.toLowerCase().includes(q) ||
      (loc.country && loc.country.toLowerCase().includes(q))
    );
  });

  return (
    <header
      className={`sticky top-0 z-40 select-none transition-colors w-full ${
        isDark
          ? 'bg-slate-900 text-white border-b border-slate-800 shadow-md'
          : 'bg-white text-slate-900 border-b border-slate-200 shadow-sm'
      }`}
    >
      {/* Top emergency broadcast ticker if alerts exist */}
      {nearbyAlertsCount > 0 && (
        <div className="bg-red-600 text-white px-3 py-1 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2 truncate">
            <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-300" />
            <span className="truncate">
              RED ALERT: {nearbyAlertsCount} stolen tool/van incident(s) reported within 50km of {currentLocation.town}!
            </span>
          </div>
          <button
            onClick={onOpenStolenAlerts}
            className="ml-2 bg-black/30 hover:bg-black/50 text-white px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-bold shrink-0 transition cursor-pointer"
          >
            View Alerts
          </button>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-1 sm:gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black shrink-0">
            <Hammer className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
          </div>
          <div className="hidden xs:block">
            <div className="flex items-center space-x-1.5">
              <span className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {APP_CONFIG.APP_NAME.toUpperCase()}
              </span>
              {APP_CONFIG.IS_DEMO && (
                <span className="text-[9px] bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold px-1.5 py-0.2 rounded uppercase">
                  DEMO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Location Selector with GPS Auto-detection */}
        <div className="relative shrink">
          <button
            onClick={() => {
              setShowLocationMenu(!showLocationMenu);
              setShowNotifMenu(false);
            }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-medium transition cursor-pointer max-w-[140px] sm:max-w-none ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="Auto-detect or set your Irish town / location"
          >
            {isGpsAuto ? (
              <Navigation className="w-3 h-3 text-emerald-500 shrink-0 animate-pulse" />
            ) : (
              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentLocation.town}
            </span>
            <span
              className={`text-[8px] font-black px-1 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                isGpsAuto
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                  : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isGpsAuto ? 'AUTO' : 'MANUAL'}
            </span>
          </button>

          {/* Location Dropdown Modal - Centered and constrained to viewport */}
          {showLocationMenu && (
            <>
              {/* Click-outside backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                onClick={() => setShowLocationMenu(false)}
              />

              <div
                className={`fixed sm:absolute left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto top-16 sm:top-full mt-1 sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl z-50 p-3.5 border transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/40">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-500" />
                    <span>Global Location & GPS Hub</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                        isGpsAuto
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isGpsAuto ? '● Auto Active' : '○ Manual'}
                    </span>
                    <button
                      onClick={() => setShowLocationMenu(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Banner */}
                <div className="mt-2.5 mb-2">
                  <div
                    className={`p-2.5 rounded-xl border text-xs space-y-0.5 ${
                      isGpsAuto
                        ? isDark
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : isDark
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1.5">
                      {isGpsAuto ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="truncate">
                        {isGpsAuto ? 'Auto GPS:' : 'Current Hub:'} {currentLocation.town}, {currentLocation.county}{' '}
                        {currentLocation.country ? `(${currentLocation.country})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Automatic GPS & Network Location Detection Button */}
                <div className="pb-2">
                  <button
                    onClick={() => {
                      if (onDetectGpsLocation) onDetectGpsLocation();
                    }}
                    disabled={gpsLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Detecting Real-Time Coordinates...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        <span>Auto-Detect Real GPS Location</span>
                      </>
                    )}
                  </button>

                  {gpsSuccessMessage && (
                    <p className="text-[11px] text-emerald-400 mt-1.5 text-center font-bold bg-emerald-500/10 py-1 px-2 rounded-lg border border-emerald-500/20">
                      ✓ {gpsSuccessMessage}
                    </p>
                  )}

                  {gpsError && (
                    <p className="text-[10px] text-red-400 mt-1.5 text-center font-medium bg-red-500/10 py-1 px-2 rounded-lg border border-red-500/20">
                      {gpsError}
                    </p>
                  )}
                </div>

                {/* Region Filter Buttons */}
                <div className="pt-1.5 pb-2 border-t border-slate-700/40">
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                    {(
                      [
                        { id: 'ALL', label: 'All Global' },
                        { id: 'IE', label: 'Ireland' },
                        { id: 'UK', label: 'UK & NI' },
                        { id: 'EU', label: 'Europe' },
                        { id: 'US', label: 'US & CAN' },
                        { id: 'AU', label: 'Aus & NZ' },
                      ] as const
                    ).map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => setSelectedRegion(reg.id)}
                        className={`px-2 py-1 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                          selectedRegion === reg.id
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {reg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Select Key Hubs */}
                <div className="pb-2">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Quick Major Trade Hubs:
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-[11px]">
                    {(selectedRegion === 'IE'
                      ? [
                          { town: 'Dublin City', county: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603 },
                          { town: 'Cork City', county: 'Cork', country: 'Ireland', lat: 51.8985, lon: -8.4756 },
                          { town: 'Galway City', county: 'Galway', country: 'Ireland', lat: 53.2707, lon: -9.0568 },
                          { town: 'Limerick City', county: 'Limerick', country: 'Ireland', lat: 52.6638, lon: -8.6267 },
                          { town: 'Waterford City', county: 'Waterford', country: 'Ireland', lat: 52.2593, lon: -7.1101 },
                        ]
                      : selectedRegion === 'UK'
                      ? [
                          { town: 'London', county: 'Greater London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
                          { town: 'Belfast', county: 'Antrim', country: 'Northern Ireland', lat: 54.5973, lon: -5.9301 },
                          { town: 'Manchester', county: 'Greater Manchester', country: 'United Kingdom', lat: 53.4808, lon: -2.2426 },
                          { town: 'Birmingham', county: 'West Midlands', country: 'United Kingdom', lat: 52.4862, lon: -1.8904 },
                          { town: 'Glasgow', county: 'Lanarkshire', country: 'United Kingdom', lat: 55.8642, lon: -4.2518 },
                        ]
                      : selectedRegion === 'EU'
                      ? [
                          { town: 'Paris', county: 'Île-de-France', country: 'France', lat: 48.8566, lon: 2.3522 },
                          { town: 'Berlin', county: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
                          { town: 'Amsterdam', county: 'North Holland', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
                          { town: 'Madrid', county: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
                          { town: 'Rome', county: 'Lazio', country: 'Italy', lat: 41.9028, lon: 12.4964 },
                        ]
                      : selectedRegion === 'US'
                      ? [
                          { town: 'New York City', county: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
                          { town: 'Chicago', county: 'Illinois', country: 'United States', lat: 41.8781, lon: -87.6298 },
                          { town: 'Houston', county: 'Texas', country: 'United States', lat: 29.7604, lon: -95.3698 },
                          { town: 'Seattle', county: 'Washington', country: 'United States', lat: 47.6062, lon: -122.3321 },
                          { town: 'Toronto', county: 'Ontario', country: 'Canada', lat: 43.6532, lon: -79.3832 },
                        ]
                      : selectedRegion === 'AU'
                      ? [
                          { town: 'Sydney', county: 'New South Wales', country: 'Australia', lat: -33.8688, lon: 151.2093 },
                          { town: 'Melbourne', county: 'Victoria', country: 'Australia', lat: -37.8136, lon: 144.9631 },
                          { town: 'Brisbane', county: 'Queensland', country: 'Australia', lat: -27.4698, lon: 153.0251 },
                          { town: 'Perth', county: 'Western Australia', country: 'Australia', lat: -31.9505, lon: 115.8605 },
                          { town: 'Auckland', county: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633 },
                        ]
                      : [
                          { town: 'Dublin City', county: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603 },
                          { town: 'London', county: 'Greater London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
                          { town: 'Belfast', county: 'Antrim', country: 'Northern Ireland', lat: 54.5973, lon: -5.9301 },
                          { town: 'New York City', county: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
                          { town: 'Sydney', county: 'New South Wales', country: 'Australia', lat: -33.8688, lon: 151.2093 },
                        ]
                    ).map((hub) => (
                      <button
                        key={`${hub.country}-${hub.town}`}
                        type="button"
                        onClick={() => {
                          onLocationChange({
                            town: hub.town,
                            county: hub.county,
                            country: hub.country,
                            latitude: hub.lat,
                            longitude: hub.lon,
                          });
                          setShowLocationMenu(false);
                        }}
                        className={`py-1 px-1 rounded-lg font-bold text-center transition cursor-pointer truncate ${
                          currentLocation.town === hub.town
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={`${hub.town}, ${hub.county} (${hub.country})`}
                      >
                        {hub.town.replace(' City', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search global town */}
                <div className="relative my-1">
                  <Search
                    className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search city, town, county or country..."
                    value={searchTown}
                    onChange={(e) => setSearchTown(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:border-amber-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* List of towns */}
                <div className="max-h-44 overflow-y-auto mt-2 space-y-0.5 pr-1">
                  {filteredLocations.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No locations found matching &quot;{searchTown}&quot;.
                    </div>
                  ) : (
                    filteredLocations.map((loc) => {
                      const isSelected = loc.town === currentLocation.town && loc.county === currentLocation.county;
                      return (
                        <button
                          key={`${loc.country || 'IE'}-${loc.county}-${loc.town}`}
                          type="button"
                          onClick={() => {
                            onLocationChange(loc);
                            setShowLocationMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-500 font-bold'
                              : isDark
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">
                            <span className="font-semibold">{loc.town}</span>,{' '}
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                              {loc.county} {loc.country ? `• ${loc.country}` : ''}
                            </span>
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1.5" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Actions - Compact & Responsive */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowLocationMenu(false);
              }}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer relative ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Menu Dropdown */}
            {showNotifMenu && (
              <>
                {/* Backdrop overlay for outside tap/click dismissal */}
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                  onClick={() => setShowNotifMenu(false)}
                />

                <div
                  className={`fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full mt-1 sm:mt-2 w-auto sm:w-88 max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl z-50 p-3.5 border transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/40 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Live Trade Notifications
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 ? (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark Read</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">All Read</span>
                      )}
                      <button
                        onClick={() => setShowNotifMenu(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Close Notifications"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-0.5">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                          !item.isRead
                            ? isDark
                              ? 'bg-slate-800/90 border-amber-500/40 hover:bg-slate-800 hover:border-amber-400'
                              : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
                            : isDark
                            ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 opacity-70'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-70'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            {!item.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            )}
                            <div className={`font-bold text-xs truncate ${item.badgeColor}`}>
                              {item.title}
                            </div>
                          </div>
                          <p className={`text-[11px] leading-snug line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {item.desc}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-slate-400">{item.time}</span>
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                              View <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tap any notification to view details</span>
                    <button
                      onClick={() => setShowNotifMenu(false)}
                      className="font-bold text-amber-500 hover:underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile & Account Button */}
          <button
            onClick={onNavigateToProfile}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Go to My Profile & Settings"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-md object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-md bg-slate-800 text-amber-500 flex items-center justify-center text-[10px] font-black border border-amber-500/40">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
            )}
            <span className="text-xs font-bold truncate max-w-[75px] sm:max-w-[100px]">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>

          {/* Stolen Gear Red Alert Button */}
          <button
            onClick={onOpenStolenAlerts}
            className={`relative flex items-center space-x-1 px-2 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              nearbyAlertsCount > 0
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
                : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
            title="Stolen Gear Radar"
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                nearbyAlertsCount > 0 ? 'text-yellow-300 animate-bounce' : 'text-red-500'
              }`}
            />
            <span className="hidden md:inline">Radar</span>
            {nearbyAlertsCount > 0 && (
              <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1 rounded-full">
                {nearbyAlertsCount}
              </span>
            )}
          </button>

          {/* Quick report stolen button */}
          <button
            onClick={onOpenReportStolen}
            className="hidden sm:flex items-center space-x-1 bg-red-950/70 hover:bg-red-900 border border-red-700/60 text-red-200 px-2 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer"
          >
            <span>+ Report</span>
          </button>

          {/* Architecture / Local Build Docs - Only in Demo build */}
          {APP_CONFIG.IS_DEMO && (
            <button
              onClick={onOpenBuildInfo}
              className={`hidden xl:flex items-center space-x-1 px-2 py-1.5 text-xs transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Architecture Docs"
            >
              <span
                className={`text-[10px] font-mono border px-1.5 py-0.5 rounded-lg ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}
              >
                Docs
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};