import mbxStatic from '@mapbox/mapbox-sdk/services/static.js';
import dotenv from 'dotenv';

dotenv.config();

export interface StaticMapOptions {
  ownerId?: string;
  styleId: string;
  longitude: number;
  latitude: number;
  zoom: number;
  width: number;
  height: number;
  highRes?: boolean;
  bearing?: number;
  pitch?: number;
  overlays?: any[];
}

export class StaticMapBuilder {
  private staticClient: any;

  constructor(accessToken: string) {
    this.staticClient = mbxStatic({ accessToken });
  }

  buildUrl(options: StaticMapOptions): string {
    let {
      ownerId = 'mapbox',
      styleId,
      longitude,
      latitude,
      zoom,
      width,
      height,
      highRes = true,
      bearing = 0,
      pitch = 0,
      overlays = []
    } = options;

    // Handle full Mapbox style URIs: mapbox://styles/{owner}/{style}
    if (styleId.startsWith('mapbox://styles/')) {
      const path = styleId.replace('mapbox://styles/', '');
      const parts = path.split('/');
      if (parts.length === 2) {
        ownerId = parts[0];
        styleId = parts[1];
      }
    } else if (styleId.includes('/')) {
      // Handle "owner/style" format
      const parts = styleId.split('/');
      ownerId = parts[0];
      styleId = parts[1];
    }

    const request = this.staticClient.getStaticImage({
      ownerId,
      styleId,
      width,
      height,
      position: {
        coordinates: [longitude, latitude],
        zoom,
        bearing,
        pitch
      },
      highRes,
      logo: false,
      attribution: false,
      overlays
    });

    return request.url();
  }
}
