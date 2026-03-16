## 2026-03-16

- Initialized monorepo structure with `apps/web`, `apps/server`, and `packages/shared`.
- Added initial Next.js 16 app with Tailwind-based design tokens and core UI components (`Button`, `Tile`, mobile shell layout).
- Implemented mobile-first gameplay UI: puzzle board, virtual keyboard, and `/play` screen using a mocked puzzle API.
- Added Deno backend skeleton with `/health`, `/puzzle`, and `/guess` endpoints using Deno KV and shared guess evaluation logic.
- Integrated initial Supabase auth: magic-link login screen, browser Supabase client, and JWT verification middleware on the Deno backend for protected guess submission.
- Extended shared types for friends, challenges, and leaderboard entries; added Deno endpoints for friends management, challenges, and global leaderboard; wired basic PWA manifest and service worker.
- Fixed keyboard coloring bug (was checking uppercase against lowercase state keys).
- Added proper branding to landing page with hexagon logo matching the UI mock.
- Added proper header to play page with logo, DAILY #124 label, settings icon, menu icon, and avatar placeholder.
- Redesigned landing page as a full-width Supabase-style landing page with hero section, features grid, stats, how-it-works, and CTA sections.
- Enriched landing page with full brand positioning: "Think Faster. Guess Smarter. Rise Higher." tagline, competitive tone, tile examples, and proper brand voice throughout.
- Added physical keyboard support to play page (players can now type with their keyboard, not just virtual keyboard).
- Updated play page header with fully populated navigation: Logo, DAILY #124, settings, menu, and avatar linked to login.
- Removed all glow effects and gradients - app now uses simple black (#000000) background with green (emerald-400) accent color only.
- Updated login page with three auth options: Google OAuth, Email Magic Link, and Web3 Wallet placeholder.
- Simplified button styles to remove glow, use rounded corners instead of rounded-full.
- Added geometric hexagonal SVG logo matching the provided brand mark. Created shared `LexisLogo` component used across all pages.
- Shifted entire app color palette from green-heavy to white-dominant. Primary button is now white-on-black. Green (emerald-400) used only as subtle accent for taglines and tile feedback. All headings, text, and icons are white.

## 2026-03-16 — Supabase SSR, Services, Word Validation, Brand Reframe

- Updated `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` from new Supabase project.
- Created `utils/supabase/client.ts`, `utils/supabase/server.ts`, `utils/supabase/middleware.ts` for proper Supabase SSR integration using `@supabase/supabase-js`.
- Created `middleware.ts` at app root to refresh auth sessions on every request.
- Removed old `lib/supabase-client.ts`, replaced with new utils throughout.
- Built class-based `AuthService` (email magic link, Google OAuth, sign out, user state, auth listener).
- Built class-based `WordService` with ~800 solution words and ~3000+ valid guesses. Only real English 5-letter words are accepted; invalid words trigger shake animation and "Not in word list" toast.
- Built class-based `PuzzleService` for tracking puzzle history, computing stats (played, won, win rate, streak, max streak, average attempts), and persisting to localStorage.
- Rewrote `mock-api.ts` with proper two-pass Wordle evaluation algorithm (handles duplicate letters correctly). Added `invalidGuess` flag, `solution` tracking, daily puzzle support.
- Updated play page: added mode toggle (Daily vs Infinite), stats modal, help/how-to-play modal, toast notifications, shake animation on invalid guesses, always-visible 6-row grid, dynamic daily puzzle number.
- Updated login page to use `AuthService` class. Shows user profile when signed in with sign-out option.
- Upgraded app metadata: full `Metadata` export with OG tags, Twitter cards, keywords, viewport config, PWA manifest with description and categories.
- Reframed landing page as "Your Wordle Utopia for Pattern Mastery" — emphasizes training, pattern recognition, and cognitive improvement. Added "Why Training Matters" section with letter frequency intuition, elimination strategy, speed under pressure. Added progress analytics feature card.

## 2026-03-16 — Services, Hints, Admin, Profile, Friends Pages

### Supabase DB Services (Class-Based)
- `ProfileService` — Full CRUD for user profiles via Supabase `profiles` table. Supports upsert, tier computation (unranked → master based on win count), puzzle result recording (auto-updates played/won/streak/maxStreak/winRate/avgAttempts/fastestSolve), display name/bio/avatar updates, leaderboard queries, and search.
- `FriendsService` — Manages friendships via Supabase `friendships` table. Send/accept/decline/remove friend requests, block users, get friends list with profile joins, get pending requests. Full challenge system: create challenges with 24h expiry, submit results, auto-determine winner by attempts then time.
- `AdminService` — Dashboard data: aggregate stats (total users, active today, puzzles played, challenges count, avg win rate), paginated user listing with search, puzzle logs, user deletion with cascade cleanup, stats reset, system health checks (database/auth/storage).
- `HintService` — Client-side hint system with credit economy. 5 hint types: reveal random letter, reveal vowel positions, eliminate 5 absent letters, show C/V word pattern, reveal starting letter. Max 3 hints per puzzle, costs 1-2 credits each. Earn credits by winning puzzles.

### New Pages
- `/hints` — Training mode with integrated hint panel. Same puzzle gameplay as arena but with hint buttons below the board. Credit display, used hint history, available hint grid. Earn +2 credits per win.
- `/admin` — Full admin dashboard with 4 tabs: Overview (stat cards, win rate bar), Users (search/paginate, tier badges, reset stats, delete user), Puzzles (recent activity log), System (health checks for DB/auth/storage, environment info). Requires auth.
- `/profile` — User profile page with editable display name and bio. Shows 6-stat grid (played, win rate, streak, best streak, avg attempts, fastest solve), guess distribution chart, recent puzzle history with W/L indicators. Tier badge based on wins. Falls back to local stats when DB profile not available.
- `/friends` — 4-tab friends page: Friends list (challenge/remove), Requests (accept/decline), Search (find players by name/email and send requests), Challenges/Duels (pending/active/completed status, attempts comparison, winner determination).

### Schema
- Created `supabase-schema.sql` with all 4 tables (`profiles`, `friendships`, `challenges`, `puzzle_logs`), RLS policies, auto-profile trigger on signup, and indexes.

### Navigation
- Updated play page header with hint/training link (lightbulb icon), avatar links to `/profile`.
- Updated landing page nav with Training and Friends links.

## 2026-03-16 — NYT Wordle-Rival Quality Overhaul

### Fixes
- Added `metadataBase: new URL("https://lexis.app")` to resolve OG image metadata warning.
- Created SVG favicon at `/public/favicon.svg` — resolves 404 for `/icon-192.png`.
- Updated `manifest.webmanifest` to reference SVG icon.
- Removed all navigation links from landing page footer — now shows only "© 2026 Lexis".

### Animations (NYT Wordle Parity)
- **Tile flip**: 500ms rotateX flip animation on row reveal with staggered 300ms delay per tile.
- **Tile pop**: 100ms scale-up on letter entry, triggered per column.
- **Bounce on win**: 1s bounce animation with staggered delay across winning row tiles.
- **Row shake**: 500ms horizontal shake on invalid guess or insufficient letters.
- **Toast slide-in**: 150ms opacity+translate toast animation, replaces `animate-bounce`.
- **Key press**: 80ms scale-down feedback on keyboard tap.

### Tile Component (NYT-Exact)
- 62×62px tiles with 2rem bold uppercase letters.
- Empty tiles: transparent bg with 2px `#3a3a3c` border.
- Filled (typing) tiles: transparent bg with 2px `#565758` border (brighter = active).
- Correct: `#538d4e`, Present: `#b59f3b`, Absent: `#3a3a3c` — all borderless, white text.
- Supports `flip`, `bounce`, `pop` animation props with stagger delay.

### Keyboard (NYT-Exact)
- QWERTY layout with flexbox sizing. Middle row offset with 5% horizontal padding.
- ENTER and ⌫ keys at 1.5× width, 58px height across all keys.
- Color states match tile colors exactly. Default key: `#818384`.
- Active press animation on tap.

### Play Page (NYT-Level UX)
- Full-height `100dvh` layout: header → mode selector → centered board → pinned keyboard.
- NYT-style thin header bar (50px) with centered logo, help/stats/settings icons.
- **Hard Mode**: toggle in settings. Enforces revealed hints in subsequent guesses.
- **Share results**: copies emoji grid to clipboard with puzzle number and attempt count.
- **Countdown timer**: shows time until next daily puzzle in stats modal.
- **Win messages**: "Genius" (1), "Magnificent" (2), "Impressive" (3), "Splendid" (4), "Great" (5), "Phew" (6).
- **Reveal timing**: keyboard disabled during 1.5s tile reveal animation, then auto-shows stats.
- **How to Play modal**: NYT-exact examples with colored tile demonstrations.
- **Settings modal**: Hard Mode toggle with visual switch component.

### Color System
- Background: `#121213` (NYT dark). Borders: `#3a3a3c`. Keyboard default: `#818384`.
- Tailwind config updated to match NYT color palette.

---

## 2026-03-16 — Visual Overhaul: Exotic Fonts, Scroll Animations, Parallax

### Fonts
- Added **Syne** (display/headlines), **Space Grotesk** (body), **JetBrains Mono** (mono/labels) via Google Fonts.
- Wired into `layout.tsx` (preconnect + stylesheet), `tailwind.config.mjs` (fontFamily), and `globals.css` (body font-family).
- Background changed from `#121213` to `#060606` for deeper contrast.

### Landing Page Redesign (`page.tsx`)
- Converted to `"use client"` for Intersection Observer and animation hooks.
- **Floating parallax orbs**: blurred colored circles that drift on scroll via `data-speed` parallax.
- **Scroll-triggered reveals**: `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale` classes animated via IntersectionObserver.
- **Fixed glass navbar**: backdrop-blur with logo hover spin and button hover fill animation.
- **Animated hero tiles**: cycling word demo with flip animations (BRAIN → THINK → WORDS → LEXIS → SHARP).
- **Marquee ticker**: ultra-wide text marquee with brand keywords at 4% opacity.
- **Bento feature grid**: asymmetric 12-column grid with large, tall, small, and wide cards. Hover lift + green border glow.
- **Animated stat counters**: numbers count up with easeOutCubic when scrolled into view (50K+, 1M+, 100+, 99%).
- **Interactive tile examples**: hover scale + rotate on gameplay mechanic tiles.
- **Numbered training steps**: alternating left/right slide reveals with oversized ghost numbers.
- **Subtle grid background**: pulsing 60px grid overlay on hero and CTA sections.
- **Noise texture**: SVG fractalNoise overlay for film-grain texture.
- **Card hover effects**: translateY(-6px) lift with green border color transition.
- **Staggered children**: CSS variable `--i` for sequential reveal delays.
- **Text glow**: green text-shadow on the gradient "Utopia" headline.
- **Status badge**: "Now in Public Beta" pill with animated pulse dot.

---

## 2026-03-16 — Hero Brightness Fix, Logo Redesign, Auth OTP + Web3, Style Propagation

### Hero Brightness Fix
- Orb opacity increased from 15% to 35% in CSS `.orb` class.
- Noise overlay switched to `mix-blend-mode: overlay` and reduced to 1.5% opacity.
- Added two radial gradient spotlights behind hero text (green 22% + white 6%).
- Headline text remains pure white. Body text upgraded from `zinc-400` to `zinc-200`.
- "Utopia" gradient shifted to brighter values (`#6abf5e` → `#8ff07a` → `#d4c84a`).
- Text glow strengthened to 50% + 25% opacity.
- CTA buttons get white box-shadow glow.
- Removed `LexisLogo` component from hero section entirely.

### Logo Redesign (`lexis-logo.tsx`)
- Replaced old hexagon wireframe with a tile-based "L" shape — 5 rounded rectangles forming a word puzzle motif.
- Tiles use `linearGradient` fills: green gradient, gold gradient, white solid.
- Letter marks (L, E, X, I) embedded using `<text>` elements in Syne font.
- Ghost outline tile for visual depth.

### Auth: OTP + Web3 (`AuthService.ts`, `login/page.tsx`)
- **Email OTP**: Replaced magic link with `signInWithOtp` + `verifyOtp` two-step flow.
- Login page now shows email input → "Send Verification Code" → 6-digit OTP input → "Verify & Sign In".
- Custom `OtpInput` component: 6 individual digit inputs with auto-focus, backspace navigation, paste support.
- **Web3 Wallet**: Added `signInWithEthereum()` and `signInWithSolana()` using Supabase native `signInWithWeb3` API.
- Login page shows Ethereum and Solana wallet buttons with branded icons.
- Error handling for missing wallet extensions (MetaMask/Phantom).
- **Google OAuth**: Unchanged, with colored brand icon.

### Email Templates
- Supabase email templates (OTP, confirmation, etc.) **can** be managed via the Management API (`PATCH /v1/projects/{ref}/config/auth`).
- Template variables: `{{ .Token }}`, `{{ .Email }}`, `{{ .ConfirmationURL }}`.
- For quick changes, use the Supabase Dashboard → Authentication → Email Templates.
- To customize the OTP email body, edit the "Magic Link" template on the dashboard and use `{{ .Token }}` for the code.

### Style Propagation
- `MobileShell` component: added floating green orb for ambient light on all sub-pages.
- Friends page: updated `UserCard` to `rounded-xl`, `bg-white/[0.03]`, `border-white/[0.06]`, `card-hover`. Tab buttons use new glass style.
- Profile page: avatar container → `rounded-2xl` glass, stat cards → unified glass card style, inputs → `rounded-xl` glass.
- Admin page: `StatCard` → glass style, tabs → glass style, badge → mono font.
- All pages: headers use `font-display` for "LEXIS" wordmark and `tracking-[0.15em]`. Links use `font-body`.
- All pages: `bg-zinc-900` → `bg-white/[0.03]`, `border-zinc-800` → `border-white/[0.06]` for consistency.

## 2026-03-16 — Challenges Hub Page

- Created `/challenges` page (`apps/web/src/app/challenges/page.tsx`) — dedicated challenges hub using `AppShell` layout with sidebar navigation.
- Three-tab interface: **Active** (playable challenges), **Pending** (incoming/outgoing), **History** (completed/expired).
- Active tab shows "Play" button linking to `/play?challenge=<id>` for unplayed challenges.
- Pending tab: incoming challenges show "Accept & Play" (calls `acceptChallenge` then navigates) and "Decline"; outgoing show "Waiting…" status.
- History tab: shows completed results (attempts comparison, win/loss/draw badges, revealed puzzle word).
- **Create Challenge Modal**: floating "New Challenge" button opens modal with friend picker, challenge type selector (Standard / Timed 60s / Timed 120s), and send action using `FriendsService.sendChallenge`.
- Glass card styling consistent with rest of app: `rounded-xl`, `bg-white/[0.03]`, `border-white/[0.06]`, `font-display`/`font-body`/`font-mono`.
- Time limit shown as amber badge on challenge cards. Status badges color-coded (blue=active, yellow=pending, green=won, red=lost).
- Auth gate: unauthenticated users see sign-in prompt. Uses `useAuth()` hook from `AuthProvider`.
- Flash messages for success/error with colored banners.

