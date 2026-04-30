# Klyvora AI - Intelligent Feedback Analysis Platform

Klyvora AI is an enterprise-grade platform designed to capture, process, and analyze customer feedback in real-time. Built with the MERN stack and integrated with cutting-edge AI (Whisper and Llama-3 via Groq), it transforms raw spoken or written feedback into actionable intelligence.

## Features

- Voice and Text Feedback Capture: Users can seamlessly record voice feedback or type their thoughts.
- Real-Time AI Analysis: Automatically extracts sentiment, emotion, score (0-100), and key topics from feedback.
- Dashboard and Analytics: View aggregate scores, sentiment trends, and topic distribution through interactive charts.
- Staff Tracking: Monitor and analyze feedback specific to individual staff members.
- Dark Mode Support: Fully responsive and themeable user interface.
- Firebase Integration: Secure authentication and scalable NoSQL data storage.

## Technology Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React
- Backend: Node.js, Express.js
- AI/ML: Groq SDK (Whisper-large-v3-turbo for transcription, Llama-3.3-70b for text analysis)
- Database and Auth: Firebase (Firestore, Authentication)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase Project
- Groq API Key

### Installation

1. Clone the repository
   git clone https://github.com/PalDPathak404/echosenseai.git
   cd echosenseai

2. Install dependencies for both client and server
   cd client && npm install
   cd ../server && npm install

3. Configure Environment Variables
   Create a .env file in the client directory:
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   
   Create a .env file in the server directory:
   GROQ_API_KEY=your_groq_api_key
   PORT=5000

### Running the Application

1. Start the Backend Server
   cd server
   npm run dev

2. Start the Frontend Client
   cd client
   npm run dev

The application will be available at http://localhost:5173

## Credits

Developed and designed by Pal Pathak.

## License

This project is licensed under the MIT License - see the LICENSE file for details.