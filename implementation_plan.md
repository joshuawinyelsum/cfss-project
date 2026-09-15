# CFSS Mobile UX Correction Plan

## Step 1 — Audit
- **Current Mobile Navigation**: `frontend/src/app/dashboard/layout.tsx` has a bottom nav linking to Home (`/dashboard`), Work (`/dashboard/surveys/drafts`), Collect (`/surveys`), Submitted (`/dashboard/surveys/submitted`), and More (Left slide-over menu).
- **Home (`/dashboard/page.tsx`)**: Contains "Start Collection" survey type buttons and generic drafts list.
- **Work (`/dashboard/surveys/drafts`)**: Currently just shows drafts, hardcoding Work to Drafts.
- **Draft & Submitted Routes**: Existing lists, filterable by status.
- **More Implementation**: Left-side drawer duplicating Desktop sidebar navigation.
- **Sync Implementation**: `frontend/src/app/dashboard/sync/page.tsx` exists as a technical tool.

## Step 2 — Map current → desired
- **Home**: Remove "Start Collection". Add pure fieldwork status/stats (Total, Drafts, Pending Sync, Submitted), a "Continue Fieldwork" section for unfinished work, and "Attention/Status" for sync issues.
- **Work**: Create `/dashboard/work/page.tsx` as the "fieldwork workspace" combining All, Drafts, Pending Sync, and Submitted. Bottom Nav 'Work' will link here instead of `/dashboard/surveys/drafts`.
- **Collect**: `/surveys/page.tsx` is already the primary survey selection screen. Ensure the Bottom Nav links directly here, where users select Household/Health/etc.
- **More**: Rewrite the mobile slide-over in `layout.tsx` to open from the right. Remove Home/Work/Collect/Submitted from it. Keep: My Group, Sync & Activity, Profile, Settings, Help, Logout.
- **Sync**: Rename "Sync" in navigation to "Sync & Activity".

## Step 3 — Implementation
1. **Layout (`layout.tsx`)**: Update Bottom Nav. Rebuild the Mobile Menu as a right-side drawer.
2. **Home (`dashboard/page.tsx`)**: Refactor to strictly orientation, status, and continue fieldwork.
3. **Work (`dashboard/work/page.tsx`)**: Build the new workspace aggregating local records.
4. **Collect (`surveys/page.tsx`)**: Verify it functions strictly as the type selector.
5. **Sync & Activity (`dashboard/sync/page.tsx`)**: Update title and UX to focus on activity rather than technical sync logic.

## Verification Plan
Run `npm run lint` and `npm run build` after changes. Verify the UX manually matches the directives.
