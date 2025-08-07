import React from 'react';

const ExerciseSelector = ({ exercises, onSelectExercise, selectedExercise }) => {
  return (
    <div className="exercise-selector">
      <h2>Select an Exercise</h2>
      <div className="exercise-list">
        {exercises.length === 0 ? (
          <p>Loading exercises...</p>
        ) : (
          exercises.map((exercise) => (
            <button
              key={exercise.id}
              className={`exercise-item ${selectedExercise?.id === exercise.id ? 'selected' : ''}`}
              onClick={() => onSelectExercise(exercise)}
            >
              {exercise.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ExerciseSelector;