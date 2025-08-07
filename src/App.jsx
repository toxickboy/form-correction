import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import ExerciseSelector from './components/ExerciseSelector'
import PoseDetector from './components/PoseDetector'
import { fetchExercises } from './services/api'
import { initOpenAI } from './services/openaiService'

function App() {
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isOpenAIEnabled, setIsOpenAIEnabled] = useState(false)
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch from a backend API
    // For now, we'll use mock data
    const loadExercises = async () => {
      try {
        console.log('Loading exercises...')
        const data = await fetchExercises()
        console.log('Exercises loaded:', data)
        setExercises(data)
      } catch (error) {
        console.error('Failed to load exercises:', error)
      }
    }

    loadExercises()
  }, [])

  const handleExerciseSelect = (exercise) => {
    console.log('Exercise selected:', exercise)
    setSelectedExercise(exercise)
    setIsDetecting(false)
  }

  const startDetection = () => {
    console.log('Starting detection with exercise:', selectedExercise)
    setIsDetecting(true)
  }

  // Initialize OpenAI on component mount
  useEffect(() => {
    const initializeOpenAI = async () => {
      console.log('Initializing OpenAI with environment variable API key')
      console.log('Current environment:', import.meta.env.MODE)
      
      // Try to initialize OpenAI
      const success = initOpenAI()
      console.log('OpenAI initialization result:', success)
      
      setIsOpenAIEnabled(success)
      if (success) {
        console.log('OpenAI initialized successfully')
      } else {
        console.error('Failed to initialize OpenAI - check your .env file and API key')
      }
    }
    
    initializeOpenAI()
  }, [])

  const toggleVoiceFeedback = () => {
    setVoiceFeedbackEnabled(prev => !prev)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Form Correction AI</h1>
        <div className="header-right">
          <div className="status-indicator">
            <div className={`status-dot ${isOpenAIEnabled ? 'enabled' : 'disabled'}`}></div>
            <span>OpenAI: {isOpenAIEnabled ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>
      </header>

      <main>
        {!isDetecting ? (
          <div className="setup-container">
            <ExerciseSelector 
              exercises={exercises} 
              onSelectExercise={handleExerciseSelect} 
              selectedExercise={selectedExercise}
            />
            
            {selectedExercise && (
              <div className="exercise-info">
                <h2>{selectedExercise.name}</h2>
                <p>Selected exercise: {selectedExercise.name}</p>
                
                <div className="openai-setup">
                  <h3>AI Voice Feedback</h3>
                  <div className="status-indicator">
                    <span className={`status-dot ${isOpenAIEnabled ? 'enabled' : 'disabled'}`}></span>
                    <span className="status-text">
                      {isOpenAIEnabled ? 'OpenAI API Connected' : 'OpenAI API Not Connected'}
                    </span>
                  </div>
                  
                  <div className="voice-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={voiceFeedbackEnabled}
                        onChange={toggleVoiceFeedback}
                        disabled={!isOpenAIEnabled}
                      />
                      Enable Voice Feedback
                    </label>
                  </div>
                </div>
                
                <button 
                  className="start-button" 
                  onClick={startDetection}
                >
                  Start Exercise
                </button>
              </div>
            )}
          </div>
        ) : (
          <PoseDetector 
            exercise={selectedExercise} 
            onBack={() => setIsDetecting(false)}
            isDetecting={isDetecting}
            isOpenAIEnabled={isOpenAIEnabled}
            voiceFeedbackEnabled={voiceFeedbackEnabled}
          />
        )}
      </main>
    </div>
  )
}

export default App
