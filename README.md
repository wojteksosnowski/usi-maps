# usi-maps

A premium CLI and API for generating beautifully styled Mapbox Static Maps.

## Features

- **Premium Design Engine**: Curated themes and styling logic for high-quality maps.
- **REST API**: Fastify-powered server for programmatic map generation.
- **CLI Tool**: Manage designs and start the server with ease.
- **Static Map Optimization**: Built-in support for premium markers and optimal zoom-level styling.

## Installation

```bash
git clone https://github.com/your-username/usi-maps.git
cd usi-maps
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
MAPBOX_ACCESS_TOKEN=your_token
PORT=3000
```

## Usage

### CLI

List available designs:
```bash
npm run cli -- design:list
```

Start the API server:
```bash
npm run cli -- server:start
```

### API

**GET /static-map**

Generates a Mapbox Static Map URL.

Parameters:
- `lat`: Latitude (default: 52.2297)
- `lng`: Longitude (default: 21.0122)
- `zoom`: Zoom level (default: 12)
- `width`: Image width (default: 600)
- `height`: Image height (default: 400)
- `theme`: Theme ID (`standard-light`, `deep-dark`, `vibrant-satellite`, `minimal-mono`)
- `markers`: Semicolon-separated coordinates `lng,lat;lng,lat`

Example:
`http://localhost:3000/static-map?lat=52.2297&lng=21.0122&theme=deep-dark&markers=21.0122,52.2297`

## Premium Themes

- **Deep Dark**: High-tech, neon accents on dark backgrounds.
- **Vibrant Satellite**: Crisp satellite imagery with clear roads.
- **Minimal Mono**: Professional grayscale styling.
- **Standard Light**: The classic Mapbox experience, enhanced.

## License

ISC
