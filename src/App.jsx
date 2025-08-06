import React, { useState, useEffect } from 'react'
import './App.css'
import ExerciseSelector from './components/ExerciseSelector'
import PoseDetector from './components/PoseDetector'
import { fetchExercises } from './services/api'

function App() {
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)

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

  return (
    <div className="app-container">
      <header>
        <h1>Workout Pose Validator</h1>
        <p>Real-time exercise form validation using your webcam</p>
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
          />
        )}
      </main>
    </div>
  )
}

export default App
