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
  }
};
