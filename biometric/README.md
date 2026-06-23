# AcademicX Biometric Attendance

A dedicated React/Vite web app for classroom biometric attendance. Designed to run on a single device (laptop or tablet) at the entrance of each classroom.

## Features

- Live face recognition using `@vladmandic/face-api`
- WebAuthn fingerprint authentication
- Real-time attendance updates via Socket.io
- Auto-start and auto-complete sessions based on timetable
- Live countdown timer with colour-coded urgency
- Present / Not-Yet attendance panel with slide-in animations
- Student face & fingerprint registration screen (admin)
- Dark UI optimized for monitoring displays

---

## Quick Start

### 1. Install dependencies

```bash
cd biometric
npm install
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set your server address:

```
VITE_API_URL=http://192.168.100.58:5000
```

### 3. Download face-api.js models

The face recognition models are **not** bundled. Download them from the official repository:

**Model files needed:**
- `ssd_mobilenetv1_model-weights_manifest.json` + shards
- `face_landmark_68_model-weights_manifest.json` + shards
- `face_recognition_model-weights_manifest.json` + shards

**Download source:**
```
https://github.com/vladmandic/face-api/tree/master/model
```

Or clone the repo and copy the `model/` folder:

```bash
git clone --depth=1 https://github.com/vladmandic/face-api.git
cp -r face-api/model/* biometric/public/models/
```

### 4. Place models in the correct folder

All model files must be placed in:
```
biometric/public/models/
```

The app loads them from `/models/` at runtime via:
```js
faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
faceapi.nets.faceLandmark68Net.loadFromUri('/models')
faceapi.nets.faceRecognitionNet.loadFromUri('/models')
```

### 5. Run the dev server

```bash
npm run dev
```

The app starts at **http://localhost:3001** (or the device's local IP on port 3001).

### 6. Open on the classroom device

1. Navigate to `http://<device-ip>:3001` on the classroom laptop/tablet
2. Log in with admin credentials
3. Select the batch for this classroom
4. The schedule auto-loads and sessions start automatically

---

## Usage Flow

### Automatic mode

1. The dashboard polls today's schedule every 30 seconds
2. When `sessionAutoStart` is enabled in server settings, sessions start automatically at their scheduled time
3. Face recognition begins immediately — students walk up to the camera and are marked
4. When `sessionAutoComplete` is enabled, sessions close automatically at scheduled end time

### Manual mode

- Click **Start Now** on any upcoming slot to begin early
- Click **Open Scanner** on an active slot to return to the scanner
- Click **Complete Now** or **Complete Session** to end a session
- Toggle between **Face** and **Fingerprint** mode in the session header

### Biometric Setup

Navigate to **Setup** to register student biometrics:

1. Select the batch
2. Click a student's **Face** button → webcam opens → click **Capture Face**
   - The system captures N samples (configurable via server settings)
   - Each sample is a 128-dimensional face descriptor
3. Click **Fingerprint** → WebAuthn flow opens on the device
   - Student places their finger on the platform authenticator
   - Credential ID is stored on the server

---

## Project Structure

```
biometric/
├── public/
│   └── models/          ← face-api.js model files go here
├── src/
│   ├── api/
│   │   └── client.js    ← Axios instance with auth interceptor
│   ├── socket/
│   │   └── index.js     ← Singleton Socket.io connection
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SettingsContext.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── TodaySchedule.jsx
│   │   ├── ActiveSession.jsx
│   │   └── BiometricSetup.jsx
│   ├── components/
│   │   ├── FaceOverlay.jsx    ← Canvas over webcam
│   │   ├── SessionTimer.jsx   ← Countdown timer
│   │   └── AttendanceList.jsx ← Present/absent panel
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Environment Variables

| Variable       | Default                      | Description                    |
|----------------|------------------------------|--------------------------------|
| `VITE_API_URL` | `http://192.168.100.58:5000` | Backend server base URL        |

---

## Build for Production

```bash
npm run build
```

Serve the `dist/` folder with any static file server (nginx, serve, etc.).

---

## Notes

- Camera permissions must be granted in the browser
- For best face recognition accuracy: ensure good lighting, camera at face height
- WebAuthn fingerprint requires a device with a platform authenticator (Windows Hello, Touch ID, etc.)
- The Socket.io connection auto-reconnects on network interruptions
- All localStorage keys are prefixed `bx_` to avoid conflicts with other apps
