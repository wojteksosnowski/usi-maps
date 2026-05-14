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
import { OverlayEngine } from '../core/OverlayEngine.js';
import { DataProcessor } from '../core/DataProcessor.js';
import fs from 'fs';

const fastify = Fastify({ logger: true });

// Load cadastral boundaries GeoJSON
const boundariesPath = path.join(__dirname, '../../reference/boundaries.geojson');
let boundariesData: any = null;
try {
  if (fs.existsSync(boundariesPath)) {
    boundariesData = JSON.parse(fs.readFileSync(boundariesPath, 'utf8'));
    console.log(`[Init] Loaded ${boundariesData.features.length} cadastral boundaries.`);
  }
} catch (e) {
  console.error('[Init] Failed to load boundaries:', e);
}

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

/**
 * List available design themes
 */
fastify.get('/designs', async () => {
  return Object.values(THEMES);
});

/**
 * Standard Mapbox Static Map (limited by URL length)
 */
fastify.get('/static-map', async (request, reply) => {
  const query = request.query as any;
  
  const {
    lat = 52.2297,
    lng = 21.0122,
    zoom = 12,
    width = 1200,
    height = 800,
    theme = 'usi-dusk-v2',
    markers = '' // lng,lat,val;...
  } = query;

  try {
    let overlays: any[] = [];
    if (markers) {
      const points = markers.split(';').map((m: string) => {
        const [plng, plat, pval] = m.split(',').map(parseFloat);
        return { lng: plng, lat: plat, val: pval || 0 };
      });
      overlays = designEngine.generateDataDrivenMarkers(points, theme);
    }

    const options = designEngine.applyTheme({
      styleId: '',
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      zoom: parseFloat(zoom),
      width: parseInt(width),
      height: parseInt(height),
      bearing: 0,
      pitch: 0,
      overlays
    }, theme);

    const url = mapBuilder.buildUrl(options);
    return { url, theme: THEMES[theme]?.name || theme };
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

/**
 * Hybrid Map: Mapbox Static + SVG Overlays (Supports many points)
 */
fastify.get('/map', async (request, reply) => {
  const query = request.query as any;
  const theme = (query.theme as string) || 'usi-dusk-v2';
  const lat = parseFloat(query.lat) || 50.061;
  const lng = parseFloat(query.lng) || 19.934;
  const zoom = parseFloat(query.zoom) || 12;
  const width = parseInt(query.width) || 1200;
  const height = parseInt(query.height) || 800;
  const markers = query.markers || ''; // format: "lng,lat,val,ocena;..."
  const circleSize = parseFloat(query.circleSize) || 2.5;
  const lineThickness = parseFloat(query.lineThickness) || 1.0;
  const connectionMethod = query.connectionMethod || 'second';
  const topographyCategory = query.topographyCategory || '';
  const showBoundaries = query.showBoundaries === 'true';

  try {
    const startOverall = Date.now();

    // 1. Process points
    const startData = Date.now();
    const rawPoints = markers ? markers.split(';').map((m: string) => {
      const [plng, plat, pval, ocena] = m.split(',');
      return { 
        lng: parseFloat(plng), 
        lat: parseFloat(plat), 
        properties: { val: parseFloat(pval) || 0, Ocena: ocena || 'Standard' } 
      };
    }) : [];
    console.log(`[Perf] Data processing: ${Date.now() - startData}ms`);

    // 2. Get base Mapbox URL
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

    // 3. Fetch base map
    const startMapbox = Date.now();
    const mapResponse = await fetch(mapUrl);
    if (!mapResponse.ok) throw new Error(`Mapbox failed: ${mapResponse.statusText}`);
    const baseBuffer = Buffer.from(await mapResponse.arrayBuffer());
    console.log(`[Perf] Mapbox fetch: ${Date.now() - startMapbox}ms`);

    // 4. Generate SVG layers
    const startSvg = Date.now();
    const svgConfig = {
      centerLng: lng,
      centerLat: lat,
      zoom,
      width,
      height,
      scale: 2, 
      themeId: theme,
      circleSize,
      lineThickness,
      connectionMethod,
      category: topographyCategory
    };

    let svgLayers = '';
    const isDarkTheme = theme.includes('dusk') || theme.includes('deep-dark') || theme.includes('ember') || theme.includes('forest');

    if (isDarkTheme) {
      svgLayers += OverlayEngine.generateGridSvg(svgConfig);
    }

    if (showBoundaries && boundariesData) {
      svgLayers += OverlayEngine.generateBoundariesSvg(boundariesData, svgConfig);
    }

    if (topographyCategory) {
      svgLayers += OverlayEngine.generateTopographySvg(rawPoints, svgConfig);
    }

    if (connectionMethod !== 'none') {
      svgLayers += OverlayEngine.generateConnectionsSvg(rawPoints, svgConfig);
    }
    svgLayers += OverlayEngine.generateCirclesSvg(rawPoints, svgConfig);

    const svgOverlay = `<svg width="${width * 2}" height="${height * 2}" xmlns="http://www.w3.org/2000/svg">${svgLayers}</svg>`;
    console.log(`[Perf] SVG generation: ${Date.now() - startSvg}ms`);

    // 5. Composite
    const startComposite = Date.now();
    const finalBuffer = await OverlayEngine.applyOverlay(baseBuffer, svgOverlay);
    console.log(`[Perf] Sharp composition & brightness analysis: ${Date.now() - startComposite}ms`);

    console.log(`[Perf] TOTAL REQUEST TIME: ${Date.now() - startOverall}ms`);
    reply.type('image/png').send(finalBuffer);
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

/**
 * Demo endpoint using local krakow.csv
 */
fastify.get('/map/demo', async (request, reply) => {
  const query = request.query as any;
  const theme = (query.theme as string) || 'usi-dusk-v2';
  const circleSize = parseFloat(query.circleSize) || 2.5;
  const lineThickness = parseFloat(query.lineThickness) || 1.0;
  const connectionMethod = query.connectionMethod || 'second';
  const topographyCategory = query.topographyCategory || '';
  const showBoundaries = query.showBoundaries === 'true';
  const csvPath = path.join(__dirname, '../../reference/krakow.csv');

  try {
    const startOverall = Date.now();
    const startData = Date.now();
    const rawPoints = DataProcessor.parsePoints(csvPath);
    const bounds = DataProcessor.getBounds(rawPoints);
    console.log(`[Perf] CSV data processing: ${Date.now() - startData}ms`);

    if (!bounds) throw new Error('No valid points found in CSV');

    const lat = parseFloat(query.lat) || (bounds.minLat + bounds.maxLat) / 2;
    const lng = parseFloat(query.lng) || (bounds.minLng + bounds.maxLng) / 2;
    const zoom = parseFloat(query.zoom) || 12;

    const options = designEngine.applyTheme({
      styleId: '',
      latitude: lat,
      longitude: lng,
      zoom,
      width: 1200,
      height: 800,
      bearing: 0,
      pitch: 0,
      overlays: []
    }, theme);

    const mapUrl = mapBuilder.buildUrl(options);
    const startMapbox = Date.now();
    const mapResponse = await fetch(mapUrl);
    if (!mapResponse.ok) throw new Error(`Mapbox failed: ${mapResponse.statusText}`);
    const baseBuffer = Buffer.from(await mapResponse.arrayBuffer());
    console.log(`[Perf] Mapbox fetch: ${Date.now() - startMapbox}ms`);

    const startSvg = Date.now();
    const svgConfig = {
      centerLng: lng,
      centerLat: lat,
      zoom,
      width: 1200,
      height: 800,
      scale: 2, 
      sizeField: 'Liczba Mieszkań',
      themeId: theme,
      circleSize,
      lineThickness,
      connectionMethod,
      category: topographyCategory
    };

    let svgLayers = '';
    const isDarkTheme = theme.includes('dusk') || theme.includes('deep-dark') || theme.includes('ember') || theme.includes('forest');

    if (isDarkTheme) {
      svgLayers += OverlayEngine.generateGridSvg(svgConfig);
    }

    if (showBoundaries && boundariesData) {
      svgLayers += OverlayEngine.generateBoundariesSvg(boundariesData, svgConfig);
    }

    if (topographyCategory) {
      svgLayers += OverlayEngine.generateTopographySvg(rawPoints, svgConfig);
    }

    if (connectionMethod !== 'none') {
      svgLayers += OverlayEngine.generateConnectionsSvg(rawPoints, svgConfig);
    }
    svgLayers += OverlayEngine.generateCirclesSvg(rawPoints, svgConfig);
    
    const svgOverlay = `<svg width="2400" height="1600" xmlns="http://www.w3.org/2000/svg">${svgLayers}</svg>`;
    console.log(`[Perf] SVG generation: ${Date.now() - startSvg}ms`);

    // Composite with automatic logo selection
    const startComposite = Date.now();
    const finalBuffer = await OverlayEngine.applyOverlay(baseBuffer, svgOverlay);
    console.log(`[Perf] Sharp composition & brightness analysis: ${Date.now() - startComposite}ms`);

    console.log(`[Perf] TOTAL REQUEST TIME: ${Date.now() - startOverall}ms`);
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
