import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Phone,
  Eye,
  Plus,
  MapPin,
  Clock,
  Award,
  Radio,
  Bell,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { StolenGearAlert, GeoLocation, UserProfile, STOLEN_GEAR_TIERS } from '../types';
import { storageService, compressImageFile } from '../services/storage';
import { calculateHaversineDistanceKm } from '../utils/calculations';
import { IRISH_LOCATIONS } from '../data/seedData';
import { useTheme } from '../context/ThemeContext';

interface StolenGearAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  isReportingMode?: boolean;
  onCloseReportMode?: () => void;
  onTriggerStripeCheckout?: (item: {
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
  }) => void;
}

export const StolenGearAlertModal: React.FC<StolenGearAlertModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  isReportingMode = false,
  onCloseReportMode,
  onTriggerStripeCheckout,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [alerts, setAlerts] = useState<StolenGearAlert[]>(storageService.getStolenAlerts());
  const [showBroadcastForm, setShowBroadcastForm] = useState(isReportingMode);
  const [selectedAlert, setSelectedAlert] = useState<StolenGearAlert | null>(null);
  const [sightingConfirmedId, setSightingConfirmedId] = useState<string | null>(null);
  const [radiusFilterKm, setRadiusFilterKm] = useState<number | 'all'>(50);
  const [pushBanner, setPushBanner] = useState<string | null>(
    `🚨 GEOFENCED PUSH ALERT: Milwaukee M18 Fuel Twin Pack reported stolen within 28km of your active jobsite in ${currentLocation.town}!`
  );

  // Broadcast form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<StolenGearAlert['category']>('Van Break-in');
  const [formSerial, setFormSerial] = useState('');
  const [formMarks, setFormMarks] = useState('');
  const [formReward, setFormReward] = useState('€500 CASH REWARD');
  const [formTown, setFormTown] = useState(currentLocation.town);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<'local' | 'regional' | 'national'>('local');
  const [isCompressing, setIsCompressing] = useState(false);

  if (!isOpen) return null;

  const refreshAlerts = () => {
    setAlerts(storageService.getStolenAlerts());
  };

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

  const handleBroadcastAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSerial.trim()) return;

    const chosenLoc = IRISH_LOCATIONS.find((l) => l.town === formTown) || currentLocation;
    const tierData = STOLEN_GEAR_TIERS.find((t) => t.id === selectedTier) || STOLEN_GEAR_TIERS[0];

    storageService.createStolenAlert({
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reporterPhone: currentUser.phone,
      reporterTrade: currentUser.trade,
      itemTitle: formTitle.trim(),
      category: formCategory,
      serialNumbers: formSerial.trim(),
      distinguishingMarks: formMarks.trim(),
      theftLocation: chosenLoc,
      stolenDate: 'Today',
      stolenTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rewardOffered: formReward.trim(),
      images:
        formImages.length > 0
          ? formImages
          : ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80'],
      urgency: 'CRITICAL',
      tier: selectedTier,
    });

    if (onTriggerStripeCheckout) {
      onTriggerStripeCheckout({
        title: `Stolen Gear Broadcast (${tierData.name}) - ${formTitle.trim()}`,
        priceEuros: tierData.priceEuros,
        type: 'stolen',
      });
    }

    setFormTitle('');
    setFormSerial('');
    setFormMarks('');
    setFormImages([]);
    setShowBroadcastForm(false);
    if (onCloseReportMode) onCloseReportMode();
    refreshAlerts();
  };

  const handleReportSighting = (alertId: string) => {
    storageService.reportSighting(alertId);
    setSightingConfirmedId(alertId);
    refreshAlerts();
    setTimeout(() => {
      setSightingConfirmedId(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className={`${isDark ? 'bg-slate-900 border-red-600' : 'bg-white border-red-500'} border-2 rounded-3xl max-w-2xl w-full p-5 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white animate-pulse">
              <AlertTriangle className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} flex items-center space-x-2`}>
                <span>STOLEN GEAR RADAR & BROADCAST NETWORK</span>
              </h2>
              <p className="text-[11px] text-red-500 font-semibold">
                Instant high-priority sirens broadcast to Irish trades, apprentices & suppliers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Top action: Broadcast stolen alert button */}
          {!showBroadcastForm && (
            <div className={`${isDark ? 'bg-red-950/40 border-red-700/60 text-red-200' : 'bg-red-50 border-red-200 text-red-800'} border rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2`}>
              <div className="flex items-center space-x-2 text-xs">
                <Radio className="w-4 h-4 text-red-500 shrink-0 animate-spin" />
                <span>Have your tools or van been broken into? Sound the alarm starting at €1.99.</span>
              </div>
              <button
                onClick={() => setShowBroadcastForm(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-red-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Broadcast Stolen Gear Alert</span>
              </button>
            </div>
          )}

          {/* Form: Broadcast New Stolen Alert */}
          {showBroadcastForm ? (
            <form onSubmit={handleBroadcastAlert} className={`${isDark ? 'bg-slate-800/80 border-red-600/50' : 'bg-slate-50 border-red-300'} border rounded-2xl p-4 space-y-3`}>
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} pb-2`}>
                <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">
                  File Stolen Gear / Break-in Broadcast
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBroadcastForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* 3-Tier Broadcast Pricing Selector */}
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-1.5`}>
                  Choose Broadcast Coverage Tier (Starts at €1.99)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STOLEN_GEAR_TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id as any)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? isDark
                              ? 'bg-red-950/70 border-red-500 ring-2 ring-red-500/40'
                              : 'bg-red-50 border-red-500 ring-2 ring-red-400'
                            : isDark
                            ? 'bg-slate-900/90 border-slate-700 hover:border-slate-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{tier.name}</span>
                            <span className="text-sm font-black text-amber-500 font-mono">
                              €{tier.priceEuros.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{tier.durationText}</div>
                        </div>
                        {tier.isPopular && (
                          <div className="mt-1">
                            <span className="text-[9px] bg-red-600/40 text-red-300 border border-red-600/60 px-1.5 py-0.2 rounded font-bold uppercase">
                              Most Popular
                            </span>
                          </div>
                        )}
                        <ul className="text-[10px] text-slate-300 space-y-0.5 mt-2 border-t border-slate-800 pt-1.5">
                          {tier.features.map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-center space-x-1">
                              <span className="text-red-400">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stolen Item / Gear Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milwaukee M18 Fuel Twin Pack & 3x 5.0Ah Batteries"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Theft Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Van Break-in">Van Break-in</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Testing Equipment">Testing Equipment</option>
                    <option value="Hand Tools">Hand Tools</option>
                    <option value="Machinery">Machinery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Theft Location (Town/Hub)
                  </label>
                  <select
                    value={formTown}
                    onChange={(e) => setFormTown(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {IRISH_LOCATIONS.map((loc) => (
                      <option key={loc.town} value={loc.town}>
                        {loc.town}, Co. {loc.county}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Serial Numbers (Crucial for pawn/recovery verification)
                </label>
                <input
                  type="text"
                  placeholder="e.g. S/N: G82-01934 | Fluke S/N: 48920199"
                  value={formSerial}
                  onChange={(e) => setFormSerial(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Distinguishing Marks & Custom Engravings
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fluorescent pink spray paint on battery base, initials engraved on chuck, deep scratch on left casing..."
                  value={formMarks}
                  onChange={(e) => setFormMarks(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reward Offered
                </label>
                <input
                  type="text"
                  value={formReward}
                  onChange={(e) => setFormReward(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Photo upload */}
              <div className="border border-dashed border-slate-700 rounded-xl p-2.5 bg-slate-900 text-center">
                <input
                  type="file"
                  id="stolen-gear-photo"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="stolen-gear-photo"
                  className="cursor-pointer text-xs text-red-400 font-semibold flex items-center justify-center space-x-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Attach Photo of Stolen Gear (Auto-compressed)</span>
                </label>
                {isCompressing && <p className="text-xs text-amber-400 mt-1">Compressing image...</p>}
                {formImages.length > 0 && (
                  <img
                    src={formImages[0]}
                    alt="Stolen tool preview"
                    className="mt-2 w-20 h-20 object-cover rounded-lg border border-slate-700 mx-auto"
                  />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastForm(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim() || isCompressing}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-red-600/30"
                >
                  Transmit Red Alert (€
                  {(STOLEN_GEAR_TIERS.find((t) => t.id === selectedTier) || STOLEN_GEAR_TIERS[0]).priceEuros.toFixed(2)})
                </button>
              </div>
            </form>
          ) : null}

          {/* Geofenced Push Alert & Radius Toolbar */}
          <div className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-300'} border rounded-2xl p-3 space-y-2`}>
            {pushBanner && (
              <div className="bg-red-600 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-md animate-pulse">
                <span className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>{pushBanner}</span>
                </span>
                <button
                  onClick={() => setPushBanner(null)}
                  className="text-white/80 hover:text-white text-xs ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Geofenced Radar Radius:</span>
                <select
                  value={radiusFilterKm}
                  onChange={(e) => setRadiusFilterKm(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className={`border rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-red-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km (Jobsite)</option>
                  <option value={100}>Within 100 km</option>
                  <option value="all">All Ireland (National)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPushBanner(`🚨 SIMULATED PUSH: New van break-in reported 12km from ${currentLocation.town}!`);
                  setTimeout(() => setPushBanner(null), 8000);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Test Jobsite Push Alert</span>
              </button>
            </div>
          </div>

          {/* List of Active Stolen Alerts */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Broadcasts ({alerts.length})</span>
              <span className="text-[10px] text-amber-400 font-normal">
                Relative to your location: {currentLocation.town}
              </span>
            </h3>

            {alerts
              .filter((alert) => {
                if (radiusFilterKm === 'all') return true;
                const dist = calculateHaversineDistanceKm(
                  { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                  { latitude: alert.theftLocation.latitude, longitude: alert.theftLocation.longitude }
                );
                return dist <= radiusFilterKm;
              })
              .map((alert) => {
              const distanceKm = calculateHaversineDistanceKm(
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                { latitude: alert.theftLocation.latitude, longitude: alert.theftLocation.longitude }
              );
              const isWithin50 = distanceKm <= 50.0;

              return (
                <div
                  key={alert.id}
                  className={`border rounded-2xl p-4 transition ${
                    isWithin50
                      ? isDark
                        ? 'bg-red-950/30 border-red-600/70 shadow-lg shadow-red-950/50'
                        : 'bg-red-50 border-red-500 shadow-sm'
                      : isDark
                      ? 'bg-slate-800/40 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isWithin50 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isWithin50 ? '⚠️ WITHIN 50KM RADAR' : 'REGIONAL ALERT'}
                      </span>
                      <span className="text-xs font-bold text-amber-500">
                        {distanceKm} km away
                      </span>
                    </div>

                    {alert.rewardOffered && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-lg">
                        {alert.rewardOffered}
                      </span>
                    )}
                  </div>

                  {/* Title & Category */}
                  <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} mt-2`}>{alert.itemTitle}</h4>

                  <div className={`flex items-center space-x-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 flex-wrap`}>
                    <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium`}>{alert.category}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{alert.theftLocation.town}, Co. {alert.theftLocation.county}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{alert.stolenDate} at {alert.stolenTime}</span>
                    </span>
                  </div>

                  {/* Serial Numbers Box */}
                  <div className={`${isDark ? 'bg-slate-950/80 border-red-900/60' : 'bg-white border-red-200 shadow-xs'} border rounded-xl p-2.5 mt-2.5 text-xs font-mono space-y-1`}>
                    <div className="text-[10px] text-red-500 font-bold uppercase">
                      Serial Numbers & Hardware Identifiers:
                    </div>
                    <div className={`${isDark ? 'text-amber-300' : 'text-amber-600 font-bold'} break-all`}>{alert.serialNumbers}</div>
                    {alert.distinguishingMarks && (
                      <div className={`${isDark ? 'text-slate-300 border-slate-800' : 'text-slate-700 border-slate-100'} text-[11px] font-sans pt-1 border-t`}>
                        <strong>Marks: </strong> {alert.distinguishingMarks}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center justify-between pt-3 mt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'} flex-wrap gap-2`}>
                    <div className={`flex items-center space-x-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>Victim Contact: <strong>{alert.reporterPhone}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleReportSighting(alert.id)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Report Sighting ({alert.sightingsCount})</span>
                      </button>
                    </div>
                  </div>

                  {sightingConfirmedId === alert.id && (
                    <div className="mt-2 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-2 rounded-xl flex items-center space-x-1.5 animate-bounce">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Thank you! Sighting reported to {alert.reporterName} and logged to the incident log.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
