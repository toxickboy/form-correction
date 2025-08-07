// Mock data for exercises
const mockExercises = [
  {
    exercise_id: 'squat1',
    name: 'Squat',
    phases: [
      {
        phase: 'down',
        angles: [
          { joint: 'knee', expected: 90, tolerance: 15 },
          { joint: 'hip', expected: 80, tolerance: 10 }
        ]
      },
      {
        phase: 'up',
        angles: [
          { joint: 'knee', expected: 170, tolerance: 10 },
          { joint: 'hip', expected: 170, tolerance: 10 }
        ]
      }
    ]
  },
  {
    exercise_id: 'pushup1',
    name: 'Push-up',
    phases: [
      {
        phase: 'down',
        angles: [
          { joint: 'elbow', expected: 90, tolerance: 10 },
          { joint: 'shoulder', expected: 30, tolerance: 10 }
        ]
      },
      {
        phase: 'up',
        angles: [
          { joint: 'elbow', expected: 160, tolerance: 10 },
          { joint: 'shoulder', expected: 10, tolerance: 5 }
        ]
      }
    ]
  },
  {
    exercise_id: 'lunge1',
    name: 'Lunge',
    phases: [
      {
        phase: 'down',
        angles: [
          { joint: 'knee', expected: 90, tolerance: 15 },
          { joint: 'hip', expected: 90, tolerance: 15 }
        ]
      },
      {
        phase: 'up',
        angles: [
          { joint: 'knee', expected: 170, tolerance: 10 },
          { joint: 'hip', expected: 170, tolerance: 10 }
        ]
      }
    ]
  }
];

/**
 * Fetch all available exercises
 * @returns {Promise<Array>} - Array of exercise objects
 */
export const fetchExercises = async () => {
  // Return complete exercise data from mockExercises
  return mockExercises.map(exercise => ({
    id: exercise.exercise_id,
    name: exercise.name,
    description: `${exercise.name} exercise`,
    phases: exercise.phases
  }));
};

/**
 * Fetch a specific exercise by ID
 * @param {string} id - Exercise ID
 * @returns {Promise<Object>} - Exercise object
 */
export const fetchExerciseById = async (id) => {
  // In a real app, this would be an API call
  // return await fetch(`/api/exercise/${id}`).then(res => res.json());
  
  // For now, return mock data
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const exercise = mockExercises.find(ex => ex.exercise_id === id);
      if (exercise) {
        resolve(exercise);
      } else {
        reject(new Error('Exercise not found'));
      }
    }, 300); // Simulate network delay
  });
};