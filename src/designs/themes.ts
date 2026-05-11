export interface Theme {
  id: string;
  name: string;
  mapboxStyle: string; // Mapbox Style ID
  description: string;
  defaultMarkers?: {
    color: string;
    size: 'small' | 'large';
    symbol?: string;
  };
}

export const THEMES: Record<string, Theme> = {
  'standard-light': {
    id: 'standard-light',
    name: 'Standard Light',
    mapboxStyle: 'mapbox/streets-v12',
    description: 'Clean and readable light map.',
    defaultMarkers: { color: '#3bb2d0', size: 'large' }
  },
  'deep-dark': {
    id: 'deep-dark',
    name: 'Deep Dark',
    mapboxStyle: 'mapbox/dark-v11',
    description: 'Modern dark theme for night modes and high-tech looks.',
    defaultMarkers: { color: '#00ff00', size: 'large' }
  },
  'vibrant-satellite': {
    id: 'vibrant-satellite',
    name: 'Vibrant Satellite',
    mapboxStyle: 'mapbox/satellite-streets-v12',
    description: 'High-detail satellite imagery with clear street overlays.',
    defaultMarkers: { color: '#ff00ff', size: 'large' }
  },
  'minimal-mono': {
    id: 'minimal-mono',
    name: 'Minimal Mono',
    mapboxStyle: 'mapbox/light-v11',
    description: 'Minimalist grayscale map for professional reporting.',
    defaultMarkers: { color: '#000000', size: 'large' }
  },
  'design-system-light': {
    id: 'design-system-light',
    name: 'Design System Light',
    mapboxStyle: 'mapbox/light-v11',
    description: 'Clean theme based on Paper and Graphite colors. No labels optimized.',
    defaultMarkers: { color: '#E5145B', size: 'large' } // Magenta primary
  },
  'design-system-dark': {
    id: 'design-system-dark',
    name: 'Design System Dark',
    mapboxStyle: 'mapbox/dark-v11',
    description: 'Professional dark theme using Ink and Slate colors.',
    defaultMarkers: { color: '#2E86C8', size: 'large' } // Blue primary
  },
  'dusk-neutral': {
    id: 'dusk-neutral',
    name: 'Dusk Neutral',
    mapboxStyle: 'wsos/cmp1a9imt004q01s77wg97clu',
    description: 'Comprehensive Dusk palette (Full Layer Coverage) on map. Neutral markers on top.',
    defaultMarkers: { color: '#1B1C1E', size: 'large' }
  }
};
