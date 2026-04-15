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

## 2026-03-16 — Settings Page & Web3 Onboarding

### Settings Page (`/settings`)
- Created `apps/web/src/app/settings/page.tsx` with five sections: Profile, Account, Game Preferences, Notifications, Data.
- **Profile**: Display name input, username with `@` prefix and live availability check (debounced 500ms, green check / red X), bio textarea with 160-char counter, save button.
- **Account**: Read-only email display (falls back to "Web3 Wallet"), auth method badge (Email OTP / Google / Ethereum / Solana), sign out button, link to `/profile`.
- **Game Preferences**: Hard Mode, Music (`<MusicToggle />`), High Contrast, Keyboard Vibration — all persisted to localStorage.
- **Notifications**: Challenge notifications and daily reminder toggles — interactive but grayed out with "Coming soon" badges.
- **Data**: Export data and delete account placeholder buttons using toast notifications.
- Reusable `Toggle` switch component (w-12 h-6 pill, green when active). Glass card sections with `rounded-2xl border border-white/[0.06] bg-white/[0.03]`.
- Uses `useAuth()`, `ProfileService`, `useToast()`, `AppShell` layout. Auth gate shows sign-in prompt when not logged in.

### Login Page Web3 Onboarding
- Updated `apps/web/src/app/login/page.tsx` to use `useAuth()` hook instead of manual `authService.getUser()` / `onAuthStateChange` for user state.
- Added `Web3Onboarding` component: when a Web3 user signs in (no email) and has no username, shows onboarding flow with display name + username inputs, "Continue to Arena" button, and "Skip for now" link.
- Onboarding creates/updates profile via `ProfileService.upsertProfile` and sets username via `ProfileService.setUsername`, then redirects to `/play`.
- Profile check: if user already has a username, skips onboarding and shows normal "Welcome back" screen.
- All existing login functionality preserved (OTP, Google, Ethereum, Solana).

### Server Logging & Observability — 2026-03-16 22:00
- Rewrote `apps/server/main.ts` with production-ready features:
  - `Logger` class with structured JSON logging (`info`, `warn`, `error`, `request` methods)
  - Request middleware: every request gets a `request_id`, timing, and structured log
  - `x-request-id` header added to all responses for traceability
  - Proper CORS handling with `OPTIONS` preflight, configurable via `ALLOWED_ORIGIN` env
  - Global try/catch error handling returning `{"error":"Internal server error"}` + logged stack
  - Enhanced `/health` endpoint: returns JSON `{ status, timestamp, version, uptime_ms }`
  - New `/metrics` endpoint: `{ total_requests, total_errors, uptime_ms, routes }` with per-route stats
  - Startup log: `{"level":"info","message":"Lexis API server started","port":8000}`
- Updated `apps/server/deno.json`: added `--unstable-kv` flag, `check` task

### PWA Install Prompt
- Created `apps/web/src/components/global/PwaInstallPrompt.tsx`: listens for `beforeinstallprompt`, shows a beautiful dark glass bottom toast with "Install Lexis" after 3s delay, respects localStorage dismissal and standalone mode detection.
- Wired into `Providers.tsx` so it's globally available on all pages.

### Global Toast System
- Created `apps/web/src/components/global/GlobalToast.tsx`: context-based toast with `ToastProvider` and `useToast()` hook. Stacks up to 3 toasts at top-center, type-based accent bars (green/red/white), auto-dismiss, close button.
- Wired into `Providers.tsx` wrapping all children.

### Ambient Music Player
- Created `apps/web/src/components/global/MusicPlayer.tsx`: procedural ambient music using Web Audio API (low sine drone, cycling pad chords, randomized sparkle tones). `MusicToggle` button with green speaker icon when active. State persisted in localStorage.

### Settings Page
- Created `apps/web/src/app/settings/page.tsx` with five sections:
  - Profile: display name, username with live availability check, bio with char counter
  - Account: email display, auth method badge, sign out, profile link
  - Game Preferences: Hard Mode, Music (MusicToggle), High Contrast, Keyboard Vibration — all localStorage
  - Notifications: Challenge + daily reminder toggles (grayed-out "Coming soon" foundations)
  - Data: Export + Delete account placeholder buttons
- Added Settings to AppShell sidebar navigation

### PWA Enhancements
- Updated `manifest.webmanifest`: changed start_url to `/play`, theme/bg to `#060606`, added shortcuts (Daily, Training, Leaderboard), `orientation: any`
- Created `public/sw.js` service worker: precaches core routes, network-first with cache fallback
- Registered service worker in `layout.tsx` via inline script

### Training Page Rewrite — 2026-03-16
- Rewrote `apps/web/src/app/hints/page.tsx` as a rich training experience:
  - Replaced inline HintPanel with a fullscreen modal overlay (dark glass `bg-[#0a0a0a]` card) opened via a floating lightbulb button with pulsing glow and credit badge
  - Added local "word_clue" hint system with 3 progressive levels: vowel/consonant count (free), category-based clue (1 credit), full answer reveal (0 points penalty)
  - Modal split into "Word Clues" and "Power Hints" sections with large tappable cards; used hints shown as green-bordered cards
  - Responsive layout: board capped at `max-w-[350px]`, keyboard at `max-w-[500px]` on desktop; full-width with padding on mobile
  - Added `pulse-subtle` keyframe animation to `globals.css`
  - All existing game logic (createMockPuzzle, submitMockGuess, keyboard handling, keyboardState derivation) preserved

### Daily Challenge Improvements — 2026-03-16
- **Daily label by date**: Replaced `DAILY #123` with `DAILY DD-MM-Day` format (e.g. `16-03-Su`) using `getDailyLabel()` helper
- **Past daily calendar**: Added `DailyCalendar` component toggled by clicking the DAILY button:
  - Month grid with prev/next navigation, day-of-week headers (Su, M, T, W, Th, F, S)
  - Green dot for solved dates, gray dot for available dates (epoch 2026-01-01 through today)
  - Clicking a date loads that day's puzzle via `createDailyPuzzleForDate()`
  - History persisted in localStorage `lexis_daily_history` as `{ date, solved }[]`
- **Enhanced speed timer**: Replaced plain text timer with progress bar + digital time display:
  - Color-coded: green > 50%, yellow 25-50%, red < 25% time remaining
  - Eye icon toggle to hide/show timer (persisted in localStorage `lexis_hide_timer`)
  - Hidden state shows subtle "Timer hidden" text with show button
- **Speed mode visual indicator**: Active SPEED button shows checkmark icon + green ring-2 border
- **Supporting changes**:
  - `WordService.getDailySolutionForDate(date)`: deterministic solution for any date
  - `mock-api.createDailyPuzzleForDate(date)`: creates puzzle with `daily-YYYY-MM-DD` id
  - Daily history recording on puzzle win/loss in `handleKey` callback

## [2026-03-16T18:00Z] Navigation, Avatars, Training, Settings Overhaul

### Global Navigation (AppShell rewrite)
- **Mobile**: iOS-style fixed bottom tab bar with 5 tabs (Play, Training, Challenges, Leaderboard, Profile) + "More" slide-up sheet (Friends, Settings)
- **Desktop**: Fixed left sidebar with all 8 links + separator before Settings
- Active tab indicator: green dot above icon, white text; inactive: zinc-500
- Profile tab shows user's first letter when signed in
- Removed hamburger menu entirely on mobile
- `Ctrl+Shift+L` → `X` (within 500ms) navigates to `/admin`
- Safe area padding for iOS (`env(safe-area-inset-bottom)`)
- Bottom spacer `h-20 md:hidden` to prevent content overlap with nav bar

### SVG Avatar System
- Created `components/ui/avatars.tsx` with 12 unique character avatars: Ninja, Fox, Astronaut, Robot, Ghost, Alien, Cat, Bear, Wizard, Knight, Panda, Owl
- `UserAvatar` component: renders SVG avatar or initial-letter fallback circle
- `AvatarPicker` component: 4-column grid for selecting avatars

### Training Page (hints) Overhaul
- Fullscreen hint modal overlay with dark glass styling
- 3-level word clue system: vowel/consonant count (free), category hint, full reveal (0 points)
- Floating hint button with pulse animation and credit badge
- Responsive layout: `max-w-[350px]` board / `max-w-[500px]` keyboard on desktop

### Settings Page Improvements
- Added avatar picker section at top of Profile card
- Shows current avatar preview + grid of all 12 options
- Avatar selection saved to Supabase via `avatar_url` field

### Auth Gate on Landing Page
- Signed-in users auto-redirect from landing page (`/`) to `/play`
- Shows spinner while checking auth state

## [2026-03-16T19:00Z] Speed Mode, Daily Puzzle Guards, Data Flow Fixes

### Speed Mode Functional
- Timer now acts as a real countdown: when time expires, puzzle auto-transitions to "lost" state
- "Time's up!" toast with revealed word shown on timeout
- Speed timeout triggers `puzzleService.finishPuzzle(false)` and submits result to backend
- Fallback if speed challenge fails to load from DB — creates a local puzzle instead
- Error handling with `.catch()` on all DB calls to prevent blocking

### Daily Puzzle Once-Per-Day Guard
- Daily puzzles now use date-keyed IDs (`daily-YYYY-MM-DD`) instead of generic `"daily"`
- Game state (rows, attempts, status) saved to localStorage after each guess via `saveDailyState()`
- On load/switch to daily mode, `loadDailyWithState()` restores saved progress
- Completed dailies show final board state + auto-open stats modal
- `handleKey` blocks input when `puzzle.status !== "playing"` (already existed)
- Calendar selection also restores saved state for past dailies

### Calendar Date Selection
- Selecting a past date loads that day's deterministic puzzle via `createDailyPuzzleForDate(date)`
- If the puzzle was previously played, saved state is restored from localStorage
- Today's date selection reuses `loadDailyWithState()` for consistency

### Non-Blocking DB Requests
- All `awardPoints()` and `submitResult()` calls now use `.catch(() => {})` to fire-and-forget
- Speed challenge load wrapped in try/catch with user-facing toast fallback
- Supabase clients created per-action (not stored in component state) to avoid stale references

## [2026-03-16T20:00Z] localStorage → Supabase DB Migration, Cookies, Notifications

### PuzzleService Rewritten for Supabase
- Removed singleton export, now class-based with `SupabaseClient` constructor
- `finishPuzzle(userId, won, mode)` writes to `puzzle_logs` table
- `saveDailyState(userId, ...)` upserts in-progress game state to DB
- `getDailyState(userId, dateKey)` loads saved game from DB
- `isDailyCompleted(userId, dateKey)` checks completion status in DB
- `getHistory(userId)` fetches from `puzzle_logs` ordered by `created_at DESC`
- `getStats(userId)` computes played/wins/streak/avgAttempts from DB
- `getDailyHistory(userId)` returns date+solved pairs for calendar dots
- Zero localStorage usage

### PreferencesService (New)
- Reads/writes `preferences` JSONB column on `profiles` table
- Keys: hard_mode, high_contrast, vibration, notify_challenges, notify_daily, hide_timer, music_enabled
- `get(userId)`, `set(userId, partial)`, `toggle(userId, key)` methods

### NotificationService (New)
- `isSupported()` / `getPermission()` / `requestPermission()` static methods
- `subscribeToPush(userId)` registers service worker push subscription + saves to `push_subscriptions` table
- `unsubscribeFromPush(userId)` removes subscription from browser + DB
- `showLocal(title, options)` for local notifications

### Cookie Consent Component
- Displays consent banner after 1.5s if no `lexis_consent` cookie found
- "Accept All" sets `lexis_consent=all` cookie (365 days)
- "Essential Only" sets `lexis_consent=essential` cookie
- Helper functions: `hasFullConsent()`, `hasAnyConsent()`

### Notification Prompt Component
- Appears after 8s for signed-in users if notification permission is "default"
- "Enable" button triggers push subscription + shows local test notification
- "Not now" sets dismissal cookie
- Dismissal respected via `lexis_notif_dismissed` cookie

### Settings Page Updates
- All toggles (hard mode, high contrast, vibration) now read/write from DB preferences
- Notification section: shows "Enable Push Notifications" button when not granted
- Shows green checkmark when notifications are enabled
- Challenge & Daily toggles connected to DB preferences (no longer localStorage)

### Schema Updates (supabase-schema.sql)
- `profiles.preferences` JSONB column
- `puzzle_logs`: added `guesses TEXT[]`, `puzzle_id TEXT`, `date_key TEXT`, `status TEXT`
- Updated mode constraint to include `daily_speed` and `speed`
- Unique index on `(user_id, date_key)` WHERE mode='daily' for upsert support
- `push_subscriptions` table with RLS for web push notifications

### Play Page Updates
- Stats modal loads stats asynchronously from DB
- Daily calendar history loaded from DB on mount
- Daily state restoration uses `rebuildRows()` to reconstruct board from stored guesses
- All `finishPuzzle`, `saveDailyState` calls pass userId and hit Supabase

---

## [2026-03-16T23:50] Settings Profile Editor — Show Current Details

### Settings Page (`settings/page.tsx`)
- Profile section now shows a loading skeleton while fetching current profile data from DB
- All form fields (display name, username, bio, avatar) are pre-populated with current saved values
- Changed values show a "was: ..." hint beneath the field so users see what they're changing from
- Save button is disabled and shows "No Changes" when nothing has been edited (dirty tracking)
- Save button activates to "Save Changes" only when user modifies a field
- After successful save, form resyncs with latest DB values and resets dirty state
- Account section now displays a profile card with avatar, display name, username, and ranking tier
- Added "Member Since" row showing when the user created their account

---

## [2026-03-17T00:15] Fix Supabase 404s, Services Resilience, Navigation & Speed Mode

### Supabase Schema (`supabase-schema.sql`)
- Completely rewritten as a single idempotent migration safe to re-run
- All tables created with IF NOT EXISTS: profiles, puzzle_logs, friendships, challenges, points_ledger, daily_challenges, push_subscriptions
- All RLS policies wrapped in DO $$ blocks to avoid duplicate policy errors
- Added proper UNIQUE constraint on puzzle_logs(user_id, date_key) for upsert support
- All columns (username, total_points, preferences, guesses, puzzle_id, date_key, status) included in base CREATE TABLE
- **ACTION REQUIRED**: Copy-paste this file into Supabase SQL Editor → New Query → Run

### Service Resilience (all services)
- Every DB call in PuzzleService, ProfileService, PointsService, PreferencesService, DailyChallengeService wrapped in try/catch
- All methods return safe fallback values (null, empty arrays, default objects) on DB failure
- App remains fully functional offline or when tables don't exist yet
- DailyChallengeService creates local fallback challenges when daily_challenges table is missing
- Speed mode works with local fallback puzzle + timer even without DB

### Play Page Navigation
- Added profile icon to play page header (shows user initial letter or generic icon)
- Added global bottom navigation bar matching all other pages (Play, Training, Challenges, Leaderboard, Profile)
- Keyboard area has bottom margin to clear the nav bar on mobile

---

## 2026-03-16 — UI Polish, Type Fix, Profile Avatar, Solo Challenges

### NotificationService Type Fix
- Changed `urlBase64ToUint8Array` return type from `Uint8Array` to `ArrayBuffer` to fix TypeScript strict type incompatibility with `applicationServerKey` (which expects `BufferSource | string | null`)
- The `Uint8Array<ArrayBufferLike>` was not assignable to `ArrayBufferView<ArrayBuffer>` due to `SharedArrayBuffer` incompatibility

### Profile Page — Avatar & Details
- Profile page now renders the user's chosen avatar via the `UserAvatar` component (shows SVG avatar or letter fallback)
- "Edit" text link replaced with a proper "Edit Profile" button that links to `/settings`
- Input fields given slightly more padding for better touch targets

### Button Sizes — Global Fix
- All `Button` sizes (`sm`, `md`, `lg`) updated with `min-h` constraints for consistent, accessible tap targets
- `sm`: min-h 36px, `md`: min-h 42px, `lg`: min-h 48px

### Challenges — Solo Practice Mode
- `CreateChallengeModal` now supports two modes: "Solo Practice" and "vs Friend"
- Solo mode creates a self-challenge (challenger === challenged), auto-accepts it, and navigates directly to `/play?challenge=<id>`
- Time limit selection separated into its own section for clarity in both modes

---

## 2026-03-17 — About Page + Loading Stacks

### About Page
- Added `/about` page describing the origin story (love Wordle, reject paywalls) and linking to `x.com/davidpereishim`

### Robust Loading Stacks
- Added `LoadingStack` skeleton component and route-level `loading.tsx` for: `/about`, `/play`, `/profile`, `/challenges`, `/leaderboard`, `/friends`, `/settings`, `/hints`

### Auth Redirect (Prod-safe)
- Centralized public site URL resolution (prefers `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_VERCEL_URL`)
- Google OAuth `redirectTo` and email OTP `emailRedirectTo` now point to `<site>/auth/callback` to avoid falling back to localhost in production

### Play + Mobile Layout Responsiveness
- Tile sizing now uses `min-[380px]` breakpoint instead of non-standard `xs:` prefix
- Keyboard key heights scale by breakpoint to fit short screens (44px → 52px → 58px)
- Play mode selector wraps on narrow screens and uses smaller horizontal padding
- Keyboard bottom spacing now accounts for safe-area + bottom nav: `mb-[calc(env(safe-area-inset-bottom)+64px)]`

---

## 2026-04-15 — Lexis Platform Upgrade (All Plan To-Dos)

### Data Model + Security Foundation
- Extended `apps/web/supabase-schema.sql` with production tables/policies for `daily_puzzles`, `puzzle_sessions`, `player_ratings`, `anti_cheat_events`, and `user_presence`
- Added challenge seed fields (`seed`, `puzzle_id`) and immutable daily session constraints

### Server-Authoritative API v2
- Replaced `apps/server/main.ts` with authoritative `/v2` routes:
  - `/v2/puzzles/session`, `/v2/puzzles/guess`, `/v2/puzzles/finalize`
  - `/v2/challenges/create`, `/v2/challenges/submit`, `/v2/challenges/get`
- Added signed session signature checks, user/IP-like rate control, anti-cheat event logging, and expanded `/metrics` counters
- Added `AuthoritativeGameService` client wrapper for web integration path

### Daily/Challenge/Leaderboard Integrity
- Refactored daily date handling to UTC via `src/utils/utc-date.ts`
- Updated deterministic daily puzzle IDs and solution selection to UTC-safe mapping
- Challenge creation now uses unique seed and challenge puzzle id in `FriendsService`
- `play` now loads `?challenge=` puzzle context and submits challenge results after completion
- Added segmented leaderboard methods for first-only `daily_speed` and diminishing-return `infinite_speed`
- Updated leaderboard UI with new `Daily Speed` and `Infinite Speed` tabs

### Stats, Social, Presence, and Sound
- `PuzzleService` now recomputes/stores authoritative profile stats + daily streaks after puzzle finalization
- Added public profile route: `/u/[username]` with Add Friend action
- Leaderboard entries are now tappable profile links
- Added realtime presence foundation (`PresenceService`) with auth heartbeat updates and friends page online indicators
- Added modular `SoundService` (keypress, reveal, victory, defeat, notification)
- Added settings controls for `sfx_enabled` and `sfx_volume` persisted via preferences

### Puzzle Arena + Tests
- Added `/arena` with “Coming Soon” placeholders for Word Ladder, Anagram Blitz, Crossword Mini
- Added Puzzle Arena nav entries in `AppShell`
- Added Jest baseline in `apps/web/jest.config.cjs`
- Added tests:
  - `src/utils/utc-date.test.ts`
  - `src/features/puzzle/mock-api.test.ts`
- Test run result: 2 suites passed, 6 tests passed

