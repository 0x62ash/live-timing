/**
 * Heatmap Color Utility
 * Generates colors for lap time visualization (fast = green, slow = red)
 */

// Pitstop threshold in milliseconds (50 seconds)
export const PITSTOP_THRESHOLD = 50000;

/**
 * Check if a lap is a pitstop lap (exceeds threshold)
 * @param {number} lapTime - Lap time in milliseconds
 * @returns {boolean}
 */
export function isPitstopLap(lapTime) {
  return lapTime && lapTime > PITSTOP_THRESHOLD;
}

/**
 * Calculate color intensity based on lap time relative to best and worst times
 * @param {number} lapTime - Lap time in milliseconds
 * @param {number} bestTime - Best lap time in milliseconds
 * @param {number} worstTime - Worst lap time in milliseconds
 * @param {boolean} muted - Use muted colors (default: false)
 * @returns {string} RGB color string
 */
export function getHeatmapColor(lapTime, bestTime, worstTime, muted = true) {
  if (!lapTime || !bestTime || !worstTime) {
    return 'rgb(60, 60, 60)'; // Default gray for missing data
  }

  // Normalize time to 0-1 range (0 = best/fastest, 1 = worst/slowest)
  const range = worstTime - bestTime;
  let normalized = range > 0 ? (lapTime - bestTime) / range : 0;
  
  // Clamp value between 0 and 1
  normalized = Math.max(0, Math.min(1, normalized));

  // Create gradient from green (fast) to yellow to red (slow)
  // Using HSL for smoother transitions
  // Green: hue=120, Yellow: hue=60, Red: hue=0
  
  let hue;
  if (normalized < 0.5) {
    // Green to Yellow (0-0.5)
    hue = 120 - (normalized * 240);
  } else {
    // Yellow to Red (0.5-1)
    hue = 60 - ((normalized - 0.5) * 120);
  }

  // Adjust saturation and lightness for better visibility on dark background
  // Muted colors: lower saturation, slightly higher lightness
  const saturation = muted ? 40 : 70;
  const lightness = muted 
    ? 25 + (normalized * 10)  // More muted, darker overall
    : 35 + (normalized * 15); // Normal

  // Convert HSL to RGB
  const rgb = hslToRgb(hue / 360, saturation / 100, lightness / 100);
  
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Get pitstop color (brighter blue)
 * @returns {string} RGB color string
 */
export function getPitstopColor() {
  return 'rgb(60, 140, 200)'; // Slightly muted blue for pitstops
}

/**
 * Get intensity value (0-1) for opacity/brightness adjustments
 * @param {number} lapTime - Lap time in milliseconds
 * @param {number} bestTime - Best lap time in milliseconds
 * @param {number} worstTime - Worst lap time in milliseconds
 * @returns {number} Intensity value 0-1 (1 = fastest)
 */
export function getHeatmapIntensity(lapTime, bestTime, worstTime) {
  if (!lapTime || !bestTime || !worstTime) {
    return 0.5;
  }

  const range = worstTime - bestTime;
  let normalized = range > 0 ? (lapTime - bestTime) / range : 0;
  normalized = Math.max(0, Math.min(1, normalized));

  // Invert so fastest = 1, slowest = 0
  return 1 - normalized;
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {number[]} RGB array [r, g, b]
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Get legend colors for heatmap visualization
 * @returns {object} Object with legend color stops
 */
export function getHeatmapLegend() {
  return [
    { label: 'Fast', color: 'rgb(46, 204, 113)', hue: 120 },
    { label: 'Avg', color: 'rgb(241, 196, 15)', hue: 60 },
    { label: 'Slow', color: 'rgb(231, 76, 60)', hue: 0 }
  ];
}
