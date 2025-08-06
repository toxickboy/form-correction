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
            <div
              key={exercise.exercise_id}
              className={`exercise-item ${selectedExercise?.exercise_id === exercise.exercise_id ? 'selected' : ''}`}
              onClick={() => onSelectExercise(exercise)}
            >
              <h3>{exercise.name}</h3>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExerciseSelector;