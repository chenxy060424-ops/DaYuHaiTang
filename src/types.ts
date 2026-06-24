/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  life: number;          // Current life (0 to 1)
  maxLife: number;       // In frames or ticks
  spriteIdx: number;     // Index of pre-rendered cache canvas
  size: number;          // Radii for collision/painting
  attraction: number;    // Weight of following the hand
  spinPhase: number;     // Offset for 3D leaf-fluttering simulation
  spinSpeed: number;     // Frequency of 3D flipping
  brightnessPhase?: number; // Phase for natural lightning/glowing effect across the petal surface
}

export interface SpiritFish {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  swimCycle: number;
  swimSpeed: number;
  targetX: number;
  targetY: number;
  trail: { x: number; y: number }[]; // For smooth tail wiggle rendering
  glowingTrails: { x: number; y: number; alpha: number; radius: number }[]; // Mist-like light trails
}

export interface HandData {
  present: boolean;
  x: boolean | number;
  y: boolean | number;
  isOpen: boolean;
  score: number;
  velocity: { x: number; y: number };
}

export interface GameConfig {
  maxPetals: number;
  gravityY: number;
  windX: number;
}
