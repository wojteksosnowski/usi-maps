import dotenv from 'dotenv';
import { StaticMapBuilder } from '../core/StaticMapBuilder.js';
import { THEMES } from '../designs/themes.js';

dotenv.config();

const accessToken = process.env.MAPBOX_ACCESS_TOKEN || '';
if (!accessToken) {
  console.error('MAPBOX_ACCESS_TOKEN is required');
  process.exit(1);
}

const mapBuilder = new StaticMapBuilder(accessToken);

const STYLES_TO_TEST = [
  'usi-light',
  'usi-dusk-v2',
  'usi-sunrise',
  'usi-meadow',
  'usi-forest'
];

const RESOLUTIONS = [
  { w: 800, h: 600 },
  { w: 1200, h: 800 },
  { w: 1280, h: 1280 }
];

const HIGH_RES_MODES = [false, true];

async function runTest() {
  console.log('--- Mapbox Performance Test Matrix ---');
  console.log('Style | Resolution | HighRes | Time (ms) | Status');
  console.log('--------------------------------------------------');

  const results = [];
  let totalRequests = 0;

  for (const styleId of STYLES_TO_TEST) {
    const theme = THEMES[styleId];
    for (const res of RESOLUTIONS) {
      for (const highRes of HIGH_RES_MODES) {
        if (totalRequests >= 100) break;

        const options = {
          styleId: theme.mapboxStyle,
          latitude: 50.061,
          longitude: 19.934,
          zoom: 12,
          width: res.w,
          height: res.h,
          highRes: highRes,
          overlays: []
        };

        const url = mapBuilder.buildUrl(options);
        
        const start = Date.now();
        try {
          const response = await fetch(url);
          const duration = Date.now() - start;
          const status = response.status;
          
          console.log(`${styleId.padEnd(12)} | ${String(res.w + 'x' + res.h).padEnd(10)} | ${String(highRes).padEnd(7)} | ${String(duration).padStart(9)} | ${status}`);
          
          results.push({
            styleId,
            resolution: `${res.w}x${res.h}`,
            highRes,
            duration,
            status
          });
        } catch (e: any) {
          console.log(`${styleId.padEnd(12)} | ${String(res.w + 'x' + res.h).padEnd(10)} | ${String(highRes).padEnd(7)} | ERROR     | ${e.message}`);
        }

        totalRequests++;
        // Small delay to avoid aggressive rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Test completed. Total requests: ${totalRequests}`);
  
  // Sort and find the "Difficult Combinations"
  const difficult = results
    .filter(r => r.status === 200)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  console.log('\nTop 5 Slowest Combinations (Difficult):');
  difficult.forEach((d, i) => {
    console.log(`${i+1}. ${d.styleId} at ${d.resolution} (HighRes: ${d.highRes}) - ${d.duration}ms`);
  });
}

runTest();
