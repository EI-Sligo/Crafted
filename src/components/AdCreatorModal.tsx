import React, { useState } from 'react';
import { Sparkles, X, Camera, ShieldCheck, CheckCircle, ExternalLink, Tag, DollarSign } from 'lucide-react';
import { UserProfile, PricingTier, AD_TIERS, TradeType, GENERATION_APPRENTICESHIP_SECTORS } from '../types';
import { compressImageFile } from '../services/storage';
import { stripeSubscriptionManager } from '../services/stripeSubscriptionManager';
import { useTheme } from '../context/ThemeContext';

interface AdCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onTriggerStripeCheckout: (item: { title: string; priceEuros: number; type: 'boost' | 'subscription' | 'job' }) => void;
}

export const AdCreatorModal: React.FC<AdCreatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTriggerStripeCheckout,
}) => {
  const { isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState<PricingTier>(AD_TIERS[0]);
  const [adTitle, setAdTitle] = useState('');
  const [adContent, setAdContent] = useState('');
  const [targetTrade, setTargetTrade] = useState<TradeType>(currentUser.trade);
  const [ctaLabel, setCtaLabel] = useState('Shop Now / Enquire');
  const [ctaUrl, setCtaUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(files[0], 1200, 0.8);
      setImageUrl(compressed);
    } catch (err) {
      console.error('Image compression failed', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adContent.trim()) return;

    // Trigger Stripe Checkout simulation for advertisement campaign
    onTriggerStripeCheckout({
      title: `${selectedTier.name}: ${adTitle.trim()}`,
      priceEuros: selectedTier.priceEuros,
      type: 'job',
    });

    // Process ad purchase via stripeSubscriptionManager and publish to feed
    stripeSubscriptionManager.purchaseAdCampaign(currentUser.id, selectedTier, {
      title: adTitle.trim(),
      content: adContent.trim(),
      imageUrl: imageUrl || undefined,
      targetTrade,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
    });

    alert(`Advertisement campaign successfully purchased & published to Trade Feed! Tier: ${selectedTier.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`border rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/40 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Business Feed Ad Creator & Scheduler</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Promote tools, materials, or contracting services directly to All-Ireland site crews
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Tier Selection */}
          <div className="space-y-2">
            <label className="block font-bold uppercase tracking-wider text-[11px] text-amber-500">
              1. Select Advertisement Campaign Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AD_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedTier.id === tier.id
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                      : isDark
                      ? 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{tier.name}</span>
                      <span className="font-black text-amber-500 text-sm">€{tier.priceEuros.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">{tier.durationText}</div>
                    <ul className="text-[10px] space-y-0.5 pt-1 text-slate-400">
                      {tier.features.slice(0, 2).map((f, i) => (
                        <li key={i} className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ad Details */}
          <div className="space-y-3 pt-2 border-t border-slate-700/40">
            <label className="block font-bold uppercase tracking-wider text-[11px] text-amber-500">
              2. Campaign Details & Ad Copy
            </label>

            <div>
              <label className="block font-semibold mb-1">Headline / Ad Title</label>
              <input
                type="text"
                placeholder="e.g. Special Offer: Makita 18V Brushless Combi Kit €299 + VAT at Chadwicks"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Ad Body Copy</label>
              <textarea
                rows={3}
                placeholder="Describe product specs, promotional pricing, branch locations, or contractor services for site crews..."
                value={adContent}
                onChange={(e) => setAdContent(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Target Trade / Discipline Tag</label>
                <select
                  value={targetTrade}
                  onChange={(e) => setTargetTrade(e.target.value as TradeType)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  {GENERATION_APPRENTICESHIP_SECTORS.flatMap((s) => s.trades).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Call-to-Action (CTA) Button Text</label>
                <input
                  type="text"
                  placeholder="e.g. Shop Online, Call Branch, Enquire"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Target URL / Link (Optional)</label>
              <input
                type="url"
                placeholder="https://www.chadwicks.ie/tools/makita"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block font-semibold mb-1">Campaign Image / Banner (Auto-Compressed)</label>
              <div className="flex items-center space-x-3">
                <label
                  htmlFor="ad-image-upload"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition flex items-center space-x-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isCompressing ? 'Compressing...' : 'Upload Ad Image'}</span>
                </label>
                <input
                  type="file"
                  id="ad-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imageUrl && <span className="text-emerald-400 font-semibold text-[11px]">✓ Image Attached</span>}
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="Ad Banner Preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-700" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-700/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!adTitle.trim() || !adContent.trim() || isCompressing}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center space-x-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Pay €{selectedTier.priceEuros.toFixed(2)} & Publish Ad</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
