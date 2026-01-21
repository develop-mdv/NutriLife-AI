# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands and local development

### Install and run locally

- Install dependencies:
  - `npm install`
- Run the development server (Vite):
  - `npm run dev`
  - The dev server listens on port `3000` and `host: 0.0.0.0` (see `vite.config.ts`).
- Preview a production build locally:
  - `npm run preview` (after `npm run build`).

### Build

- Create a production build:
  - `npm run build` – outputs to `dist/` using Vite.

### Environment configuration

- Runtime access to Gemini is configured via `vite.config.ts`:
  - `GEMINI_API_KEY` is read from `.env.local` using Vite's `loadEnv` and injected as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.
- To run the app against a real Gemini backend, set `.env.local` like:
  - `GEMINI_API_KEY=YOUR_REAL_KEY`
- The repository includes a placeholder `.env.local` which should be replaced with a valid key when actually calling Gemini.

### Tests and linting

- `package.json` defines only `dev`, `build`, and `preview` scripts. There is **no test runner or lint command configured yet**.
- If you add a test/lint tool (e.g. Vitest, ESLint), also add the corresponding `npm` scripts and update this file with the exact commands.

## High-level architecture

This is a single-page React app built with Vite and TypeScript, designed as a mobile-first "AI wellness coach" that combines nutrition, activity, sleep tracking, and chat.

### Entry points and configuration

- `index.html`
  - Russian locale (`<html lang="ru">`) and mobile-optimized meta tags for full-screen PWA-style behavior.
  - Loads Tailwind CSS from CDN and configures a small custom theme (`primary`, `secondary`, `accent` colors and Inter font).
  - Defines an `<div id="root">` container used by React.
  - Contains an `importmap` pointing React, `@google/genai`, `recharts`, etc. to AI Studio CDNs. Vite builds against local `node_modules`, but this file documents the expected library set and may still matter for AI Studio hosting.

- `index.tsx`
  - Standard React entry that finds `#root` and mounts `<App />` via `ReactDOM.createRoot`.
  - Throws early if the root element is not found, which is useful when embedding or changing the HTML shell.

- `vite.config.ts`
  - Uses `@vitejs/plugin-react` for JSX/TSX support.
  - Reads environment variables with `loadEnv` and defines `process.env.API_KEY`/`process.env.GEMINI_API_KEY` so the Gemini client can read them at runtime.
  - Sets `server.port = 3000` and `host = '0.0.0.0'` to allow access from the local network.
  - Adds a `@` alias pointing at the project root (`path.resolve(__dirname, '.')`) for convenient imports.

- `tsconfig.json`
  - Standard TS config used by Vite; types are all colocated at the top level in `types.ts`.

- `metadata.json`
  - Describes the app for AI Studio: name/description and the permissions it expects (`camera`, `microphone`, `geolocation`). If you change which browser APIs are used, keep this file in sync.

### Core data model (`types.ts`)

`types.ts` defines the domain model used across all React components and the Gemini service layer. Key types:

- `Macros`, `FoodEntry` – macronutrient breakdown and individual logged meals.
- `ActivityEntry` – logged workouts/activities with duration, calories burned, timestamp.
- `SleepEntry` and `SleepConfig` – sleep history plus target hours and alarms/reminders.
- `UserProfile` – core user attributes (height, weight, age, gender, goal, activity level, daily calorie and step goals, and optional allergies/preferences/health conditions).
- `RoadmapStep` and `RoadmapTargets` – the AI-generated wellness plan (per-step descriptions and numeric daily targets for calories, water, steps, and sleep).
- `Achievement` – structure for in-app achievements used in the Profile view.
- `ReminderConfig` and `MealRemindersConfig` – per-meal reminder settings.
- `WalkingRoute` – a suggested walking route with distance, duration, and round-trip flag.
- `DailyStats` – per-day aggregated metrics for charts/history.
- `AppView` – enum of high-level screens: `DASHBOARD`, `FOOD_LOG`, `ACTIVITY`, `CHAT`, `PROFILE`, `WALKS`, `SLEEP`.

When modifying behavior, keep these types in sync with both the UI components and the structured responses expected from Gemini in `services/geminiService.ts`.

### Application shell and navigation (`App.tsx`)

`App.tsx` is the central stateful component that orchestrates all features and routing between views.

- Owns most of the long-lived application state:
  - Current `view` (`AppView` enum) and bottom-tab navigation.
  - `profile` (`UserProfile`) and daily targets.
  - `foodEntries` and `activityEntries` as flat in-memory logs.
  - `sleepEntries` and `sleepConfig` for sleep tracking and alarms.
  - `roadmap` (array of `RoadmapStep`) and derived numeric targets from Gemini.
  - Step tracking (`steps`) plus a modal for manual syncing from external devices.
  - Hydration tracking (`waterIntake`, `waterGoal`) and toggleable 2‑hour water reminders.
  - `mealReminders` and internal refs (`lastNotifiedMinute`, `lastSleepNotifiedMinute`) used to throttle notifications.
  - Derived `historyData` and `fullHistory` (`DailyStats[]`) combining mock historical data with today's live stats for charts in the Profile view.

- Handles cross-feature coordination:
  - `handleGenerateRoadmap` calls `generateWellnessRoadmap` (Gemini) and updates:
    - `roadmap` steps rendered in `Profile`.
    - `profile.dailyCalorieGoal`, `profile.dailyStepGoal`, `waterGoal`, and `sleepConfig.targetHours` from returned `targets`.
  - Water reminders: a `useEffect` runs a 2‑hour interval when reminders are enabled and uses the browser `Notification` API for local notifications.
  - Meal and sleep reminders: another `useEffect` polls every 10 seconds, compares the current time to configured reminder times, and triggers meal notifications, bedtime reminders, and wake alarms.
  - Aggregates `todayMacros`, `burnedCalories`, `lastSleepEntry`, and `fullHistory` and passes them into the appropriate feature components.

- Renders a mobile-style layout:
  - A scrollable main content area containing the current view.
  - A bottom navigation bar with four main tabs (Dashboard, Chat, Walks, Profile) and a central floating action button that always opens `FoodLogger`.
  - A modal over the whole app for manual step synchronization.

If you introduce new top-level views or global state, they should generally be wired through `App.tsx` and extend `AppView`/`types.ts` rather than creating separate trees.

### Reusable UI primitives (`components/UI.tsx`)

- Defines small, reusable components used across the app:
  - `Card` – standard rounded card with consistent padding, border, and shadow.
  - `Button` – several visual variants (`primary`, `secondary`, `outline`, `danger`) with consistent sizing and typography.
  - `Input` – a styled text input with Tailwind classes, used for most form fields.
  - `LoadingSpinner` – simple animated spinner.
  - `MarkdownText` – minimal Markdown renderer supporting:
    - Line breaks.
    - Unordered lists (`-` / `•` prefixes) mapped to custom bullet styling.
    - Bold text via `**...**`.

AI-generated text from Gemini (chat replies, recommendations, plan descriptions) is rendered through `MarkdownText`, so any changes to how rich text is displayed should usually be made here.

### Feature components

Each sub-feature lives in its own component under `components/`, with `App.tsx` responsible for choosing which one is visible.

#### `Dashboard.tsx`

- Home screen that aggregates the most important daily metrics:
  - Calorie ring: clickable donut chart (via `recharts`) that toggles between "remaining" and "consumed" calories and incorporates calories burned from activities.
  - Macro breakdown: summary of protein/fat/carbs against dynamic goals derived from the user's daily calorie goal and overall goal (`lose_weight`, `gain_muscle`, `maintain`).
  - Water tracker: visual progress towards `waterGoal`, quick-add buttons (+250, +500 ml), and a toggle for 2‑hour water reminders.
  - Sleep summary: compact card showing last recorded sleep entry and progress towards `sleepConfig.targetHours`, with navigation into the full `SleepTracker` view.
  - Steps & activity: summary of steps vs `profile.dailyStepGoal`, progress bar, CTA buttons for logging activity and syncing steps.
  - Food history: filterable (today / last 7 days / custom date range) list of `FoodEntry` items with expanded views showing macros, contribution to macro goals, and AI recommendations.

This component is intentionally UI-heavy and stateless aside from local UI state (expanded rows, filters); business logic comes from props derived in `App.tsx`.

#### `FoodLogger.tsx`

- Manages the flow for adding or editing a `FoodEntry`:
  - States: `capture` → `analyzing` → `review`.
  - Uses the browser file input (with `capture="environment"`) to grab a photo, converts it to base64, strips the data URL prefix, and passes the raw base64 image to `analyzeFoodImage` in `services/geminiService.ts`.
  - In `review` mode, allows the user to edit the AI-suggested dish name and macros before saving.
  - Combines `ratingDescription` and `recommendation` into a single text blob that is stored on the `FoodEntry`.
- On save, calls the `onSave` callback (from `App.tsx`) with a full `FoodEntry` that is added to or replaces an existing item in `foodEntries`.

When adjusting the food analysis workflow, keep the `analyzeFoodImage` schema and the `FoodEntry` type aligned.

#### `ChatBot.tsx`

- Provides both text chat and live audio chat with an AI coach.
- Text chat:
  - Maintains a `messages` array rendered as chat bubbles; user messages and model messages are differentiated by role and styling.
  - Builds a rich context string (`getUserContext`) from `UserProfile`, today's macros, recent food history, water intake, activity calories, sleep data, and sleep configuration; this context is passed into `sendChatMessage` so Gemini has situational awareness.
  - Performs lightweight client-side intent detection for wake-up alarms using a regex; if matched, it calls `onSetAlarm` and responds locally without sending a Gemini request.
  - Sends the full message history and latest user message to `sendChatMessage`. The response can include `groundingChunks` (web or maps references), which are rendered as small chips/links under the assistant's messages.
  - Looks for a `[UPDATE_PLAN: ...]` tag in Gemini's response; if present and `onUpdateRoadmap` is provided, it strips the tag from the displayed text, calls `onUpdateRoadmap` with the description, and appends a follow-up success/failure message.

- Live (audio) mode:
  - When switched to `live`, creates a `LiveClient` instance from `services/geminiService.ts` and connects it.
  - Shows a full-screen audio UI with connection state, animated microphone avatar, and a button to end the session.

This component is the main consumer of `LiveClient` and `sendChatMessage`; if you modify the chat protocol or Gemini models, start with `services/geminiService.ts` and keep this component's assumptions in sync.

#### `Profile.tsx`

- Multi-tab view (`stats`, `roadmap`, `settings`) for long-term progress and configuration.

Key responsibilities:

- **Stats tab**
  - Two subviews: `today` and `history`.
  - Today view shows progress towards calorie, step, and water goals using `ProgressBar` against `profile` and `stats` props.
  - History view uses `DailyStats[]` passed from `App.tsx` and:
    - Filters to the last week or month.
    - Computes averages for calories, steps, water, and sleep.
    - Renders two bar charts (calories and steps) with `recharts`.

- **Achievements**
  - Builds a derived list of `ExtendedAchievement` objects using the history and current stats (water goal met, steps goal met, calorie precision, roadmap existence, early alarm, streaks, hydration history, etc.).
  - Displays them in a grid with basic progress indication for multi-step achievements.

- **Roadmap tab**
  - On first open (and only if the roadmap is empty), triggers `performRoadmapGeneration` (prop from `App.tsx`, which calls Gemini) to create a default plan.
  - Displays the `roadmap` as a vertical timeline of cards, plus a final "goal achieved" marker.
  - Allows the user to request adjustments by entering free-form wishes; passes those wishes back into `performRoadmapGeneration`, which forwards them to `generateWellnessRoadmap`.

- **Settings tab**
  - Groups all user-configurable profile settings:
    - Physical stats and name editing.
    - Allergies, food preferences, health conditions (used to inform AI prompts).
    - Meal reminders (time pickers and toggles) that integrate with the Notification API.
    - Sleep configuration (target hours and alarm times) kept in sync with `SleepTracker` and ChatBot.
    - Water goal configuration.

Because this component is the primary caller of `performRoadmapGeneration` and the main consumer of historical stats, large changes to the plan or tracking logic should be reflected here as well as in `App.tsx` and `services/geminiService.ts`.

#### Other feature components

- `ActivityLogger.tsx`
  - UI for creating `ActivityEntry` records (type, duration, calories burned) and sending them back to `App.tsx` via `onSave`.

- `SleepTracker.tsx`
  - Interface for logging sleep sessions (`SleepEntry`) and adjusting `SleepConfig`.
  - Cooperates with the alarm/reminder logic in `App.tsx` and the summary card in `Dashboard.tsx`.

- `Walks.tsx`
  - Consumes walking-related props from `App.tsx` (current steps/daily step goal) and works with AI-generated routes from `suggestWalkingRoutes` to propose outdoor walks of appropriate length.

These components follow the same pattern: they are mostly presentational and stateless with respect to long-lived data, relying on props from `App.tsx` and callbacks to push updates back up.

## Gemini and external API integration (`services/geminiService.ts`)

All AI interactions are centralized in `services/geminiService.ts`. Changes to models, prompts, or schemas should typically be made here first.

- Shared setup:
  - Creates a `GoogleGenAI` client with `apiKey` from `process.env.API_KEY`.

- `analyzeFoodImage(base64Image)`
  - Calls `ai.models.generateContent` with `model: 'gemini-3-pro-preview'`.
  - Sends an inline JPEG image plus a detailed Russian-language prompt describing the expected analysis.
  - Uses `responseMimeType: 'application/json'` and a strict `responseSchema` to force a JSON object with:
    - `name`, `calories`, `protein`, `fat`, `carbs`, `rating`, `ratingDescription`, `recommendation`.
  - Maps the numeric fields into a `Macros` object and returns a structure consumed by `FoodLogger`.

- `sendChatMessage(history, message, location?, context?)`
  - Applies simple keyword-based heuristics to decide whether to request `googleSearch` and/or `googleMaps` tools.
  - Chooses `gemini-2.5-flash` when tools are needed (for faster, grounded answers), otherwise `gemini-3-pro-preview`.
  - Builds a Russian `systemInstruction` describing the coach persona and how to use tools.
  - Appends an instruction that, when the user asks to change their plan and the model agrees, it must append a `[UPDATE_PLAN: ...]` tag describing the change.
  - Includes `context` (user profile and current stats) into `systemInstruction` so the model has richer background.
  - Uses the chat API and returns:
    - `text` – assistant reply or a generic error message.
    - `groundingChunks` – web/maps grounding metadata, consumed by `ChatBot` for link chips.

- `generateWellnessRoadmap(userProfile, wishes?)`
  - Sends a textual prompt (in Russian) describing:
    - The user's profile.
    - Instructions for calculating `targets` (calories via Mifflin–St Jeor with activity/goal adjustment, daily water, daily steps, sleep hours).
    - Requirements for building exactly five `steps`, including at least one about sleep.
    - Optional `wishes` from the user for personalization.
  - Expects a JSON object with `targets` and `steps`, both validated via `responseSchema`.
  - Returns `{ steps: RoadmapStep[], targets: RoadmapTargets } | null` and is called by `App.tsx`/`Profile.tsx`.

- `validateAddress(input)`
  - Uses `gemini-2.5-flash` to normalize a Russian-language address string.
  - Returns the normalized address or `null` if the input is not recognized as an address.

- `suggestWalkingRoutes(lat, lng, stepsNeeded, mode, customAddress?)`
  - Estimates target distance from `stepsNeeded` and uses it to build a detailed prompt that:
    - Requests exactly 4 walking routes.
    - In `nearby` mode, focuses on nearby parks.
    - In `direct`/`custom_address` modes, forces the first three routes to be round trips and the fourth to be one-way.
    - Enforces that `endLocation` differs from `startLocation`.
  - Calls `gemini-2.5-flash` with `googleMaps` tool enabled and an optional `latLng` hint.
  - Extracts the first JSON array from the text, parses into `WalkingRoute[]`, and post-processes to ensure round-trip flags and titles are consistent.

- `LiveClient`
  - Encapsulates the browser audio pipeline and Gemini's live audio API:
    - Uses `navigator.mediaDevices.getUserMedia({ audio: true })` and `AudioContext` instances for input/output.
    - Encodes microphone PCM into base64 chunks (`createBlob`) and streams them via `session.sendRealtimeInput`.
    - Decodes base64 PCM from `LiveServerMessage` into `AudioBuffer`s and schedules playback so responses play smoothly.
    - Configures the live session with `responseModalities: [Modality.AUDIO]` and a prebuilt voice (`Kore`).
  - `connect(onClose, userContext?)` sets up contexts, obtains mic access, starts streaming, and wires callbacks.
  - `disconnect()` stops the stream, closes audio contexts (only if not already closed), disconnects processors, and closes the Gemini session.

When changing AI behavior, adjust prompts and schemas here and then adapt the consuming components (`FoodLogger`, `ChatBot`, `Profile`, `Walks`) accordingly.

## Browser APIs and permissions

Several features rely on browser APIs and permissions:

- Notifications:
  - Water reminders, meal reminders, bedtime reminders, and wake alarms use the Web Notifications API.
  - `App.tsx` and `Profile.tsx` both request permission when enabling relevant features and rely on `Notification.permission` checks.
  - Be careful when changing timing logic or adding new notification types to avoid duplicate notifications within the same minute.

- Geolocation:
  - `ChatBot.tsx` requests `navigator.geolocation` on mount and passes coordinates to `sendChatMessage` so Gemini can ground map-related queries.
  - `suggestWalkingRoutes` can also take coordinates for better Google Maps grounding.

- Camera:
  - `FoodLogger.tsx` uses the file input with `accept="image/*"` and `capture="environment"`, which typically opens the device camera on mobile.

- Microphone & audio:
  - `LiveClient` uses `navigator.mediaDevices.getUserMedia` and `AudioContext` to capture and play back audio in live chat.

These capabilities are reflected in `metadata.json`. If you add or remove dependencies on camera, microphone, or geolocation, update both `metadata.json` and any permission/feature checks in the components above.
