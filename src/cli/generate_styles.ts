import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const OWNER = 'wsos';

const COLORS = {
  magenta: '#E5145B',
  orange: '#F39200',
  green: '#5BB733',
  blue: '#2E86C8',
  graphite: '#6E6F72',
  magenta_deep: '#9A0B3D',
  orange_deep: '#A66400',
  green_deep: '#2E7B17',
  blue_deep: '#1B5C8E',
  graphite_deep: '#2E2F31'
};

const GRADIENTS = [
  { name: 'Sunrise', from: 'magenta', to: 'orange' },
  { name: 'Meadow', from: 'green', to: 'blue' },
  { name: 'Dusk', from: 'blue', to: 'magenta' },
  { name: 'Ember', from: 'orange', to: 'magenta' },
  { name: 'Forest', from: 'orange', to: 'green' },
  { name: 'Ocean', from: 'blue', to: 'green' }
];

// Reference axis for mapping
const REF_BLUE = '#2E86C8';
const REF_MAGENTA = '#E5145B';

function parseHex(hex: string) {
  const h = hex.startsWith('#') ? hex.substring(1) : hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

function toHex(r: number, g: number, b: number) {
  const h = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function parseHsl(hsl: string) {
  const matches = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!matches) return null;
  return {
    h: parseInt(matches[1]),
    s: parseInt(matches[2]),
    l: parseInt(matches[3])
  };
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function interpolateColor(color1: string, color2: string, factor: number) {
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);
  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);
  return toHex(r, g, b);
}

/**
 * Enhanced mapping logic for USI Atmospheric Dusk
 */
function mapColor(color: string, targetFrom: string, targetTo: string) {
  let rgb;
  if (color.startsWith('#')) {
    rgb = parseHex(color);
  } else if (color.startsWith('hsl')) {
    const hsl = parseHsl(color);
    if (!hsl) return color;
    rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  } else {
    return color;
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Skip neutral colors (very low saturation or very bright/dark whites/grays)
  if (hsl.s < 10) return color;
  if (hsl.l > 95 || hsl.l < 5) return color;

  // USI Atmospheric palette analysis:
  // Magenta is around H=340
  // Blue is around H=205
  // Purples/Indigos are between 250-300
  
  // We map the hue spectrum [200, 360] to [0, 1] factor
  // where 205 (Blue) -> 0 and 345 (Magenta) -> 1
  
  let factor;
  if (hsl.h >= 200 || hsl.h <= 20) {
    // Normalize hue for 0-360 wrap
    const normalizedH = hsl.h <= 20 ? hsl.h + 360 : hsl.h;
    // Blue (205) to Magenta (345) range
    factor = (normalizedH - 205) / (345 - 205);
  } else {
    // Other colors (greens/yellows) if any - treat as neutral or base factor
    return color;
  }

  factor = Math.max(0, Math.min(1, factor));
  
  // Create base theme color
  const themeColorHex = interpolateColor(targetFrom, targetTo, factor);
  const themeRgb = parseHex(themeColorHex);
  const themeHsl = rgbToHsl(themeRgb.r, themeRgb.g, themeRgb.b);

  // Preserving original brightness and saturation from template
  // but applying theme hue
  const finalRgb = hslToRgb(themeHsl.h, hsl.s, hsl.l);
  return toHex(finalRgb.r, finalRgb.g, finalRgb.b);
}

function processObject(obj: any, from: string, to: string) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(v => processObject(v, from, to));

  const result: any = {};
  for (const key in obj) {
    let val = obj[key];
    if (typeof val === 'string' && (val.startsWith('#') || val.startsWith('hsl'))) {
      val = mapColor(val, from, to);
    } else if (typeof val === 'object') {
      val = processObject(val, from, to);
    }
    result[key] = val;
  }
  return result;
}

async function createStyle(gradient) {
  const template = JSON.parse(fs.readFileSync('usi_dusk_raw.json', 'utf8'));
  const fromHex = COLORS[gradient.from];
  const toHex = COLORS[gradient.to];

  console.log(`Generating ${gradient.name}...`);
  const newStyle = processObject(template, fromHex, toHex);
  
  newStyle.name = `USI ${gradient.name}`;
  delete newStyle.id;
  delete newStyle.owner;
  delete newStyle.created;
  delete newStyle.modified;

  const response = await fetch(`https://api.mapbox.com/styles/v1/${OWNER}?access_token=${MAPBOX_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newStyle)
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  console.log(`Created ${newStyle.name}: mapbox://styles/${OWNER}/${data.id}`);
  return { id: data.id, name: newStyle.name };
}

async function main() {
  const results = [];
  for (const g of GRADIENTS) {
    try {
      results.push(await createStyle(g));
    } catch (e) {
      console.error(`Failed ${g.name}: ${e.message}`);
    }
  }
  fs.writeFileSync('generated_styles.json', JSON.stringify(results, null, 2));
}

main();
