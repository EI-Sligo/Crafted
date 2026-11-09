# Crafted TradeNet Ireland — Supabase PostgreSQL Database Schema & RLS Policies

This document is the **definitive, production-ready database schema** for **Crafted TradeNet Ireland** on Supabase (PostgreSQL). It covers **all 40+ Irish trade specialisms**, apprentice logbooks, skills & peer endorsements, classifieds, stolen tool radar, site crew groups, direct messaging, storage buckets, and idempotent row-level security (RLS) policies.

---

## Table of Contents
1. [Which Script Should You Run?](#1-which-script-should-you-run)
2. [Master Full Schema Script (Fresh Setup or Reset)](#2-master-full-schema-script)
3. [Upgrade / Patch Migration Script (Safe for Existing Databases)](#3-upgrade--patch-migration-script)
4. [Storage Buckets Configuration](#4-storage-buckets-configuration)
5. [Auth Trigger & Profile Provisioning](#5-auth-trigger--profile-provisioning)
6. [Seed Data & Initial Pricing Tiers](#6-seed-data--initial-pricing-tiers)
7. [Pre-Build Checklist: What Else Are You Missing Before Building?](#7-pre-build-checklist-what-else-are-you-missing-before-building)

---

## 1. Which Script Should You Run?

- **If you are starting completely fresh with a new Supabase project**:
  Run **[Section 2: Master Full Schema Script](#2-master-full-schema-script)**.
- **If you already ran a previous version of the SQL (or encountered `policy already exists`)**:
  Run **[Section 3: Upgrade / Patch Migration Script](#3-upgrade--patch-migration-script)**. It is **100% idempotent**—it safely adds missing enum values, missing columns, missing tables, and uses `DROP POLICY IF EXISTS` before creating policies so it will never fail if run multiple times.
- **After running either schema script**:
  Make sure to run **[Section 4: Storage Buckets Configuration](#4-storage-buckets-configuration)** and **[Section 5: Auth Trigger](#5-auth-trigger--profile-provisioning)**.

---

## 2. Master Full Schema Script

Copy and paste this entire block directly into your **Supabase Dashboard → SQL Editor** and click **Run**:

```sql
-- ============================================================================
-- CRAFTED TRADENET IRELAND — COMPLETE MASTER SCHEMA
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. CUSTOM TYPES & ENUMS

-- Complete 40+ Irish trade specialisms, construction crafts, and apprenticeship pathways
do $$ begin
  create type public.trade_type as enum (
    -- Architecture & Construction
    'Carpentry & Joinery',
    'Plumbing',
    'Brick & Stonelaying',
    'Plastering & Drylining',
    'Painting & Decorating',
    'Stonecutting & Stonemasonry',
    'Roofing & Cladding',
    'Scaffolding',
    'Wood Manufacturing & Finishing',
    'Civil Engineering',
    'Geo-drilling',

    -- Electrical & Engineering
    'Electrician',
    'Electrical Instrumentation',
    'Industrial Electrical',
    'Instrumentation',
    'Electronic Security Systems',
    'Refrigeration & Air Conditioning',
    'Mechanical Automation and Maintenance Fitting (MAMF)',
    'Metal Fabrication & Welding',
    'Toolmaking',
    'Pipefitting',
    'Engineering Services Maintenance',
    'OEM Engineering',
    'Manufacturing Engineering',
    'Polymer Processing',

    -- Motor & Heavy Plant
    'Motor Mechanics',
    'Heavy Vehicle Mechanics',
    'Vehicle Body Repairs',
    'Agricultural Mechanics',
    'Construction Plant Fitting',

    -- Logistics, Utilities & Tech
    'Logistics Associate',
    'Network Engineer',
    'Cybersecurity',
    'Telecommunications Field Technician',
    'Arboriculture',
    'Butchery',
    'Chef de Partie',
    'Hairdressing',

    -- Common Trade Aliases & Apprenticeship Phases
    'Plumber',
    'HVAC & Refrigeration',
    'Bricklayer & Mason',
    'Welder & Fabricator',
    'Plasterer & Dryliner',
    'Roofer',
    'Painter & Decorator',
    'Carpenter',
    'Apprentice (Phase 1-3)',
    'Apprentice (Phase 4-7)',
    'General Contractor'
  );
exception
  when duplicate_object then null;
end $$;

-- Account classification
do $$ begin
  create type public.account_type as enum ('individual', 'business');
exception when duplicate_object then null; end $$;

-- Job board hire classification
do $$ begin
  create type public.job_type as enum ('Apprentice', 'Qualified Hire', 'Subcontract');
exception when duplicate_object then null; end $$;

-- Marketplace category
do $$ begin
  create type public.marketplace_category as enum (
    'Tools',
    'Power Tools',
    'Vans & Vehicles',
    'Materials',
    'Safety Gear',
    'Plant & Machinery'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 3. CORE APPLICATION TABLES
-- ----------------------------------------------------------------------------

-- A. PROFILES (Extends auth.users with verified trade credentials & skills)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  handle text unique not null,
  trade public.trade_type not null default 'Electrician',
  account_type public.account_type default 'individual',
  business_category text check (business_category in ('contractor_employer', 'tool_manufacturer', 'material_supplier', null)),
  business_tier text check (business_tier in ('standard', 'employer_pro', 'manufacturer_showcase', null)) default 'standard',
  has_safe_pass boolean default true,
  safe_pass_expiry text default 'May 2028',
  is_apprentice boolean default false,
  track_logbook boolean default true,
  solas_id text, -- Apprentice National Registration ID (e.g. APP-IE-849201)
  apprentice_phase text,
  years_experience integer default 0,
  avatar_url text default null, -- Defaults to null so new users choose their own avatar
  bio text default 'Qualified Irish tradesperson active on site.',
  phone text default '', -- Defaults to blank so users enter their own phone
  email text default '',
  cv_link text,
  town text not null default 'Dublin City',
  county text not null default 'Dublin',
  country text default 'Ireland',
  country_code text default 'IE',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  has_cif_badge boolean default false,
  premium_tier text check (premium_tier in ('none', 'apprentice_sponsor', 'master_contractor', null)) default 'none',
  followers_count integer default 0,
  following_user_ids text[] default '{}'::text[],
  saved_posts text[] default '{}'::text[],
  portfolio jsonb default '[]'::jsonb,
  work_history jsonb default '[]'::jsonb,
  skills jsonb default '[]'::jsonb,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- B. SUBSCRIPTION TIERS (Stripe pricing & membership tiers)
create table if not exists public.subscription_tiers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  tier_code text unique,
  price_euros numeric(10, 2) not null,
  duration_days integer not null,
  features jsonb default '[]'::jsonb,
  is_popular boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- C. CERTIFICATIONS (Safe Pass, F-Gas, City & Guilds credentials)
create table if not exists public.certifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cert_type text not null,
  issued_date date not null,
  expiry_date date not null,
  verification_code text unique not null,
  verified_by text default 'National Registry',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- D. SKILL ENDORSEMENTS (Peer endorsement records)
create table if not exists public.skill_endorsements (
  id uuid default uuid_generate_v4() primary key,
  target_user_id uuid references public.profiles(id) on delete cascade not null,
  skill text not null,
  endorser_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_skill_endorsement unique (target_user_id, skill, endorser_user_id)
);

-- E. CUSTOM SITE GROUPS (Private subbie crews, e.g. "Intel Leixlip Fab 34 Crew")
create table if not exists public.custom_groups (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  member_user_ids uuid[] default '{}'::uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- F. POSTS (Community trade feed, technical queries, tool discussions)
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  trade_tag public.trade_type not null default 'Electrician',
  media_type text check (media_type in ('image', 'video', 'none')) default 'none',
  media_urls text[] default '{}'::text[],
  video_duration_seconds numeric(5, 2),
  likes_count integer default 0,
  views_count integer default 1,
  comments_count integer default 0,
  town text not null default 'Dublin City',
  county text not null default 'Dublin',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- G. POST COMMENTS
create table if not exists public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- H. POST LIKES (Idempotent like tracking)
create table if not exists public.post_likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_post_like unique (post_id, user_id)
);

-- I. JOBS (Trade employment, apprentice indentures, subcontracts)
create table if not exists public.jobs (
  id uuid default uuid_generate_v4() primary key,
  employer_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  job_type public.job_type not null default 'Qualified Hire',
  trade public.trade_type not null default 'Electrician',
  target_apprentice_phase text,
  description text not null,
  rate_text text not null,
  rate_type text check (rate_type in ('hourly', 'daily', 'fixed', 'price_work')) default 'hourly',
  rate_amount numeric(10, 2),
  duration text default 'Immediate - 6 Months',
  has_safe_pass_required boolean default true,
  town text not null default 'Dublin City',
  county text not null default 'Dublin',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  tier text check (tier in ('basic', 'priority', 'contractor_pro')) default 'basic',
  is_featured boolean default false,
  applications_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- J. MARKETPLACE (Trade tools, test gear, vans, materials)
create table if not exists public.marketplace_items (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category public.marketplace_category not null default 'Tools',
  price_euros numeric(10, 2) not null,
  description text not null,
  condition text not null default 'Good Working Order',
  images text[] default '{}'::text[],
  town text not null default 'Dublin City',
  county text not null default 'Dublin',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  tier text check (tier in ('standard', 'featured', 'premium')) default 'standard',
  is_boosted boolean default false,
  boost_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- J2. COURSES (Training provider course listings)
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references public.profiles(id) on delete cascade not null,
  provider_name text not null,
  provider_avatar text default '',
  provider_type text default 'Training Provider',
  title text not null,
  category text not null default 'Up-skilling & Certification',
  description text not null,
  duration_text text not null default '2 Days',
  cost_text text not null default '€250',
  cost_amount numeric(10, 2) default 250,
  town text not null default 'Dublin City',
  county text not null default 'Dublin',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  start_date text not null default '2026-12-01',
  contact_email text not null,
  contact_phone text not null,
  is_free boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- K. STOLEN GEAR RADAR (Red alert broadcast for stolen tools and vans)
create table if not exists public.stolen_gear_alerts (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reporter_phone text default '',
  reporter_trade public.trade_type default 'Electrician',
  item_title text not null,
  item_description text not null,
  serial_numbers text,
  distinguishing_marks text,
  theft_location_town text not null default 'Dublin City',
  theft_location_county text not null default 'Dublin',
  latitude double precision not null default 53.3498,
  longitude double precision not null default -6.2603,
  date_stolen date not null,
  images text[] default '{}'::text[],
  tier text check (tier in ('local', 'county', 'nationwide')) default 'local',
  urgency text check (urgency in ('CRITICAL', 'HIGH', 'MEDIUM')) default 'CRITICAL',
  status text check (status in ('ACTIVE_ALERT', 'RECOVERED', 'INVESTIGATING')) default 'ACTIVE_ALERT',
  sightings_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- L. CONVERSATIONS & DIRECT MESSAGES
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_ids uuid[] not null,
  last_message_text text,
  last_message_time timestamp with time zone default timezone('utc'::text, now()),
  unread_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  attached_tool_name text,
  attached_job_title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- M. TRADE APPRENTICE LOGBOOK ENTRIES
create table if not exists public.apprentice_logbook_entries (
  id uuid default uuid_generate_v4() primary key,
  apprentice_id uuid references public.profiles(id) on delete cascade not null,
  trade public.trade_type not null default 'Electrician',
  phase integer not null check (phase between 1 and 7),
  date date default current_date,
  module_code text not null default 'MOD-101',
  module_title text not null,
  hours_logged integer default 0,
  craftsperson_name text default 'Qualified Supervising Craftsperson',
  notes text default '',
  employer_signed_off boolean default false,
  sign_off_date date,
  signoff_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Backward-compatibility view for any legacy queries
create or replace view public.solas_logbook_entries as 
  select * from public.apprentice_logbook_entries;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES (IDEMPOTENT)
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscription_tiers enable row level security;
alter table public.certifications enable row level security;
alter table public.skill_endorsements enable row level security;
alter table public.custom_groups enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.jobs enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.stolen_gear_alerts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.apprentice_logbook_entries enable row level security;
alter table public.courses enable row level security;

-- Courses
drop policy if exists "Public read courses" on public.courses;
create policy "Public read courses" on public.courses for select using (true);
drop policy if exists "Providers insert courses" on public.courses;
create policy "Providers insert courses" on public.courses for insert with check (auth.uid() = provider_id);
drop policy if exists "Providers delete courses" on public.courses;
create policy "Providers delete courses" on public.courses for delete using (auth.uid() = provider_id);

-- Profiles
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select using (true);
drop policy if exists "Owners manage profiles" on public.profiles;
create policy "Owners manage profiles" on public.profiles for all using (auth.uid() = id);

-- Subscription Tiers
drop policy if exists "Public read tiers" on public.subscription_tiers;
create policy "Public read tiers" on public.subscription_tiers for select using (true);

-- Certifications
drop policy if exists "Public read certs" on public.certifications;
create policy "Public read certs" on public.certifications for select using (true);
drop policy if exists "Owners manage certs" on public.certifications;
create policy "Owners manage certs" on public.certifications for all using (auth.uid() = user_id);

-- Skill Endorsements
drop policy if exists "Public read endorsements" on public.skill_endorsements;
create policy "Public read endorsements" on public.skill_endorsements for select using (true);
drop policy if exists "Peers endorse skills" on public.skill_endorsements;
create policy "Peers endorse skills" on public.skill_endorsements for insert with check (auth.uid() = endorser_user_id);
drop policy if exists "Peers withdraw endorsement" on public.skill_endorsements;
create policy "Peers withdraw endorsement" on public.skill_endorsements for delete using (auth.uid() = endorser_user_id);

-- Custom Groups
drop policy if exists "Group creators manage" on public.custom_groups;
create policy "Group creators manage" on public.custom_groups for all using (auth.uid() = creator_id);
drop policy if exists "Group members read" on public.custom_groups;
create policy "Group members read" on public.custom_groups for select using (auth.uid() = any(member_user_ids));

-- Posts
drop policy if exists "Public read posts" on public.posts;
create policy "Public read posts" on public.posts for select using (true);
drop policy if exists "Authors insert posts" on public.posts;
create policy "Authors insert posts" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "Authors update posts" on public.posts;
create policy "Authors update posts" on public.posts for update using (auth.uid() = user_id);
drop policy if exists "Authors delete posts" on public.posts;
create policy "Authors delete posts" on public.posts for delete using (auth.uid() = user_id);

-- Comments
drop policy if exists "Public read comments" on public.post_comments;
create policy "Public read comments" on public.post_comments for select using (true);
drop policy if exists "Authenticated insert comments" on public.post_comments;
create policy "Authenticated insert comments" on public.post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "Author update comments" on public.post_comments;
create policy "Author update comments" on public.post_comments for update using (auth.uid() = user_id);
drop policy if exists "Author delete comments" on public.post_comments;
create policy "Author delete comments" on public.post_comments for delete using (auth.uid() = user_id);

-- Likes
drop policy if exists "Public read likes" on public.post_likes;
create policy "Public read likes" on public.post_likes for select using (true);
drop policy if exists "User manage likes" on public.post_likes;
create policy "User manage likes" on public.post_likes for all using (auth.uid() = user_id);

-- Jobs
drop policy if exists "Public read jobs" on public.jobs;
create policy "Public read jobs" on public.jobs for select using (true);
drop policy if exists "Employers insert jobs" on public.jobs;
create policy "Employers insert jobs" on public.jobs for insert with check (auth.uid() = employer_id);
drop policy if exists "Employers update jobs" on public.jobs;
create policy "Employers update jobs" on public.jobs for update using (auth.uid() = employer_id);
drop policy if exists "Employers delete jobs" on public.jobs;
create policy "Employers delete jobs" on public.jobs for delete using (auth.uid() = employer_id);

-- Marketplace
drop policy if exists "Public read marketplace" on public.marketplace_items;
create policy "Public read marketplace" on public.marketplace_items for select using (true);
drop policy if exists "Sellers insert items" on public.marketplace_items;
create policy "Sellers insert items" on public.marketplace_items for insert with check (auth.uid() = seller_id);
drop policy if exists "Sellers update items" on public.marketplace_items;
create policy "Sellers update items" on public.marketplace_items for update using (auth.uid() = seller_id);
drop policy if exists "Sellers delete items" on public.marketplace_items;
create policy "Sellers delete items" on public.marketplace_items for delete using (auth.uid() = seller_id);

-- Stolen Gear Alerts
drop policy if exists "Public read stolen alerts" on public.stolen_gear_alerts;
create policy "Public read stolen alerts" on public.stolen_gear_alerts for select using (true);
drop policy if exists "Reporters insert stolen alerts" on public.stolen_gear_alerts;
create policy "Reporters insert stolen alerts" on public.stolen_gear_alerts for insert with check (auth.uid() = reporter_id);
drop policy if exists "Reporters update stolen alerts" on public.stolen_gear_alerts;
create policy "Reporters update stolen alerts" on public.stolen_gear_alerts for update using (auth.uid() = reporter_id);

-- Conversations & Messages
drop policy if exists "Participants view conversations" on public.conversations;
create policy "Participants view conversations" on public.conversations for select using (auth.uid() = any(participant_ids));
drop policy if exists "Participants update conversations" on public.conversations;
create policy "Participants update conversations" on public.conversations for update using (auth.uid() = any(participant_ids));
drop policy if exists "Participants insert conversations" on public.conversations;
create policy "Participants insert conversations" on public.conversations for insert with check (auth.uid() = any(participant_ids));

drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages" on public.messages for select using (
  exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
    and auth.uid() = any(conversations.participant_ids)
  )
);
drop policy if exists "Senders insert messages" on public.messages;
create policy "Senders insert messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Apprentice Logbooks
drop policy if exists "Apprentices view own logbook" on public.apprentice_logbook_entries;
create policy "Apprentices view own logbook" on public.apprentice_logbook_entries for select using (auth.uid() = apprentice_id);
drop policy if exists "Apprentices manage own logbook" on public.apprentice_logbook_entries;
create policy "Apprentices manage own logbook" on public.apprentice_logbook_entries for all using (auth.uid() = apprentice_id);
```

---

## 3. Upgrade / Patch Migration Script

**Use this script if you already have existing tables** and need to add all missing trades, columns, or fix the `policy already exists` error. It is safe and does not drop any tables or user records:

```sql
-- ============================================================================
-- CRAFTED TRADENET IRELAND — SAFE UPGRADE / MIGRATION PATCH (IDEMPOTENT)
-- ============================================================================

-- 1. Add all missing trades to existing trade_type enum
alter type public.trade_type add value if not exists 'Carpentry & Joinery';
alter type public.trade_type add value if not exists 'Plumbing';
alter type public.trade_type add value if not exists 'Brick & Stonelaying';
alter type public.trade_type add value if not exists 'Plastering & Drylining';
alter type public.trade_type add value if not exists 'Painting & Decorating';
alter type public.trade_type add value if not exists 'Stonecutting & Stonemasonry';
alter type public.trade_type add value if not exists 'Roofing & Cladding';
alter type public.trade_type add value if not exists 'Scaffolding';
alter type public.trade_type add value if not exists 'Wood Manufacturing & Finishing';
alter type public.trade_type add value if not exists 'Civil Engineering';
alter type public.trade_type add value if not exists 'Geo-drilling';
alter type public.trade_type add value if not exists 'Electrician';
alter type public.trade_type add value if not exists 'Electrical Instrumentation';
alter type public.trade_type add value if not exists 'Industrial Electrical';
alter type public.trade_type add value if not exists 'Instrumentation';
alter type public.trade_type add value if not exists 'Electronic Security Systems';
alter type public.trade_type add value if not exists 'Refrigeration & Air Conditioning';
alter type public.trade_type add value if not exists 'Mechanical Automation and Maintenance Fitting (MAMF)';
alter type public.trade_type add value if not exists 'Metal Fabrication & Welding';
alter type public.trade_type add value if not exists 'Toolmaking';
alter type public.trade_type add value if not exists 'Pipefitting';
alter type public.trade_type add value if not exists 'Engineering Services Maintenance';
alter type public.trade_type add value if not exists 'OEM Engineering';
alter type public.trade_type add value if not exists 'Manufacturing Engineering';
alter type public.trade_type add value if not exists 'Polymer Processing';
alter type public.trade_type add value if not exists 'Motor Mechanics';
alter type public.trade_type add value if not exists 'Heavy Vehicle Mechanics';
alter type public.trade_type add value if not exists 'Vehicle Body Repairs';
alter type public.trade_type add value if not exists 'Agricultural Mechanics';
alter type public.trade_type add value if not exists 'Construction Plant Fitting';
alter type public.trade_type add value if not exists 'Logistics Associate';
alter type public.trade_type add value if not exists 'Network Engineer';
alter type public.trade_type add value if not exists 'Cybersecurity';
alter type public.trade_type add value if not exists 'Telecommunications Field Technician';
alter type public.trade_type add value if not exists 'Arboriculture';
alter type public.trade_type add value if not exists 'Butchery';
alter type public.trade_type add value if not exists 'Chef de Partie';
alter type public.trade_type add value if not exists 'Hairdressing';
alter type public.trade_type add value if not exists 'Plumber';
alter type public.trade_type add value if not exists 'HVAC & Refrigeration';
alter type public.trade_type add value if not exists 'Bricklayer & Mason';
alter type public.trade_type add value if not exists 'Welder & Fabricator';
alter type public.trade_type add value if not exists 'Plasterer & Dryliner';
alter type public.trade_type add value if not exists 'Roofer';
alter type public.trade_type add value if not exists 'Painter & Decorator';
alter type public.trade_type add value if not exists 'Carpenter';
alter type public.trade_type add value if not exists 'Apprentice (Phase 1-3)';
alter type public.trade_type add value if not exists 'Apprentice (Phase 4-7)';
alter type public.trade_type add value if not exists 'General Contractor';

-- 2. Add all new profile columns
alter table public.profiles
  add column if not exists phone text default '',
  add column if not exists email text default '',
  add column if not exists is_apprentice boolean default false,
  add column if not exists track_logbook boolean default true,
  add column if not exists solas_id text,
  add column if not exists safe_pass_expiry text default 'May 2028',
  add column if not exists business_category text,
  add column if not exists business_tier text default 'standard',
  add column if not exists premium_tier text default 'none',
  add column if not exists cv_link text,
  add column if not exists portfolio jsonb default '[]'::jsonb,
  add column if not exists work_history jsonb default '[]'::jsonb,
  add column if not exists skills jsonb default '[]'::jsonb,
  add column if not exists following_user_ids text[] default '{}'::text[],
  add column if not exists saved_posts text[] default '{}'::text[],
  add column if not exists country text default 'Ireland',
  add column if not exists country_code text default 'IE',
  add column if not exists is_verified boolean default false,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Ensure avatar_url does not default to mock imagery for new accounts
alter table public.profiles alter column avatar_url drop default;
alter table public.profiles alter column avatar_url set default null;
alter table public.profiles alter column phone set default '';

-- 3. Add all new jobs columns
alter table public.jobs
  add column if not exists rate_type text default 'hourly',
  add column if not exists duration text default 'Immediate - 6 Months',
  add column if not exists tier text default 'basic',
  add column if not exists county text default 'Dublin';

-- 4. Add all new marketplace columns
alter table public.marketplace_items
  add column if not exists images text[] default '{}'::text[],
  add column if not exists tier text default 'standard',
  add column if not exists is_boosted boolean default false,
  add column if not exists boost_expires_at timestamp with time zone,
  add column if not exists county text default 'Dublin';

-- 5. Add all new stolen alerts columns
alter table public.stolen_gear_alerts
  add column if not exists reporter_phone text default '',
  add column if not exists reporter_trade public.trade_type default 'Electrician',
  add column if not exists serial_numbers text default '',
  add column if not exists distinguishing_marks text default '',
  add column if not exists images text[] default '{}'::text[],
  add column if not exists tier text default 'local',
  add column if not exists urgency text default 'CRITICAL',
  add column if not exists status text default 'ACTIVE_ALERT',
  add column if not exists sightings_count integer default 0,
  add column if not exists county text default 'Dublin';

-- 6. Create custom_groups and skill_endorsements if not already present
create table if not exists public.custom_groups (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  member_user_ids uuid[] default '{}'::uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.skill_endorsements (
  id uuid default uuid_generate_v4() primary key,
  target_user_id uuid references public.profiles(id) on delete cascade not null,
  skill text not null,
  endorser_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_skill_endorsement unique (target_user_id, skill, endorser_user_id)
);

create table if not exists public.apprentice_logbook_entries (
  id uuid default uuid_generate_v4() primary key,
  apprentice_id uuid references public.profiles(id) on delete cascade not null,
  trade public.trade_type not null default 'Electrician',
  phase integer not null check (phase between 1 and 7),
  date date default current_date,
  module_code text not null default 'MOD-101',
  module_title text not null,
  hours_logged integer default 0,
  craftsperson_name text default 'Qualified Supervising Craftsperson',
  notes text default '',
  employer_signed_off boolean default false,
  sign_off_date date,
  signoff_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace view public.solas_logbook_entries as 
  select * from public.apprentice_logbook_entries;

alter table public.custom_groups enable row level security;
alter table public.skill_endorsements enable row level security;
alter table public.apprentice_logbook_entries enable row level security;

-- Idempotent policies (drop before create so re-runs never error)
drop policy if exists "Public read endorsements" on public.skill_endorsements;
create policy "Public read endorsements" on public.skill_endorsements for select using (true);

drop policy if exists "Peers endorse skills" on public.skill_endorsements;
create policy "Peers endorse skills" on public.skill_endorsements for insert with check (auth.uid() = endorser_user_id);

drop policy if exists "Peers withdraw endorsement" on public.skill_endorsements;
create policy "Peers withdraw endorsement" on public.skill_endorsements for delete using (auth.uid() = endorser_user_id);

drop policy if exists "Group creators manage" on public.custom_groups;
create policy "Group creators manage" on public.custom_groups for all using (auth.uid() = creator_id);

drop policy if exists "Group members read" on public.custom_groups;
create policy "Group members read" on public.custom_groups for select using (auth.uid() = any(member_user_ids));

drop policy if exists "Apprentices view own logbook" on public.apprentice_logbook_entries;
create policy "Apprentices view own logbook" on public.apprentice_logbook_entries for select using (auth.uid() = apprentice_id);

drop policy if exists "Apprentices manage own logbook" on public.apprentice_logbook_entries;
create policy "Apprentices manage own logbook" on public.apprentice_logbook_entries for all using (auth.uid() = apprentice_id);
```

---

## 4. Storage Buckets Configuration

To enable photo uploads for avatars, on-site portfolio galleries, classified photos, and stolen tool reports, run this in your **SQL Editor**:

```sql
-- 1. Create storage buckets
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true),
  ('posts', 'posts', true),
  ('marketplace', 'marketplace', true),
  ('stolen_gear', 'stolen_gear', true)
on conflict (id) do nothing;

-- 2. Storage security policies (idempotent with drop policy if exists)
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users upload avatar" on storage.objects;
create policy "Users upload avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Users update avatar" on storage.objects;
create policy "Users update avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Public read marketplace photos" on storage.objects;
create policy "Public read marketplace photos" on storage.objects for select using (bucket_id = 'marketplace');

drop policy if exists "Users upload marketplace photos" on storage.objects;
create policy "Users upload marketplace photos" on storage.objects for insert with check (bucket_id = 'marketplace' and auth.role() = 'authenticated');

drop policy if exists "Public read posts media" on storage.objects;
create policy "Public read posts media" on storage.objects for select using (bucket_id = 'posts');

drop policy if exists "Users upload posts media" on storage.objects;
create policy "Users upload posts media" on storage.objects for insert with check (bucket_id = 'posts' and auth.role() = 'authenticated');

drop policy if exists "Public read stolen gear photos" on storage.objects;
create policy "Public read stolen gear photos" on storage.objects for select using (bucket_id = 'stolen_gear');

drop policy if exists "Users upload stolen gear photos" on storage.objects;
create policy "Users upload stolen gear photos" on storage.objects for insert with check (bucket_id = 'stolen_gear' and auth.role() = 'authenticated');
```

---

## 5. Auth Trigger & Profile Provisioning

### Automatic Profile Provisioning
When a user registers through Supabase Auth (email/password), this trigger provisions their profile with their selected trade, apprentice phase, and empty defaults for avatar and phone (so they can enter their own):

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_trade text;
  v_name text;
  v_is_apprentice boolean;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_trade := coalesce(new.raw_user_meta_data ->> 'trade', 'Electrician');
  v_is_apprentice := coalesce((new.raw_user_meta_data ->> 'isApprentice')::boolean, false);

  insert into public.profiles (
    id,
    name,
    handle,
    trade,
    account_type,
    email,
    phone,
    avatar_url,
    town,
    county,
    latitude,
    longitude,
    has_safe_pass,
    is_apprentice,
    track_logbook,
    solas_id,
    apprentice_phase,
    years_experience,
    following_user_ids,
    followers_count,
    skills,
    portfolio,
    work_history
  )
  values (
    new.id,
    v_name,
    coalesce(new.raw_user_meta_data ->> 'handle', '@' || lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'))),
    v_trade::public.trade_type,
    case when coalesce(new.raw_user_meta_data ->> 'accountType', 'personal') = 'business' then 'business'::public.account_type else 'individual'::public.account_type end,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''), -- Blank by default
    null, -- Blank avatar by default so user uploads their own
    coalesce(new.raw_user_meta_data ->> 'town', 'Dublin City'),
    coalesce(new.raw_user_meta_data ->> 'county', 'Dublin'),
    coalesce((new.raw_user_meta_data ->> 'latitude')::double precision, 53.3498),
    coalesce((new.raw_user_meta_data ->> 'longitude')::double precision, -6.2603),
    coalesce((new.raw_user_meta_data ->> 'hasSafePass')::boolean, true),
    v_is_apprentice,
    coalesce((new.raw_user_meta_data ->> 'trackLogbook')::boolean, true),
    case when v_is_apprentice then coalesce(new.raw_user_meta_data ->> 'solasId', 'APP-IE-' || floor(100000 + random() * 900000)::text) else null end,
    new.raw_user_meta_data ->> 'apprenticePhase',
    coalesce((new.raw_user_meta_data ->> 'yearsExperience')::integer, 0),
    '{}'::text[],
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 6. Seed Data & Initial Pricing Tiers

Run this snippet to seed the official Irish pricing tiers into `public.subscription_tiers`:

```sql
insert into public.subscription_tiers (name, tier_code, price_euros, duration_days, features, is_popular)
values
  (
    'Apprentice Sponsor Tier',
    'tier_sponsor',
    4.99,
    30,
    '["Gold Sponsor checkmark", "Free boosts on tool sales", "Direct apprentice Q&A access"]'::jsonb,
    false
  ),
  (
    'Master Contractor Pro',
    'tier_master',
    19.99,
    30,
    '["Featured Contractor badge in Feed", "Unlimited Priority Job Listings", "Direct trade apprentice applicant dispatch"]'::jsonb,
    true
  ),
  (
    'Tool & Material Manufacturer Showcase',
    'tier_manufacturer',
    49.99,
    30,
    '["Verified Manufacturer badge", "Pinned product showcase in Marketplace", "Direct lead generation from site crews"]'::jsonb,
    false
  ),
  (
    'Stolen Tool Radar Blast (150km)',
    'tier_stolen_regional',
    4.99,
    5,
    '["150km regional broadcast", "High-priority red alert ticker", "Scrap yard notification push"]'::jsonb,
    false
  )
on conflict (tier_code) do update set
  price_euros = excluded.price_euros,
  features = excluded.features;
```

---

## 7. Pre-Build Checklist: What Else Are You Missing Before Building?

Before you run `npx cap open android` or build your APK / AAB in Android Studio, check off these **5 critical items**:

### 1. Set Your Live Supabase Environment Variables
In your local environment file (e.g. `.env` in the root directory) before running the build command:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
> **Note**: If these are blank or placeholder values, the app will safely run in offline/local mock storage mode. To connect to your real live database, ensure these two variables match your **Supabase Dashboard → Project Settings → API**.

### 2. Configure Supabase Auth Redirects
In your **Supabase Dashboard → Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (or your live domain)
- **Redirect URLs**: Add both your web domain and your native Android custom scheme:
  - `http://localhost:3000/**`
  - `com.crafted.tradenet://*`
  - `capacitor://localhost`

### 3. Check "Confirm Email" Toggle in Supabase Auth
- Go to **Supabase Dashboard → Authentication → Providers → Email**.
- If you have **not** connected a custom transactional email provider (like Resend or SendGrid), turn **OFF** "Confirm email" for testing. Otherwise, new users will not be able to log in until they click a verification link.

### 4. Stripe Keys (Optional for live payments)
If you want real credit card payments for classified boost tiers and priority job listings:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```
*(If omitted, the checkout modal runs in sandbox demo mode with mock card validation).*

### 5. Final Android Build Command
Whenever you update code or configuration, run:
```bash
npm run build && npx cap sync android
```
Then open Android Studio:
```bash
npx cap open android
```
In Android Studio:
1. Go to **Build → Generate Signed Bundle / APK**.
2. Select your signing keystore (or choose "Debug APK" for immediate on-device testing).
3. Install and run directly on your Android phone!
