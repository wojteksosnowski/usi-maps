import dotenv from 'dotenv';

dotenv.config();

const token = process.env.MAPBOX_ACCESS_TOKEN;
const username = 'wsos';

async function createDuskStyle() {
  console.log('Creating custom Dusk style in Mapbox...');

  // Ultra-Professional Dusk Creative with Hillshading
  const style = {
    version: 8,
    name: 'USI Atmospheric Dusk',
    metadata: { 'mapbox:autocomposite': true },
    sources: {
      composite: {
        url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2',
        type: 'vector'
      },
      terrain: {
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        type: 'raster-dem'
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#1B1C1E' } // Neutral Ink as base for deep shadows
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-shadow-color': '#1B5C8E', // Blue shadows
          'hillshade-highlight-color': '#E5145B', // Magenta highlights
          'hillshade-accent-color': '#9A0B3D',
          'hillshade-illumination-direction': 315
        }
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        paint: { 'fill-color': '#9A0B3D', 'fill-opacity': 0.4 }
      },
      {
        id: 'water',
        type: 'fill',
        source: 'composite',
        'source-layer': 'water',
        paint: { 'fill-color': '#2E86C8', 'fill-opacity': 0.6 }
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'composite',
        'source-layer': 'building',
        paint: { 
            'fill-color': '#1B5C8E', 
            'fill-opacity': 0.6,
            'fill-outline-color': '#2E86C8'
        }
      },
      {
        id: 'roads',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        paint: { 
            'line-color': '#E5145B', 
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 4],
            'line-opacity': 0.7,
            'line-blur': 1 // Atmospheric glow
        }
      },
      {
        id: 'admin',
        type: 'line',
        source: 'composite',
        'source-layer': 'admin',
        paint: { 'line-color': '#D8D9DC', 'line-opacity': 0.2, 'line-width': 0.5 } // Neutral Mist boundaries
      }
    ]
  };

  const response = await fetch(`https://api.mapbox.com/styles/v1/${username}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(style)
  });

  const data = await response.json();
  if (data.id) {
    console.log('Successfully created style!');
    console.log('Style ID:', data.id);
    console.log('Full URL: mapbox://styles/wsos/' + data.id);
  } else {
    console.error('Failed to create style:', data);
  }
}

createDuskStyle();
