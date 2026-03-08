/**
 * Driver Color Utility
 * Generates consistent, unique colors for each driver based on their name
 */

/**
 * Compute a hash value from a string
 * @param {string} str - Input string (driver name)
 * @returns {number} Hash value
 */
function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate HSL color from driver name with good readability on dark background
 * @param {string} driverName - Driver's name
 * @returns {object} Object with hsl, rgb, and hex color values
 */
export function getDriverColor(driverName) {
  const hash = stringToHash(driverName.toLowerCase().trim());
  
  // Use hue from hash (0-360)
  const hue = hash % 360;
  
  // Moderate saturation for readability (55-75%)
  const saturation = 55 + (hash % 21);
  
  // Good lightness for dark background (45-60%)
  const lightness = 45 + (hash % 16);
  
  const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Convert HSL to RGB for inline styles
  const rgb = hslToRgb(hue / 360, saturation / 100, lightness / 100);
  const rgbString = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  
  // Convert RGB to hex
  const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
  
  return {
    hsl,
    rgb: rgbString,
    hex,
    hue,
    saturation,
    lightness
  };
}

/**
 * Lighten a color by a given percentage
 * @param {string} driverName - Driver's name
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} HSL color string
 */
export function getLightenedColor(driverName, percent = 20) {
  const base = getDriverColor(driverName);
  const newLightness = Math.min(95, base.lightness + percent);
  return `hsl(${base.hue}, ${base.saturation}%, ${newLightness}%)`;
}

/**
 * Darken a color by a given percentage
 * @param {string} driverName - Driver's name
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} HSL color string
 */
export function getDarkenedColor(driverName, percent = 20) {
  const base = getDriverColor(driverName);
  const newLightness = Math.max(10, base.lightness - percent);
  return `hsl(${base.hue}, ${base.saturation}%, ${newLightness}%)`;
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
    r = g = b = l; // achromatic
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
 * Convert RGB to hex
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}