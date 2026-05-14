export interface Theme {
  id: string;
  name: string;
  mapboxStyle: string; // Mapbox Style ID or URI
  description: string;
  defaultMarkers?: {
    color: string;
    size: 'small' | 'large';
    symbol?: string;
  };
}

export const THEMES: Record<string, Theme> = {
  'usi-sunrise': {
    id: 'usi-sunrise',
    name: 'USI Sunrise',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5al9000301r4aklugzqu',
    description: 'Design System: Magenta → Orange',
    defaultMarkers: { color: '#F39200', size: 'large' }
  },
  'usi-meadow': {
    id: 'usi-meadow',
    name: 'USI Meadow',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5asy000801r0hur2g7ef',
    description: 'Design System: Green → Blue',
    defaultMarkers: { color: '#2E86C8', size: 'large' }
  },
  'usi-dusk-ds': {
    id: 'usi-dusk-ds',
    name: 'USI Dusk (System)',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5azb000201pk0r92cp30',
    description: 'Design System: Blue → Magenta',
    defaultMarkers: { color: '#E5145B', size: 'large' }
  },
  'usi-ember': {
    id: 'usi-ember',
    name: 'USI Ember',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5b5a001t01sh568se69v',
    description: 'Design System: Orange → Magenta',
    defaultMarkers: { color: '#E5145B', size: 'large' }
  },
  'usi-forest': {
    id: 'usi-forest',
    name: 'USI Forest',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5bjk001u01sh2dp42eln',
    description: 'Design System: Orange → Green',
    defaultMarkers: { color: '#5BB733', size: 'large' }
  },
  'usi-ocean': {
    id: 'usi-ocean',
    name: 'USI Ocean',
    mapboxStyle: 'mapbox://styles/wsos/cmp3t5bwq000a01qzg9za40x6',
    description: 'Design System: Blue → Green',
    defaultMarkers: { color: '#5BB733', size: 'large' }
  },
  'usi-dusk-v2': {
    id: 'usi-dusk-v2',
    name: 'USI Atmospheric Dusk V2 (Original)',
    mapboxStyle: 'mapbox://styles/wsos/cmp1qfjr2000w01s64fa7cjro',
    description: 'Original premium dark theme.',
    defaultMarkers: { color: '#1B1C1E', size: 'large' }
  },
  'usi-light': {
    id: 'usi-light',
    name: 'USI Light',
    mapboxStyle: 'mapbox://styles/wsos/cmp2bn2iz001c01s685ctejb7',
    description: 'Clean and professional USI light theme.',
    defaultMarkers: { color: '#E5145B', size: 'large' }
  }
};
