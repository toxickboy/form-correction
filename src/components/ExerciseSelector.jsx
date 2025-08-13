import React from 'react';
import VideoTutorial from './VideoTutorial.jsx';

const ExerciseSelector = ({ exercises, onSelectExercise, selectedExercise }) => {
  return (
    <div className="exercise-selector">
      <h2>Select an Exercise</h2>
      <div className="exercise-grid">
        {exercises.length === 0 ? (
          <p>Loading exercises...</p>
        ) : (
          exercises.map((exercise) => (
            <div key={exercise.id} className="exercise-card">
              <button
                className={`exercise-item ${selectedExercise?.id === exercise.id ? 'selected' : ''}`}
                onClick={() => onSelectExercise(exercise)}
              >
                {exercise.name}
              </button>
              <div className="tutorial-video">
                <VideoTutorial exerciseId={exercise.id} />
              </div>
              <div className="exercise-description">
                <p>Click to start exercise detection with AI-powered form correction</p>
              </div>
            </div>
          ))
        )}
      </div>
      <style jsx>{`
        .exercise-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          padding: 2rem;
        }
        
        .exercise-card {
          background: #2c3e50;
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }
        
        .exercise-card:hover {
          transform: translateY(-5px);
        }
        
        .exercise-item {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 5px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
          width: 100%;
        }
        
        .exercise-item:hover {
          background-color: #2980b9;
        }
        
        .exercise-item.selected {
          background-color: #27ae60;
        }
        
        .tutorial-video {
          width: 100%;
          border-radius: 5px;
          overflow: hidden;
        }
        
        .exercise-description {
          color: #ecf0f1;
          font-size: 0.9rem;
          text-align: center;
          padding: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default ExerciseSelector;