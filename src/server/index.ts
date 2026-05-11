import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import { StaticMapBuilder } from '../core/StaticMapBuilder.js';
import { THEMES } from '../designs/themes.js';
import { DesignEngine } from '../core/DesignEngine.js';
import { CsvProcessor } from '../core/CsvProcessor.js';
import { OverlayEngine } from '../core/OverlayEngine.js';

const fastify = Fastify({ logger: true });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../public'),
  prefix: '/',
});
const accessToken = process.env.MAPBOX_ACCESS_TOKEN || '';

if (!accessToken) {
  console.error('ERROR: MAPBOX_ACCESS_TOKEN is not defined in .env file.');
  process.exit(1);
}

const mapBuilder = new StaticMapBuilder(accessToken);
const designEngine = new DesignEngine();

// Register routes
fastify.get('/designs', async () => {
  return Object.values(THEMES);
});

fastify.get('/static-map', async (request, reply) => {
  const query = request.query as any;
  
  const {
    lat = 52.2297, // Warsaw default
    lng = 21.0122,
    zoom = 12,
    width = 1200,
    height = 800,
    theme = 'standard-light',
    bearing = 0,
    pitch = 0,
    markers = '' // Format: "lng,lat,val;lng,lat,val"
  } = query;

  try {
    let overlays: any[] = [];
    if (markers) {
      const points = markers.split(';').map((m: string) => {
        const [lng, lat, val] = m.split(',').map(parseFloat);
        return { lng, lat, val: val || 0 };
      });
      overlays = designEngine.generateDataDrivenMarkers(points, theme);
    }

    const options = designEngine.applyTheme({
      styleId: '', // Will be set by applyTheme
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      zoom: parseFloat(zoom),
      width: parseInt(width),
      height: parseInt(height),
      bearing: parseFloat(bearing),
      pitch: parseFloat(pitch),
      overlays
    }, theme);

    const url = mapBuilder.buildUrl(options);

    return { url, theme: THEMES[theme]?.name || theme };
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/map/csv', async (request, reply) => {
  const query = request.query as any;
  const theme = query.theme || 'deep-dark';
  const csvPath = path.join(__dirname, '../../reference/krakow.csv');

  try {
    const rawPoints = CsvProcessor.parsePoints(csvPath);
    let clustered = CsvProcessor.clusterPoints(rawPoints, 0.02); // Larger grid (0.02 deg ~ 2km)
    
    // Sort by value (density) and take top 100 to stay under URL limit
    clustered = clustered
      .sort((a, b) => (b.val || 0) - (a.val || 0))
      .slice(0, 100);

    const bounds = CsvProcessor.getBounds(rawPoints);

    if (!bounds) throw new Error('No valid points found in CSV');

    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    
    // Approximate zoom based on bounds
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    const zoom = Math.floor(8 - Math.log2(maxDiff));

    const overlays = designEngine.generateDataDrivenMarkers(clustered, theme);

    const options = designEngine.applyTheme({
      styleId: '',
      latitude: centerLat,
      longitude: centerLng,
      zoom: Math.min(13, Math.max(8, zoom)),
      width: 1200,
      height: 800,
      bearing: 0,
      pitch: 0,
      overlays
    }, theme);

    const url = mapBuilder.buildUrl(options);
    return { url, points_count: rawPoints.length, clusters_count: clustered.length };
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/map/hybrid', async (request, reply) => {
  const query = request.query as any;
  const theme = (query.theme as string) || 'dusk-neutral';
  const lat = parseFloat(query.lat) || 50.061;
  const lng = parseFloat(query.lng) || 19.934;
  const zoom = parseFloat(query.zoom) || 12;
  const width = parseInt(query.width) || 1200;
  const height = parseInt(query.height) || 800;
  
  const csvPath = path.join(__dirname, '../../reference/krakow.csv');

  try {
    const rawPoints = CsvProcessor.parsePoints(csvPath);

    // 1. Get CLEAN map URL using MANUAL center and zoom
    const options = designEngine.applyTheme({
      styleId: '',
      latitude: lat,
      longitude: lng,
      zoom,
      width,
      height,
      bearing: 0,
      pitch: 0,
      overlays: []
    }, theme);

    const mapUrl = mapBuilder.buildUrl(options);

    // 2. Fetch the base map image
    const mapResponse = await fetch(mapUrl);
    if (!mapResponse.ok) throw new Error(`Mapbox failed: ${mapResponse.statusText}`);
    const baseBuffer = Buffer.from(await mapResponse.arrayBuffer());

    // 3. Generate SVG layers
    const svgConfig = {
      centerLng: lng,
      centerLat: lat,
      zoom,
      width,
      height,
      scale: 2, 
      sizeField: 'Liczba Mieszkań',
      themeId: theme
    };

    let svgLayers = '';
    
    // Add grid only for dusk-neutral for technical look
    if (theme === 'dusk-neutral') {
      svgLayers += OverlayEngine.generateGridSvg(svgConfig);
    }

    // Add main points
    svgLayers += OverlayEngine.generateCirclesSvg(rawPoints, svgConfig);

    // Add stats card for dusk-neutral
    if (theme === 'dusk-neutral') {
      svgLayers += OverlayEngine.generateStatsCardSvg(rawPoints.length, { scale: 2 });
    }

    const svgOverlay = `<svg width="${width * 2}" height="${height * 2}" xmlns="http://www.w3.org/2000/svg">${svgLayers}</svg>`;

    // 4. Determine branding logo
    let logoFileName = 'USI-logo-V2-on-light.svg';
    if (theme === 'deep-dark' || theme === 'design-system-dark') {
      logoFileName = 'USI-logo-V2-on-dark.svg';
    } else if (theme === 'vibrant-satellite') {
      logoFileName = 'USI-logo-V2-mono.svg';
    }
    const logoPath = path.join(__dirname, '../../reference', logoFileName);

    // 5. Composite everything
    const finalBuffer = await OverlayEngine.applyOverlay(baseBuffer, svgOverlay, logoPath);

    // 6. Send image
    reply.type('image/png').send(finalBuffer);
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
