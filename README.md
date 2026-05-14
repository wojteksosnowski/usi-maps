# usi-maps

A clean API and renderer for generating beautifully styled Mapbox maps with SVG overlays.

## Features

- **Mapbox API Integration**: Simplified handling of Mapbox Static Map API.
- **Hybrid Rendering**: Combines Mapbox base tiles with server-side SVG overlays (using `sharp`) to bypass Mapbox URL length limits and provide custom branding.
- **Premium Design Engine**: Curated themes for high-quality maps.
- **REST API**: Fastify-powered server for programmatic map generation.
- **Interactive Preview**: Built-in web preview for testing themes and markers.

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

Start the API server:
```bash
npm run dev
```

Open `http://localhost:3000/` in your browser to use the interactive preview.

### API Endpoints

#### GET /map
The primary endpoint for hybrid maps (Mapbox + SVG Overlays). Supports a high number of points.

Parameters:
- `lat`, `lng`, `zoom`: Map viewport.
- `width`, `height`: Image dimensions.
- `theme`: Theme ID (e.g., `dusk-neutral`, `deep-dark`).
- `markers`: Semicolon-separated data `lng,lat,val,ocena;...`
  - `val`: 0-100 (controls size).
  - `ocena`: 'Wstępna' or 'Standard' (controls color).

#### GET /static-map
Direct proxy to Mapbox Static API (subject to URL length limits).

#### GET /designs
Returns a list of available themes.

## License

ISC
