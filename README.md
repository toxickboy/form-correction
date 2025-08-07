# Workout Pose Validator with AI Voice Feedback

A real-time exercise form validation application that uses your webcam and TensorFlow.js for pose detection. The app now features OpenAI GPT-4 powered voice feedback to provide personalized coaching during your workout.

## Features

- Real-time pose detection using TensorFlow.js and MoveNet
- Exercise form validation for squats (more exercises can be added)
- Rep counting with phase detection (up, down, transitions)
- Visual feedback with color-coded joints and connections
- AI-powered voice feedback using OpenAI GPT-4
- Text-to-speech for hands-free workout guidance

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your OpenAI API key:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to the `.env` file:
     ```
     VITE_OPENAI_API_KEY=your_openai_api_key_here
     ```

## Running the App

```
npm run dev
```

Open your browser to the URL shown in the terminal (typically http://localhost:5173/).

## Using the AI Voice Feedback

The app will automatically connect to the OpenAI API using the key from your `.env` file. When the connection is successful, you'll see a green status indicator on the exercise selection screen.

You can toggle voice feedback on/off using the checkbox. When enabled, the AI will provide spoken feedback on your exercise form based on the detected pose.

## Technologies Used

- React + Vite
- TensorFlow.js with MoveNet pose detection model
- OpenAI GPT-4 API for intelligent feedback
- Web Speech API for text-to-speech
- React Webcam for camera access

## Note on Privacy

This application processes all pose detection locally in your browser. When AI feedback is enabled, pose data is sent to OpenAI's API for analysis. No video or images are stored or transmitted.
