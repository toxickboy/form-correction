/**
 * Calculate the angle between three points
 * @param {Object} a - First point with x, y coordinates
 * @param {Object} b - Middle point (vertex) with x, y coordinates
 * @param {Object} c - Third point with x, y coordinates
 * @returns {number} - Angle in degrees
 */
export const calculateAngle = (a, b, c) => {
  if (!a || !b || !c) return 0;
  
  const ab = [a.x - b.x, a.y - b.y];
  const cb = [c.x - b.x, c.y - b.y];
  
  // Calculate dot product
  const dotProduct = ab[0] * cb[0] + ab[1] * cb[1];
  
  // Calculate magnitudes
  const magAB = Math.hypot(ab[0], ab[1]);
  const magCB = Math.hypot(cb[0], cb[1]);
  
  // Calculate angle in radians and convert to degrees
  const angleRad = Math.acos(dotProduct / (magAB * magCB));
  const angleDeg = angleRad * (180 / Math.PI);
  
  return angleDeg;
};

/**
 * Check if a joint angle is within the expected range
 * @param {number} angle - Calculated angle
 * @param {number} expected - Expected angle
 * @param {number} tolerance - Allowed tolerance in degrees
 * @returns {boolean} - Whether the angle is within tolerance
 */
export const isAngleWithinTolerance = (angle, expected, tolerance) => {
  return Math.abs(angle - expected) <= tolerance;
};