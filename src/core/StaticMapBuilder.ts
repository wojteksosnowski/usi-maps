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
    const {
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
      overlays
    });

    return request.url();
  }
}
