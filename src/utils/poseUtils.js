/**
 * Calculate the angle between three points
 */
export const calculateAngle = (a, b, c) => {
  if (!a || !b || !c) return 0;

  const ax = Array.isArray(a) ? a[0] : a.x;
  const ay = Array.isArray(a) ? a[1] : a.y;
  const bx = Array.isArray(b) ? b[0] : b.x;
  const by = Array.isArray(b) ? b[1] : b.y;
  const cx = Array.isArray(c) ? c[0] : c.x;
  const cy = Array.isArray(c) ? c[1] : c.y;

  const ab = [ax - bx, ay - by];
  const cb = [cx - bx, cy - by];

  const dotProduct = ab[0] * cb[0] + ab[1] * cb[1];
  const magAB = Math.hypot(ab[0], ab[1]);
  const magCB = Math.hypot(cb[0], cb[1]);

  if (magAB === 0 || magCB === 0) return 0;

  const cosValue = Math.max(-1, Math.min(1, dotProduct / (magAB * magCB)));
  return Math.acos(cosValue) * (180 / Math.PI);
};

/**
 * Check if a joint angle is within the expected range
 */
export const isAngleWithinTolerance = (angle, expected, tolerance) => {
  return Math.abs(angle - expected) <= tolerance;
};

/**
 * Apply a moving average to smooth angle readings
 */
export const smoothAngle = (newAngle, buffer, bufferSize = 5) => {
  buffer.push(newAngle);
  if (buffer.length > bufferSize) buffer.shift();
  return buffer.reduce((sum, angle) => sum + angle, 0) / buffer.length;
};

/**
 * Exercise-specific angle thresholds
 */
export const EXERCISE_THRESHOLDS = {
  pushup1: {
    elbow: { up: 140, down: 95, tolerance: 15 }
  },
  squat1: {
    knee: { up: 160, down: 90, tolerance: 15 },
    hip: { up: 170, down: 90, tolerance: 20 }
  },
  lunge1: {
    knee: { up: 160, down: 100, tolerance: 15 },
    stance: { minDistance: 0.3, tolerance: 0.1 }
  }
};

/**
 * Rep counting state machine
 */
export const repCountingStateMachine = (currentState, angle, confidence, exerciseType) => {
  if (confidence < 0.6) {
    return { newState: currentState, newPhase: 'neutral', repComplete: false };
  }

  let thresholds = { up: 160, down: 90 };
  if (exerciseType === 'pushup1') {
    thresholds = { up: 140, down: 95 };
  } else if (exerciseType === 'squat1') {
    thresholds = { up: 160, down: 90 };
  } else if (exerciseType === 'lunge1') {
    thresholds = { up: 160, down: 100 };
  }

  let newState = currentState;
  let newPhase = 'neutral';
  let repComplete = false;

  if (angle < thresholds.down) {
    newPhase = 'down';
  } else if (angle > thresholds.up) {
    newPhase = 'up';
  } else if (angle > thresholds.down && angle < (thresholds.down + thresholds.up) / 2) {
    newPhase = 'going_up';
  } else if (angle < thresholds.up && angle > (thresholds.down + thresholds.up) / 2) {
    newPhase = 'going_down';
  }

  switch (currentState) {
    case 'START':
      if (angle < thresholds.down) {
        newState = 'DOWN';
      }
      break;

    case 'DOWN':
      if (angle > thresholds.down && angle < thresholds.up) {
        newState = 'GOING_UP';
        console.log('Transitioning from DOWN to GOING_UP');
      }
      break;

    case 'GOING_UP':
      if (angle > thresholds.up) {
        newState = 'UP';
        repComplete = true; // Count when reaching UP
        console.log('Rep completed! Transitioning from GOING_UP to UP');
      } else if (angle < thresholds.down) {
        newState = 'DOWN';
        console.log('Went back to DOWN without completing the rep');
      }
      break;

    case 'UP':
      if (angle < thresholds.up && angle > thresholds.down) {
        newState = 'GOING_DOWN';
        console.log('Transitioning from UP to GOING_DOWN');
      }
      break;

    case 'GOING_DOWN':
      if (angle < thresholds.down) {
        newState = 'DOWN';
        console.log('Transitioning from GOING_DOWN to DOWN');
      } else if (angle > thresholds.up) {
        newState = 'UP';
        console.log('Went back to UP without completing the cycle');
      }
      break;

    case 'COUNTED':
      newState = 'START';
      break;

    default:
      newState = 'START';
      newPhase = 'neutral';
  }

  return { newState, newPhase, repComplete };
};

/**
 * Validate pose form based on exercise-specific criteria
 */
export const validatePoseForm = (angles, thresholds, phase) => {
  let isCorrect = true;
  let message = 'Good form!';

  if (phase === 'up') {
    if (angles.primary < thresholds.up - thresholds.tolerance) {
      isCorrect = false;
      message = `Extend more (current: ${Math.round(angles.primary)}°, target: ${thresholds.up}°+)`;
    }
    if (angles.secondary && thresholds.secondary) {
      if (Math.abs(angles.secondary - thresholds.secondary.up) > thresholds.secondary.tolerance) {
        isCorrect = false;
        message = 'Adjust your posture - back not straight';
      }
    }
  } else if (phase === 'down') {
    if (angles.primary > thresholds.down + thresholds.tolerance) {
      isCorrect = false;
      message = `Go lower (current: ${Math.round(angles.primary)}°, target: ${thresholds.down}°-)`;
    }
    if (angles.secondary && thresholds.secondary) {
      if (Math.abs(angles.secondary - thresholds.secondary.down) > thresholds.secondary.tolerance) {
        isCorrect = false;
        message = 'Adjust your posture - form incorrect';
      }
    }
  }

  return { isCorrect, message };
};
