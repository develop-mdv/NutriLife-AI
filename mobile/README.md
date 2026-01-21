# NutriLife AI - Mobile App

NutriLife AI is an intelligent mobile application designed to help users track their nutrition, fitness, and sleep, powered by advanced AI for personalized recommendations and food analysis.

## 📱 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (Managed Workflow)
- **Language**: TypeScript
- **Navigation**: React Navigation v7
- **State Management**: React Context & Hooks
- **UI/Animations**:
  - `moti` for simple declarative animations
  - `expo-linear-gradient` for styling
  - `react-native-svg` for vector graphics
- **Sensors & device**: `expo-sensors`, `expo-location`, `expo-image-picker`, `expo-haptics`
- **Networking**: Axios

## 📂 Project Structure

The source code is located in the `src` directory:

- **`src/screens`**: Application screens.
  - **Auth**: Login, Registration, Onboarding.
  - **Main**: Core app features (Dashboard, Food, Chat, Profile, etc.).
- **`src/navigation`**: Navigation configuration (Tab bar, Stack navigators).
- **`src/components`**: Reusable UI components.
- **`src/context`**: Global state (User authentication, theme, etc.).
- **`src/api`**: API client and service functions to communicate with the backend.
- **`src/hooks`**: Custom React hooks.
- **`src/constants`**: App-wide constants (Steps goals, UI colors, etc.).

## 🎨 Design & UX

The application features a modern, premium design system focused on:
- **Glassmorphism & Gradients**: Use of `expo-linear-gradient` and translucent elements (glass headers, overlays) for a depth effect.
- **Theming**: Full support for Light and Dark modes via a custom `ThemeContext`.
- **Custom UI**: Bespoke components like `ProgressRing`, `AnimatedCard`, and a custom Tab Bar with a floating action button.

## 📱 Screens & Functionality

### 1. Dashboard (Home)
The central hub of the user's journey.
- **Nutrition Ring**: Visualizes daily calorie intake vs. goal, displaying "Consumed" or "Remaining" calories on tap.
- **Macro Breakdown**: Horizontal progress bars for Protein, Fats, and Carbs.
- **Water & Sleep**: Quick-add buttons for water (+250/500ml) and sleep duration summary.
- **Activity**: Shows step count (synced with device sensors) and a "Add Activity" shortcut.
- **Food History**: Recent meals list with filter options (24H, 7D).

### 2. AI Food Logger (`FoodLogger`)
Smart meal tracking powered by computer vision.
- **Capture**: Take a photo or upload from the gallery.
- **AI Analysis**: Google Gemini 2.5 Flash analyzes the image to identify the dish, estimate portion size, and calculate Calories/B/F/C.
- **Health Rating**: The AI assigns a health score (1-10) and provides a brief nutritional assessment.
- **Review & Edit**: Users can verify and tweak the estimated values before saving.

### 3. AI Coach (`Chat`)
A context-aware intelligent assistant.
- **Personalized Advice**: The AI knows your profile (age, weight, goal) and daily stats, allowing it to give tailored advice.
- **Plan Adjustment**: You can ask the AI to change your workout or diet plan, and it can update your "Roadmap" directly from the chat.
- **History**: Chat sessions are saved by day, searchable via a history modal.

### 4. Walks (`Walks`)
Motivation to reach step goals.
- **Modes**:
  - **Nearby**: AI suggests green zones and parks nearby.
  - **From Address**: Plan a route starting from a specific location.
- **Route Planning**: Generates routes based on your remaining step goal (e.g., "You need 3000 steps, here is a 2km route").
- **Navigation**: Deep links to Google Maps or Yandex Maps for the actual walk.

### 5. Profile & Settings (`Profile`)
Comprehensive user management.
- **Stats Tab**: Detailed charts for Calories, Steps, Water, and Sleep history (Week/Month views).
- **My Plan Tab**: An AI-generated roadmap for reaching health goals based on user wishes.
- **Settings Tab**:
  - **Alarms**: Configure wake-up alarms and bedtime reminders.
  - **Goals**: Update daily targets.
- **Achievements**: Gamification system (e.g., "Early Bird", "Hydration Master") to boost retention.

### 6. Activity Logger (`ActivityLogger`)
Manual entry for non-step based workouts.
- **Presets**: Quick selection for Run, Gym, Yoga, Swimming, etc.
- **Calculator**: Auto-calculates burned calories based on MET (Metabolic Equivalent) values, activity intensity (Low/Med/High), and user weight.

### 7. Sleep Tracker (`Sleep`)
- **Log**: Slider interface to record sleep duration and quality (1-10) upon waking.
- **Tips**: Static, useful sleep hygiene advice.
- **History**: Weekly overview of sleep patterns.

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm or yarn
- Expo Go app on your phone (or an Android/iOS emulator)

### Installation

1.  Navigate to the mobile directory:
    ```bash
    cd mobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npx expo start
```

- **Scan the QR code** with the Expo Go app (Android) or Camera app (iOS).
- Press `a` to open in Android Emulator.
- Press `i` to open in iOS Simulator.
- Press `w` to run in Web Browser.

## ⚙️ Configuration

Ensure you have the correct API endpoint configured. Check `.env` or `src/constants/config.ts` (if applicable) to point to your local or production server IP address.

> **Note**: If testing on a physical device, ensure your phone and computer are on the **same Wi-Fi network**, and the API URL uses your computer's local IP (e.g., `http://192.168.1.50:4000`), not `localhost`.
