# Shruviq (EchoSense)

Shruviq is an Enterprise Customer Experience Intelligence Platform that transforms customer conversations into actionable business intelligence. By leveraging state-of-the-art artificial intelligence models, Shruviq provides real-time sentiment analysis, emotional tone detection, and topic extraction, enabling businesses to make data-driven decisions and optimize staff performance.

## Important Links

*   **Figma Design:** [https://www.figma.com/proto/bKRdU5q74OYXJxaAXLCljD/Work?node-id=502-2&t=zXVrXeegnGTnJAcz-1&scaling=min-zoom&content-scaling=fixed&page-id=32%3A2&starting-point-node-id=503%3A128](https://www.figma.com/proto/bKRdU5q74OYXJxaAXLCljD/Work?node-id=502-2&t=zXVrXeegnGTnJAcz-1&scaling=min-zoom&content-scaling=fixed&page-id=32%3A2&starting-point-node-id=503%3A128)
*   **Live Application:** [https://shruviq.vercel.app](https://shruviq.vercel.app)
*   **Backend API Deployment:** [https://shruviq-backend.onrender.com](https://shruviq-backend.onrender.com)
*   **Postman API Documentation:** [https://documenter.getpostman.com/view/50839228/2sBXqKofJq](https://documenter.getpostman.com/view/50839228/2sBXqKofJq)
*   **YouTube Demonstration:** [https://youtu.be/mvJ5lRVgd9U](https://youtu.be/mvJ5lRVgd9U)

---

## Problem Statement

Businesses struggle to extract meaningful, actionable intelligence from high volumes of raw, unstructured customer feedback. Manual review is time-consuming, prone to human bias, and fails to capture the nuanced emotional tone of the customer. Consequently, critical issues escalate, and opportunities for staff optimization are missed due to delayed or inaccurate sentiment classification.

## Solution

Shruviq solves this by introducing a real-time, AI-driven processing pipeline. Customers can provide feedback via native voice recordings or text. The platform instantly transcribes audio and utilizes Large Language Models to analyze sentiment, detect precise emotional tones, and extract key topics. This data is immediately visualized on a comprehensive dashboard, allowing management to react instantaneously to customer satisfaction metrics.

## Core Features

*   **Multi-Modal Capture:** Secure, browser-native voice recording and text input.
*   **Real-time AI Processing:** High-fidelity audio transcription and deep contextual sentiment extraction.
*   **Advanced Analytics Dashboard:** Live data visualization of sentiment distribution, emotional trends, and aggregate scores.
*   **Staff Performance Tracking:** Correlation of customer satisfaction metrics with specific staff members or interactions.
*   **Secure Authentication:** Role-based access control protecting sensitive analytics data.
*   **Theme Management:** Persistent Light/Dark mode preferences.

## Technology Stack

The application is built on a scalable, decoupled MERN architecture integrated with advanced AI SDKs.

**Frontend Layer:**
*   React 18 (Vite)
*   Tailwind CSS & Shadcn UI (Modern, highly optimized UI components)
*   React Router (Routing and Guards)
*   Zustand (Lightweight, high-performance state management)
*   Framer Motion (Animations)
*   Recharts (Data Visualization)

**Backend Layer:**
*   Node.js & Express.js
*   Firebase Firestore (Real-time NoSQL Database)
*   Firebase Authentication (Secure user management)

**Artificial Intelligence:**
*   Groq SDK
*   Llama-3.3-70b-versatile (NLP & Sentiment)
*   Whisper-large-v3-turbo (Speech-to-Text)

*Architectural Note: Zustand and Shadcn were chosen over Redux Toolkit and MUI to prioritize modern performance standards, reduce bundle size, and maintain strict design consistency without overriding heavy default material styles.*

## Folder Structure

A clean, feature-based architecture is maintained across the workspace:

```text
echosenseai/
├── client/                     # React Frontend
│   ├── public/                 # Static assets (robots.txt, sitemap.xml)
│   └── src/
│       ├── components/         # Reusable UI elements (Layout, UI, ErrorBoundary)
│       ├── features/           # Feature-specific components
│       ├── hooks/              # Custom React hooks (useAuth, useDebounce)
│       ├── lib/                # Third-party integrations (Firebase)
│       ├── pages/              # Route components
│       ├── services/           # API and data fetching logic
│       ├── utils/              # Helper functions
│       ├── App.jsx             # Main application router
│       └── main.jsx            # Application entry point
├── server/                     # Express Backend
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Express middleware (CORS, error handling)
│   ├── routes/                 # API endpoint definitions
│   └── index.js                # Server entry point
└── README.md
```

## Screen Previews

![Dashboard Preview](https://drive.google.com/uc?export=view&id=1hg6CtYsVisz8T9oRHsYRVsRwPr-w_bea)
*Real-time intelligence dashboard.*

![Feedback Capture](https://drive.google.com/uc?export=view&id=1OtR24Sjw39Vitvf33l5BgbRVyhG-Dv9A)
    *Native voice and text feedback interface.*

---

## Local Development Setup

### Prerequisites

*   Node.js (v18.x or higher)
*   A Firebase Project configuration
*   A Groq API key

### Installation

1.  Clone the repository.
2.  Install dependencies for both client and server:
    ```bash
    cd client && npm install
    cd ../server && npm install
    ```
3.  Configure Environment Variables:
    *   **Client (`client/.env`):** Add your Firebase `VITE_FIREBASE_*` variables.
    *   **Server (`server/.env`):** Add your `GROQ_API_KEY` and `PORT`.
4.  Run the development servers:
    *   **Server:** `cd server && npm run dev`
    *   **Client:** `cd client && npm run dev`

## License

This software is released under the MIT License.