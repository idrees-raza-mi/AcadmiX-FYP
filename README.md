# AcademicX — Biometric Attendance & Academic Management System

AcademicX is a full-stack platform that **automates classroom attendance using facial recognition** and unifies an institution's core academic operations — departments, batches, courses, students, timetables, marks, and leave — into one connected, real-time system.

It replaces slow, proxy-prone manual roll-call with a contact-less, browser-based biometric workflow that runs on ordinary laptops (no special hardware), and gives administrators a live view of attendance while students track their own records on a mobile app.

> Final Year Project — BS Computer Science, **Government College University Faisalabad (GCUF)**, 2022–2026.

---

## 🌐 Live Demo

| App | URL |
|-----|-----|
| 🖥️ Admin Web Dashboard | https://academicx-admin.vercel.app |
| 📷 Biometric Device App | https://academicx-biometric.vercel.app |
| ⚙️ Server / REST API | https://academicx-server.vercel.app |
| 📱 Student Mobile App | Run via Expo (`npx expo start`) |

---

## ✨ Key Features

### 🧠 Biometric Attendance
- **Facial recognition** with `face-api.js` (SSD MobileNet detector → 68-point landmarks → 128-D descriptor).
- Live matching via **Euclidean distance** with a configurable threshold — resistant to proxy ("buddy") attendance.
- **Fingerprint option** using the browser's **WebAuthn / FIDO2** API.
- Descriptor-only storage (no raw face images are kept).

### 🗓️ Timetable-Driven Sessions
- Weekly timetable per batch; attendance **sessions open/close automatically** for each lecture.
- On completion, absentees are marked automatically.

### 🏫 Academic Management
- Full CRUD for **departments → batches → courses → students** with an approval workflow.
- **Course ↔ batch assignment**, capacity limits, and optional auto-enrollment of a batch.

### 📊 Marks, Grading & Leave
- Component-wise marks (midterm / assignments / quizzes / final) with **auto total, grade, and GPA**.
- Student **leave requests** with a monthly quota and automatic excused-attendance handling.

### ⚡ Real-Time Monitoring
- **Socket.io** live attendance feed — administrators watch students being marked present in real time.

### 🔐 Security & Configurability
- **JWT** authentication with role-based guards (super-admin / admin / HOD / student).
- A dynamic **Settings** module (attendance threshold, grading scale, leave quota, biometric thresholds).

---

## 🏗️ System Architecture

```
 ┌───────────────┐   ┌────────────────┐   ┌────────────────────┐
 │ Student Mobile│   │  Admin Web      │   │ Biometric Device   │
 │ App (Expo)    │   │  Dashboard      │   │ App (face-api.js)  │
 └──────┬────────┘   └───────┬────────┘   └─────────┬──────────┘
        │      REST / Socket.io                      │
        └──────────┬──────────┴───────────┬──────────┘
                   ▼                       ▼
            ┌───────────────────────────────────┐
            │  Express.js REST API + Socket.io   │
            └──────────────────┬────────────────┘
                               ▼
                     ┌────────────────────┐
                     │  MongoDB (Atlas)    │
                     └────────────────────┘
```

Three client apps share **one** backend. The biometric app computes face descriptors **on-device** and sends only the matched student's identity to the server — saving bandwidth and keeping video off the network.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Student mobile app | React Native, Expo (SDK 56) |
| Admin & biometric web | React, Vite, Tailwind CSS |
| Face recognition | `@vladmandic/face-api` (face-api.js) |
| Fingerprint | WebAuthn / FIDO2 |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT, bcrypt |
| Hosting | Vercel + MongoDB Atlas |

---

## 📁 Repository Structure

```
AcademicX/
├── App.js, index.js, app.json   # Student mobile app entry (React Native / Expo)
├── src/                          # Mobile screens, navigation, context, theme
│   ├── screens/                  #   student + admin mobile screens
│   ├── styles/theme.js           #   shared theme tokens
│   ├── socket/                   #   socket client
│   └── config.js                 #   API base URL
├── admin/                        # Admin web dashboard (React + Vite)
│   └── src/{pages,components,context,api}
├── biometric/                    # Biometric device app (React + Vite + face-api.js)
│   ├── src/{pages,components,socket}
│   └── public/models/            #   face-api model files
└── server/                       # Express API + Socket.io + MongoDB
    ├── app.js, server.js         #   app (serverless) + local entry (with sockets)
    ├── routes/ controllers/ models/ middleware/
    └── api/index.js              #   Vercel serverless entry
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or a free **MongoDB Atlas** cluster)
- Expo Go app (to run the mobile app on a device)

### 1. Clone
```bash
git clone https://github.com/idrees-raza-mi/AcadmiX-FYP.git
cd AcadmiX-FYP
```

### 2. Backend (`server/`)
```bash
cd server
npm install
# create server/.env :
#   MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/academicx
#   JWT_SECRET=<long-random-string>
#   JWT_EXPIRE=7d
#   SUPERADMIN_SETUP_KEY=<one-time-setup-key>
npm run dev          # starts on http://localhost:5000 (with Socket.io)
```
Create the first super-admin (one time):
```bash
curl -X POST http://localhost:5000/api/auth/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@academicx.edu","password":"ChangeMe123","setupKey":"<SUPERADMIN_SETUP_KEY>"}'
```

### 3. Admin Dashboard (`admin/`)
```bash
cd admin
npm install
echo "VITE_API_URL=http://localhost:5000" > .env.local
npm run dev          # http://localhost:5173
```

### 4. Biometric App (`biometric/`)
```bash
cd biometric
npm install
echo "VITE_API_URL=http://localhost:5000" > .env.local
# Ensure face-api models exist in biometric/public/models/
npm run dev
```
> WebAuthn (fingerprint) needs HTTPS in production; `localhost` is treated as secure for development.

### 5. Student Mobile App (root)
```bash
npm install
# In src/config.js set USE_LOCAL=true and LOCAL_IP to your PC's LAN IP for device testing,
# or leave it pointing at the deployed server.
npx expo start -c     # scan the QR code with Expo Go
```

---

## 📖 Typical Workflow

1. **Admin** creates a Department → Batch → Course (assigned to the batch) → enrolls students.
2. **Admin** registers each student's face in the **Biometric App → Setup**.
3. **Admin** adds a **Timetable** slot for the batch/course.
4. On class day, the **Biometric App** opens the session, scans faces, and marks attendance live.
5. **Admin** watches the **Live Attendance** monitor; **students** see their attendance & GPA in the mobile app.

---

## 👥 Team & Roles

| Member | Reg. No. | Role |
|--------|----------|------|
| **Muhammad Adrees Raza** | 2022-GCUF-060177 | Project Leader · Backend & Database (API, server, deployment) |
| **Maha Mariyam Fiaz Hashmi** | 2022-GCUF-060189 | UI/UX Design · Student Mobile App |
| **Manzar Abbas** | 2022-GCUF-060168 | Biometric & Computer-Vision Subsystem |
| **Mushtaq Hussain** | 2022-GCUF-060185 | Admin Web Dashboard · QA & Documentation |

**Supervised by:** Prof. Dure-Subhani — Department of Computer Science, GCUF.

---

## 📌 Notes & Limitations
- No liveness / anti-spoofing detection yet (a photo could match) — planned for a future release.
- Recognition accuracy depends on lighting and camera quality.
- On free hosting tiers, persistent real-time connections and uploaded files may be limited.

## 📄 License
Created for educational purposes as a Final Year Project at Government College University Faisalabad.
