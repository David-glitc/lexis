# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Product Name
Lexis (Working Title)

## Product Type
Mobile-first Progressive Web Application (PWA)

## Core Concept
An infinite, competitive, socially-enabled Wordle-style puzzle platform designed for mobile devices and optimized for instant play, competitive progression, and viral sharing.

The application replicates the core mechanics of the popular word puzzle game known as Wordle but expands the experience into an infinite gameplay loop combined with identity, social competition, and player-driven challenges.

The product must feel native, fast, minimal, and elegant while supporting scalable social gameplay mechanics.

---

# 1. Product Vision

Build a lightweight puzzle platform that transforms a simple word guessing mechanic into a competitive social game.

Key product goals:

- Instant gameplay within two seconds of landing
- Infinite puzzle generation
- Persistent player identity
- Competitive leaderboards
- Friend challenges and multiplayer competition
- Shareable puzzle outcomes
- Native-app-like experience through PWA installation

The product must feel modern, sleek, and performance-driven while requiring minimal infrastructure complexity.

---

# 2. Design Philosophy

Design principles must emphasize:

Speed  
Elegance  
Minimal friction  
Mobile ergonomics  
Dark visual aesthetics  

The experience should feel like a premium puzzle tool rather than a casual web toy.

---

# 3. Target Platform

Primary platform:

Mobile web browsers via Progressive Web App.

Secondary platform:

Desktop browser support with responsive layout.

---

# 4. Technology Stack

Frontend Framework  
Nextjs (App Router)

Backend Runtime  
Deno

Database  
Deno KV

Real-Time Communication  
Server Sent Events or WebSockets

Authentication  
Magic Link Email Authentication  
OAuth (Google optional)

PWA Infrastructure  
Service Workers  
Offline Storage  
Installable App Manifest

---

# 5. Core Gameplay Mechanics

## Standard Puzzle Mode

Players attempt to guess a hidden five-letter word.

Rules:

Maximum attempts: 6

Feedback system:

Green tile → correct letter correct position  
Yellow tile → correct letter incorrect position  
Gray tile → letter not present in word

Keyboard feedback must mirror tile colors.

---

## Infinite Mode

Players can generate unlimited puzzles.

Puzzle generation must use:

Seed-based word selection  
Curated dictionary  
Difficulty balancing  

Players should never encounter recently played words.

---

## Hard Mode

Optional mode where revealed hints must be used in subsequent guesses.

Example:
If the letter "A" is confirmed, future guesses must contain "A".

---

## Timed Mode

Optional puzzle mode where players must solve within a fixed time window.

Timer options:

30 seconds  
60 seconds  
120 seconds

---

# 6. User Accounts

Users may play as guests or authenticated users.

Guest Mode

Temporary gameplay session  
Local progress storage only  

Authenticated Mode

Persistent user profile  
Leaderboard eligibility  
Friend system access  
Challenge system access  

Authentication methods:

Magic link email login  
Google OAuth login  

---

# 7. User Profiles

Each player profile contains:

User ID  
Username  
Avatar  
Join date  
Total puzzles solved  
Win percentage  
Average attempts  
Current streak  
Longest streak  
Global score  
Rank tier  

Profile pages must be shareable via link.

---

# 8. Friend System

Users must be able to connect with other players.

Friend connections created through:

Username search  
Invite link  

Friend capabilities:

View online status  
View profile statistics  
Challenge to puzzle  
Compare performance  

Online states:

Online  
Playing  
Idle  
Offline  

---

# 9. Challenge System

Users can create puzzle challenges and send them to friends.

Challenge object includes:

Puzzle seed  
Attempt limit  
Optional timer  
Challenge creator  
Participants list  
Results list  

Challenge flow:

User generates puzzle  
User sends challenge link  
Friend accepts challenge  
Friend solves puzzle  
Results recorded

Winner determined by:

Fewest attempts  
Fastest solve time

---

# 10. Head-to-Head Matches

Two players compete in real time on the same puzzle.

Match rules:

Identical puzzle seed  
Simultaneous gameplay  
Result determined by:

Attempts used  
Solve time  

Match results stored in match history.

---

# 11. Leaderboards

Leaderboards must support multiple ranking scopes.

Global Leaderboard

Ranking based on weighted player score.

Weekly Leaderboard

Resets every week.

Friends Leaderboard

Shows ranking among friend connections only.

Leaderboard ranking factors:

Total puzzles solved  
Win percentage  
Average attempts  
Current streak

Example score formula:

score =
(puzzles_solved × 5)
+ (streak × 3)
− (average_attempts × 2)

---

# 12. Puzzle Dictionary

Puzzle generation must use a curated list of five-letter English words.

Dictionary requirements:

Minimum 8000 valid solution words  
Minimum 12000 allowed guess words  

Words must avoid:

Profanity  
Obscure abbreviations  
Proper nouns  

Puzzle generator must prevent repetition within recent sessions.

---

# 13. Puzzle Generation Algorithm

Puzzle generation pipeline:

Step 1  
Generate random seed.

Step 2  
Select word using weighted dictionary selection.

Step 3  
Check against recently used words.

Step 4  
Assign puzzle ID.

Step 5  
Deliver puzzle to client.

---

# 14. UI/UX Design

## Visual Theme

Primary colors:

Black (#050505)  
Deep green (#0f3d2e)

Accent colors:

Emerald highlights  
Soft neon green

The visual identity must feel sleek, minimal, and modern.

---

## Layout

Mobile-first vertical layout.

Key screen sections:

Header  
Puzzle grid  
Keyboard  
Game status area  

---

## Puzzle Grid

Grid size:

6 rows  
5 columns

Tile animation must include:

Flip animation when revealing letter feedback.

---

## Keyboard

Touch-friendly keyboard.

Keys must visually update color based on guessed letters.

Keyboard layout:

QWERTY

---

## Buttons

Buttons must be:

Rounded  
Minimal  
Subtle glow hover effect  
Soft animations  

---

## Theme Customization

Users must be able to toggle between themes:

Default Dark Theme  
Midnight Theme  
Classic Theme  
High Contrast Theme  

Theme preference stored locally and in user profile.

---

# 15. PWA Requirements

The application must support full Progressive Web App functionality.

Requirements:

Installable application manifest  
Offline gameplay support  
Service worker caching  
Local game state persistence  

Offline mode allows puzzle play and result storage.

Data must sync once internet connection returns.

---

# 16. Data Models

## User

user_id  
username  
avatar  
join_date  
stats  
friends_list  

---

## Game Session

session_id  
user_id  
puzzle_seed  
guesses  
result  
time_elapsed  
timestamp  

---

## Challenge

challenge_id  
creator_id  
puzzle_seed  
participants  
results  
status  

---

## Leaderboard Entry

user_id  
score  
rank  
weekly_score  

---

# 17. Performance Requirements

Initial page load

Under 1.5 seconds

Puzzle generation response

Under 200 milliseconds

Leaderboard queries

Under 300 milliseconds

Initial application bundle

Under 500 KB

---

# 18. Security Requirements

Puzzle seeds must be server-generated.

Client must never receive the solution directly.

Guess validation must occur server-side.

Challenge puzzles must use signed tokens.

Anti-cheat verification must validate puzzle results before leaderboard submission.

---

# 19. Analytics

System must track:

Daily active users  
Puzzles played per user  
Puzzle completion rate  
Average solve attempts  
Challenge participation rate  
Leaderboard engagement  

---

# 20. Scalability Strategy

Initial infrastructure must prioritize simplicity.

Architecture layers:

Nextjs frontend  
Nextjs API routes  
Deno KV storage  

Scaling strategy:

Edge caching for leaderboard queries  
Horizontal scaling of API endpoints  
Optional Redis layer for real-time state  

---

# 21. Minimum Viable Product (MVP)

Version 1 must include:

Infinite puzzles  
Mobile-first UI  
User accounts  
Player profiles  
Global leaderboard  
Friend invitations  
Puzzle challenges  
PWA install support  
Dark theme interface  

---

# 22. Future Expansion

Tournament mode  
AI opponent puzzles  
Multiplayer puzzle rooms  
6-letter puzzle variant  
Timed blitz competitions  
Community puzzle creation system