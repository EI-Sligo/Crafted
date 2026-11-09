/**
 * Script: purgeDemoData.cjs
 * Run with: npm run purge:demo
 * 
 * Safely and permanently strips all mock users, mock posts, mock jobs,
 * mock marketplace listings, and demo switcher code from the project once you are
 * ready for 100% production live deployment.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const seedDataPath = path.join(rootDir, 'src', 'data', 'seedData.ts');
const appConfigPath = path.join(rootDir, 'src', 'config', 'appConfig.ts');

console.log('🧹 Purging all demo data and mock personas from Crafted...');

// 1. Backup seedData.ts if not already backed up
const backupPath = path.join(rootDir, 'src', 'data', 'seedData.demo-backup.ts');
if (!fs.existsSync(backupPath) && fs.existsSync(seedDataPath)) {
  fs.copyFileSync(seedDataPath, backupPath);
  console.log('📦 Created backup of demo data at src/data/seedData.demo-backup.ts');
}

// 2. Read seedData and preserve IRISH_LOCATIONS & GLOBAL_LOCATIONS, replace demo arrays with empty arrays
if (fs.existsSync(seedDataPath)) {
  let content = fs.readFileSync(seedDataPath, 'utf8');

  // Replace INITIAL_USERS with empty array
  content = content.replace(
    /export const INITIAL_USERS: UserProfile\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_USERS: UserProfile[] = [];'
  );

  // Replace INITIAL_POSTS with empty array
  content = content.replace(
    /export const INITIAL_POSTS: Post\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_POSTS: Post[] = [];'
  );

  // Replace INITIAL_JOBS with empty array
  content = content.replace(
    /export const INITIAL_JOBS: JobListing\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_JOBS: JobListing[] = [];'
  );

  // Replace INITIAL_MARKETPLACE with empty array
  content = content.replace(
    /export const INITIAL_MARKETPLACE: MarketplaceItem\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_MARKETPLACE: MarketplaceItem[] = [];'
  );

  // Replace INITIAL_STOLEN_ALERTS with empty array
  content = content.replace(
    /export const INITIAL_STOLEN_ALERTS: StolenGearAlert\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_STOLEN_ALERTS: StolenGearAlert[] = [];'
  );

  // Replace INITIAL_CONVERSATIONS with empty array
  content = content.replace(
    /export const INITIAL_CONVERSATIONS: Conversation\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_CONVERSATIONS: Conversation[] = [];'
  );

  // Replace INITIAL_MESSAGES with empty map
  content = content.replace(
    /export const INITIAL_MESSAGES: \{ \[conversationId: string\]: ChatMessage\[\] \} = \{[\s\S]*?\};/m,
    'export const INITIAL_MESSAGES: { [conversationId: string]: ChatMessage[] } = {};'
  );

  // Replace INITIAL_CUSTOM_GROUPS with empty array
  content = content.replace(
    /export const INITIAL_CUSTOM_GROUPS: CustomUserGroup\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_CUSTOM_GROUPS: CustomUserGroup[] = [];'
  );

  // Replace INITIAL_COMMENTS with empty array
  content = content.replace(
    /export const INITIAL_COMMENTS: PostComment\[\] = \[[\s\S]*?\];/m,
    'export const INITIAL_COMMENTS: PostComment[] = [];'
  );

  fs.writeFileSync(seedDataPath, content, 'utf8');
  console.log('✅ Emptied all mock personas, jobs, classifieds, and posts from seedData.ts');
}

// 3. Lock appConfig.ts strictly to live
if (fs.existsSync(appConfigPath)) {
  const pureLiveConfig = `/**
 * APPLICATION PRODUCTION CONFIGURATION (100% PURE LIVE)
 * 
 * Production build: connects directly to live Supabase,
 * zero mock data, pure real users, real jobs & classifieds.
 */
export type AppEdition = 'live';

export const APP_CONFIG = {
  EDITION: 'live' as const,
  ALLOW_DEMO_SANDBOX: false,
  IS_LIVE: true,
  IS_DEMO: false,
  APP_NAME: 'Crafted',
  APP_TAGLINE: 'The Trade Network',
  SUPPORT_EMAIL: 'support@crafted.ie',
} as const;
`;
  fs.writeFileSync(appConfigPath, pureLiveConfig, 'utf8');
  console.log('✅ Locked appConfig.ts to permanent pure live production mode.');
}

console.log('\\n🎉 Demo data successfully purged! Run "npm run build:android:live" to compile the 100% live APK.');
