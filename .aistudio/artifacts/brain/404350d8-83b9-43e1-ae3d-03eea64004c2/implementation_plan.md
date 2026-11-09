# Revised Implementation Plan — Crafted TradeNet Global Enhancements

## 1. Global Searchable Location Autocomplete (Type-Ahead)
- Replace static `<select>` dropdowns for manual location picking with an interactive **Searchable Location Autocomplete** component (`LocationSearchInput`).
- Users can type any town, city, or country worldwide (spanning Ireland, UK, Europe, US/Canada, Australia/New Zealand, and global hubs) to instantly filter matching locations.
- Dynamically updates the user's base of operations and filters feeds, job listings, marketplace items, and stolen gear radar globally.

## 2. Fix Mobile Chart Squishing & Global Metrics
- Optimize `TradeMarketAnalyticsDashboard.tsx` for mobile viewports with rotated/angled X-axis labels, compact spacing, and international currency / regional adaptation.

## 3. Remove Automatic Safe Pass on Profile Creation
- Modify default profile creation so `hasSafePass` defaults to `false` and mock certifications are not auto-generated. Users manually add Safe Pass or other regional safety credentials (e.g. OSHA, CSCS) via the Certifications manager.

## 4. Training Provider Account Type & Courses Tab
- **Types**: Extend `accountType` in `types.ts` to include `'training_provider'` (Government / Non-Profit like SOLAS/ETBs, Technical University, Private Provider).
- **Navigation & UI**: Add a dedicated **Courses & Training** tab (`'courses'`) to `TabBar.tsx`, `Navbar.tsx`, and `App.tsx`, backed by `CoursesTab.tsx`. Non-profits post for free, private providers support subscription/paid placement.

## 5. Full Deletion Support
- Ensure robust deletion handlers in `storageService` and `supabaseService` so authors can delete their own posts, comments, job listings, and classifieds globally.
