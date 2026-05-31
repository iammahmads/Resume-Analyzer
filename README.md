# AI Resume Analyzer

An intelligent, full-stack application built with React, Vite, Express, Firebase, and Google's Gemini AI. The application allows job seekers to upload their resumes and compare them against job descriptions for AI-driven feedback, while administrators or HR directors can review candidate evaluations and system-wide metrics.

## Features

- **Candidate Profile (Seeker):** Submit resumes along with a job description for an instant resume audit powered by Gemini.
- **Admin Dashboard (HR):** View total metrics, evaluate candidate alignments, and drill down into parsed candidate profiles.
- **AI Integration:** Uses Gemini's advanced generative model to break down matching metrics, identify gaps, and provide actionable feedback on candidate fitness.
- **Authentication:** Automated, secure email/password signup and login provided by Firebase Authentication.
- **Database:** Fast and secure resume metadata storage utilizing Firebase Firestore.

## Prerequisites

Before running the application locally, ensure you have the following installed and configured:

1. **Node.js**: v18.0 or later recommended.
2. **Firebase Account**: 
   - A Firebase project with **Authentication** (Email/Password enabled) and **Firestore Database** setup.
   - Adjust `src/firebase.ts` with your corresponding Firebase configuration details.
   - Make sure Firestore rules are updated to allow reads and writes (or deploy the included rules in `firestore.rules`).
3. **Google Gemini API Key**: Acquired via Google AI Studio. 

## Local Development Setup

1. **Clone or copy the source code.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. **Start the development server:**
   ```bash
   npm run dev
   ```
   This command starts the backend Express API and the Vite frontend simultaneously, accessible via `http://localhost:3000`.

## Docker Support

To securely build and run the application in an isolated container environment, a production-grade multi-stage `Dockerfile` is included.

### 1. Build the Docker Image

Run the following command in the project root to package your application:

```bash
docker build -t ai-resume-analyzer .
```

### 2. Run the Container

Execute the Docker container, remembering to map the local port and pass in your required environment variables.

```bash
docker run -p 3000:3000 -e GEMINI_API_KEY="your_gemini_api_key_here" ai-resume-analyzer
```
*(Your application will now be running stably at `http://localhost:3000`)*

---
*Powered by Google AI Studio Build.*
