# Taypro Console — React Native

Mobile app for Taypro Console (sites, robots, users, commands).

## Stack

- Expo SDK 57
- React Native + TypeScript
- React Navigation (Drawer + Stack)
- Dark/Light theme (`#101936` dark background, `#00C9A7` primary buttons)

## Getting Started

```bash
cd C:\WebDevelopment\taypro-console-react-native
npm install
npm start
```

Press `a` for Android emulator or scan QR with Expo Go.

## Backend API

Update `src/config/api.ts`:

- **Android emulator:** `http://10.0.2.2:5500/api/v1`
- **iOS simulator:** `http://localhost:5500/api/v1`
- **Physical device:** use your machine LAN IP, e.g. `http://192.168.1.10:5500/api/v1`

Login endpoint: `POST /api/v1/auth/sign-in`

> Note: Backend currently uses HttpOnly cookies. For full mobile API auth, add Bearer token support on the backend.

## Project Structure

```
src/
  components/
    layout/   Navbar, Sidebar, Screen
    ui/       Button, Badge, Input
  config/     API base URL
  context/    AuthContext
  navigation/ AppNavigator (drawer + auth stack)
  screens/    Login, Dashboard, placeholders
  theme/      colors, typography, ThemeContext
```

## Implemented (Phase 1)

- [x] Login screen (dark + light theme)
- [x] Navbar with menu, notifications badge, theme toggle
- [x] Sidebar drawer with user card and menu items
- [x] Reusable Button, Badge, Input components
- [x] Dashboard placeholder after login

## Next Steps

- Sites list screen
- Robot list + command sheet
- Bearer token auth for mobile
- Socket.IO live robot updates
