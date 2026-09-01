/**
 * Runnable check for dock return spin direction.
 * Run: node --experimental-strip-types src/utils/robotTrackingHelpers.dockSpin.check.ts
 * (or: npx tsx src/utils/robotTrackingHelpers.dockSpin.check.ts)
 */
import assert from 'node:assert/strict';
import { getTrackVisualState } from './robotTrackingHelpers';
import type { RobotTracking } from '../types/robotTracking';

function robotAtPoint(point: number, finish = false): RobotTracking {
  return {
    _id: 'r1',
    robot_no: 'R1',
    row_length: 100,
    cleaning: {
      start: true,
      finish,
      cleaning_cancelled: false,
      battery_dead: false,
    },
    track_details: [
      { point, timestamp: new Date().toISOString() },
    ],
  } as RobotTracking;
}

// Reverse mid-row → anticlockwise
assert.equal(
  getTrackVisualState(robotAtPoint(35), 'Return Cleaning In Progress', 'Reverse Cleaning')
    .gearSpin,
  'ccw',
);

// At dock, 99% (point 40), finish not received → still anticlockwise toward DS
assert.equal(
  getTrackVisualState(robotAtPoint(40), 'At Dock', 'At Dock').gearSpin,
  'ccw',
);

// Forward pass → clockwise
assert.equal(
  getTrackVisualState(robotAtPoint(25), 'Forward Cleaning In Progress', 'Forward Cleaning')
    .gearSpin,
  'cw',
);

console.log('robotTrackingHelpers.dockSpin.check: ok');
