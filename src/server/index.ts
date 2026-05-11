import Fastify from 'fastify';
import dotenv from 'dotenv';
import { StaticMapBuilder } from '../core/StaticMapBuilder.js';
import { THEMES } from '../designs/themes.js';
import { DesignEngine } from '../core/DesignEngine.js';

dotenv.config();

const fastify = Fastify({ logger: true });
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
    width = 600,
    height = 400,
    theme = 'standard-light',
    bearing = 0,
    pitch = 0,
    markers = '' // Format: "lng,lat;lng,lat"
  } = query;

  try {
    let overlays: any[] = [];
    if (markers) {
      const coords = markers.split(';').map((m: string) => m.split(',').map(parseFloat));
      overlays = designEngine.generatePremiumMarkers(coords, theme);
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
