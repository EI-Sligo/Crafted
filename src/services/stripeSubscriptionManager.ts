import { PricingTier, BUSINESS_PROFILE_TIERS, JOB_POSTING_TIERS, CLASSIFIEDS_TIERS, STOLEN_GEAR_TIERS, AD_TIERS } from '../types';
import { storageService } from './storage';

export interface ActiveSubscription {
  id: string;
  userId: string;
  tierId: string;
  tierName: string;
  priceEuros: number;
  billingCycle: 'monthly' | 'onetime';
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'cancelled' | 'expired';
}

const STORAGE_KEY_SUBSCRIPTIONS = 'crafted_stripe_subscriptions_v1';

export const stripeSubscriptionManager = {
  getAllSubscriptions(): ActiveSubscription[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'sub_default_1',
        userId: 'usr_me',
        tierId: 'bus_tier_2',
        tierName: 'Employer Pro Subscription',
        priceEuros: 19.99,
        billingCycle: 'monthly',
        startedAt: '2026-10-01',
        expiresAt: '2026-12-01',
        status: 'active',
      },
    ];
  },

  getSubscriptionsForUser(userId: string): ActiveSubscription[] {
    return this.getAllSubscriptions().filter((sub) => sub.userId === userId && sub.status === 'active');
  },

  subscribeUser(userId: userIdParam, tier: PricingTier, billingCycle: 'monthly' | 'onetime'): ActiveSubscription {
    const subs = this.getAllSubscriptions();
    const now = new Date();
    const expiry = new Date();
    if (billingCycle === 'monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else {
      expiry.setDate(expiry.getDate() + 30);
    }

    const newSub: ActiveSubscription = {
      id: `sub_${Date.now()}`,
      userId,
      tierId: tier.id,
      tierName: tier.name,
      priceEuros: tier.priceEuros,
      billingCycle,
      startedAt: now.toISOString().split('T')[0],
      expiresAt: expiry.toISOString().split('T')[0],
      status: 'active',
    };

    subs.unshift(newSub);
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(subs));

    // Update user profile tier
    const user = storageService.getUserById(userId) || storageService.getCurrentUser();
    if (user) {
      if (tier.id.includes('bus_tier_2') || tier.id.includes('job_tier') || tier.id.includes('class_tier') || tier.id.includes('ad_tier')) {
        user.businessTier = tier.id === 'bus_tier_3' ? 'manufacturer_showcase' : 'employer_pro';
        user.premiumTier = 'master_contractor';
      }
      storageService.updateCurrentUser(user);
    }

    return newSub;
  },

  purchaseAdCampaign(
    userId: string,
    tier: PricingTier,
    adDetails: {
      title: string;
      content: string;
      imageUrl?: string;
      targetTrade?: string;
      ctaLabel?: string;
      ctaUrl?: string;
    }
  ): ActiveSubscription {
    const sub = this.subscribeUser(userId, tier, 'onetime');
    const user = storageService.getUserById(userId) || storageService.getCurrentUser();

    // Publish sponsored ad to Trade Feed
    storageService.createPost({
      userId: user.id,
      userName: user.name + ' [SPONSORED AD]',
      userHandle: user.handle,
      userAvatar: user.avatar,
      userTrade: user.trade,
      userHasSafePass: user.hasSafePass,
      content: `📢 **[SPONSORED BUSINESS AD: ${tier.name}]**\n\n**${adDetails.title}**\n\n${adDetails.content}\n\n${adDetails.ctaLabel ? `🔗 **Action:** [${adDetails.ctaLabel}](${adDetails.ctaUrl || '#'})` : ''}`,
      mediaType: adDetails.imageUrl ? 'image' : 'none',
      mediaUrls: adDetails.imageUrl ? [adDetails.imageUrl] : [],
      location: user.location,
      tradeTag: (adDetails.targetTrade as any) || user.trade,
      userLevel: 'Employer / Supplier Ad',
    });

    return sub;
  },

  cancelSubscription(subId: string): void {
    const subs = this.getAllSubscriptions();
    const updated = subs.map((sub) => (sub.id === subId ? { ...sub, status: 'cancelled' as const } : sub));
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(updated));
  },

  getTierById(tierId: string): PricingTier | undefined {
    const all = [...BUSINESS_PROFILE_TIERS, ...JOB_POSTING_TIERS, ...CLASSIFIEDS_TIERS, ...STOLEN_GEAR_TIERS, ...AD_TIERS];
    return all.find((t) => t.id === tierId);
  },
};

type userIdParam = string;
