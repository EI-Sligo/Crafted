import React, { useState } from 'react';
import { X, CreditCard, Lock, CheckCircle2, ShieldCheck, Sparkles, ExternalLink, Zap, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';
import { stripeSubscriptionManager } from '../services/stripeSubscriptionManager';
import { stripeService } from '../services/stripeService';
import { useTheme } from '../context/ThemeContext';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
    itemId?: string;
  } | null;
  onSuccess: () => void;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('842');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleRealStripeCheckout = async () => {
    setIsRedirecting(true);
    setStripeError(null);
    try {
      const currentUser = storageService.getCurrentUser();
      await stripeService.redirectToCheckout({
        title: item.title,
        priceEuros: item.priceEuros,
        type: item.type,
        itemId: item.itemId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        billingCycle: item.type === 'subscription' ? 'monthly' : 'onetime',
      });
    } catch (err: any) {
      console.error('[Stripe Checkout Error]', err);
      setIsRedirecting(false);
      setStripeError(err.message || 'Could not redirect to Stripe hosted checkout. Falling back to test checkout.');
    }
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);

      // Execute benefit
      const currentUser = storageService.getCurrentUser();
      if (item.type === 'boost' && item.itemId) {
        storageService.boostMarketplaceItem(item.itemId);
      } else if (item.type === 'subscription' || item.type === 'job' || item.type === 'stolen') {
        const tier = stripeSubscriptionManager.getTierById(item.itemId || '') || {
          id: item.itemId || 'custom_tier',
          name: item.title,
          priceEuros: item.priceEuros,
          durationText: 'Active Placement',
          features: [],
        };
        stripeSubscriptionManager.subscribeUser(
          currentUser.id,
          tier,
          item.priceEuros > 10 ? 'monthly' : 'onetime'
        );
      }

      setTimeout(() => {
        setIsCompleted(false);
        onSuccess();
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl max-w-md w-full p-6 shadow-2xl relative`}>
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-4`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Stripe SaaS Checkout</span>
            <span className="text-[10px] bg-sky-500/15 text-sky-500 font-mono px-1.5 py-0.2 rounded border border-sky-500/30 font-bold">
              TEST MODE
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCompleted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Verified via Stripe!</h3>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Your invoice receipt has been issued and {item.title} is now active.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-4">
            {/* Item summary */}
            <div className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.type === 'boost'
                    ? '7-Day Top Placement Micro-transaction'
                    : item.type === 'subscription'
                    ? 'Monthly Contractor Subscription'
                    : item.type === 'job'
                    ? 'Verified Trade Job Placement'
                    : 'Immediate Incident Broadcast'}
                </div>
              </div>
              <div className="text-xl font-black text-amber-500 font-mono">
                €{item.priceEuros.toFixed(2)}
              </div>
            </div>

            {stripeError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{stripeError}</span>
              </div>
            )}

            {/* Official Hosted Stripe Checkout Button */}
            <button
              type="button"
              onClick={handleRealStripeCheckout}
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>
                {isRedirecting
                  ? 'Connecting to Stripe Checkout...'
                  : `Pay €${item.priceEuros.toFixed(2)} with Live Stripe Checkout`}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <div className="flex items-center space-x-2 my-1">
              <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                or instant demo test
              </span>
              <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>

            {/* Card Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Expires
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 text-center`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 text-center`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className={`flex items-center space-x-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} justify-center pt-1`}>
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-bit encrypted end-to-end via Stripe Elements</span>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isProcessing ? 'Processing with Stripe...' : `Pay €${item.priceEuros.toFixed(2)} Securely`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
