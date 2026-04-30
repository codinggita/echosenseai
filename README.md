# Klyvora AI

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Klyvora AI is an enterprise-grade customer intelligence platform that transforms raw, unstructured feedback into actionable insights. By leveraging state-of-the-art artificial intelligence models, Klyvora provides real-time sentiment analysis, emotional tone detection, and topic extraction, enabling businesses to make data-driven decisions and optimize staff performance.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [Technology Stack](#technology-stack)
4. [Security & Data Privacy](#security--data-privacy)
5. [Getting Started](#getting-started)
6. [Configuration](#configuration)
7. [API Integration](#api-integration)
8. [License](#license)

---

## Architecture Overview

Klyvora AI is built on a scalable, decoupled MERN architecture with a specialized AI integration layer:

- **Client Application:** A highly responsive, theme-aware React application built with Vite. It utilizes Framer Motion for fluid transitions and Recharts for complex data visualization.
- **API Gateway & Processing Server:** An Express.js backend that handles Cross-Origin Resource Sharing (CORS), request validation, and securely communicates with third-party AI providers.
- **AI Engine Layer:** Integrates the Groq SDK to utilize `whisper-large-v3-turbo` for high-fidelity audio transcription and `llama-3.3-70b-versatile` for deep contextual text analysis.
- **Data Persistence Layer:** Utilizes Firebase Firestore for scalable, real-time NoSQL data storage, optimized with on-demand fetching to minimize read quotas.

## Core Features

- **Multi-Modal Feedback Capture:** Seamlessly process both typed text and direct voice recordings from customers.
- **Advanced Sentiment Analysis:** Automatically classifies feedback into positive, neutral, or negative sentiments alongside nuanced emotional tone detection (e.g., happy, frustrated, angry).
- **Automated Topic Extraction:** Identifies and categorizes key topics discussed in the feedback, allowing management to spot recurring issues or praise.
- **Staff Performance Tracking:** Correlates feedback scores with individual staff members to generate comprehensive performance dashboards.
- **Enterprise Dashboard:** Interactive, real-time analytics interface featuring distribution charts, trend lines, and average score metrics.

## Technology Stack

### Frontend
- **Framework:** React 18 / Vite
- **Styling:** Tailwind CSS (with complete Dark Mode support)
- **State Management & Routing:** React Router DOM
- **Visualization:** Recharts
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Middleware:** CORS, Morgan (Logging)

### Artificial Intelligence
- **Transcription:** OpenAI Whisper (via Groq API)
- **Natural Language Processing:** Meta Llama-3 (via Groq API)

### Infrastructure
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Vercel

## Security & Data Privacy

Klyvora AI is designed with security as a priority:
- **Environment Isolation:** Sensitive API keys (such as the Groq API key) are strictly isolated in the backend environment. The client application only communicates via a secure proxy.
- **Data Sanitization:** All incoming text and audio payloads are validated and sanitized before being processed by the AI models.
- **Secure Storage:** Customer feedback is stored securely within Firebase Firestore, protected by comprehensive Security Rules to prevent unauthorized read/write access.

## Getting Started

### Prerequisites

Ensure you have the following installed and configured before proceeding:
- Node.js (v18.x or higher)
- NPM or Yarn package manager
- A Firebase Project (with Firestore and Authentication enabled)
- A Groq API key

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/PalDPathak404/echosenseai.git
   cd echosenseai
   ```

2. **Install Dependencies**
   Navigate to both the client and server directories to install required packages:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

## Configuration

To run Klyvora AI locally, you must configure the environment variables for both the client and the server.

### Client Environment Variables
Create a `.env` file in the `/client` directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### Server Environment Variables
Create a `.env` file in the `/server` directory to secure your AI provider keys:
```env
PORT=5000
GROQ_API_KEY="your-groq-api-key"
```

## Running the Application

To start the application in a development environment, you will need to run both the frontend and backend servers.

1. **Start the Backend Server**
   ```bash
   cd server
   npm run dev
   ```
   The backend will initialize on `http://localhost:5000`.

2. **Start the Frontend Client**
   ```bash
   cd client
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`. The Vite configuration automatically proxies `/api` requests to the backend.

## API Integration

The backend exposes a secure endpoint for feedback analysis.

**Endpoint:** `POST /api/analyze`

**Request Payload:**
```json
{
  "text": "The service was excellent and the staff was very friendly.",
  "audioBase64": null
}
```

**Response Payload:**
```json
{
  "sentiment": "positive",
  "emotion": "happy",
  "score": 95,
  "topics": ["service", "staff"]
}
```

## Credits

**Klyvora AI** was developed and engineered by **Pal Pathak**.
Designed for scalability, performance, and actionable intelligence.

## License

This software is released under the MIT License. See the `LICENSE` file for details.