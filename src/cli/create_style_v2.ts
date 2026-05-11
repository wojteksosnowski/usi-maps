import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.MAPBOX_ACCESS_TOKEN;
const style = {
  version: 8,
  name: 'USI Atmospheric Dusk',
  sources: {
    composite: { url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2', type: 'vector' },
    terrain: { url: 'mapbox://mapbox.mapbox-terrain-dem-v1', type: 'raster-dem' }
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#1B1C1E' } },
    { id: 'hillshade', type: 'hillshade', source: 'terrain', paint: { 'hillshade-shadow-color': '#1B5C8E', 'hillshade-highlight-color': '#E5145B' } },
    { id: 'water', type: 'fill', source: 'composite', 'source-layer': 'water', paint: { 'fill-color': '#2E86C8' } },
    { id: 'roads', type: 'line', source: 'composite', 'source-layer': 'road', paint: { 'line-color': '#E5145B', 'line-width': 2 } }
  ]
};

async function run() {
  const r = await fetch(`https://api.mapbox.com/styles/v1/wsos?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(style)
  });
  const data = await r.json();
  fs.writeFileSync('style_output.json', JSON.stringify(data, null, 2));
  console.log('DONE');
}
run();
