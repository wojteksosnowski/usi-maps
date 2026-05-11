import sharp from 'sharp';
import { GeoPoint } from './CsvProcessor.js';

export class OverlayEngine {
  /**
   * Converts LngLat to pixel coordinates relative to the map center
   */
  static project(lng: number, lat: number, config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number }): { x: number, y: number } {
    const worldSize = 512 * Math.pow(2, config.zoom);
    
    const x = (lng + 180) * (worldSize / 360);
    const center_x = (config.centerLng + 180) * (worldSize / 360);
    
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * worldSize;
    
    const centerLatRad = config.centerLat * Math.PI / 180;
    const center_y = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2 * worldSize;

    return {
      x: ((config.width / 2) + (x - center_x)) * config.scale,
      y: ((config.height / 2) + (y - center_y)) * config.scale
    };
  }

  /**
   * Generates an SVG overlay with circles
   */
  static generateCirclesSvg(points: GeoPoint[], config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number, sizeField?: string, themeId?: string }): string {
    const svgWidth = config.width * config.scale;
    const svgHeight = config.height * config.scale;
    let svgContent = '';
    
    for (const p of points) {
      const pos = this.project(p.lng, p.lat, config);
      
      // Skip points outside viewport
      if (pos.x < 0 || pos.x > svgWidth || pos.y < 0 || pos.y > svgHeight) continue;

      // Calculate radius
      let radius = 5 * config.scale;
      if (config.sizeField && p.properties && p.properties[config.sizeField]) {
        const rawVal = p.properties[config.sizeField];
        radius = (Math.sqrt(Number(rawVal)) * 0.5 * config.scale) || (5 * config.scale);
      }

      // Determine palette
      let color = '#E5145B'; // Default Magenta
      if (config.themeId === 'dusk-neutral') {
        // Neutral palette: Ink (#1B1C1E) for preliminary, Mist (#D8D9DC) for others
        color = p.properties?.['Ocena'] === 'Wstępna' ? '#1B1C1E' : '#D8D9DC';
      } else {
        color = p.properties?.['Ocena'] === 'Wstępna' ? '#E5145B' : '#5BB733';
      }
      
      svgContent += `<circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" fill-opacity="0.8" stroke="white" stroke-width="${1 * config.scale}" />`;
    }
    
    return svgContent;
  }

  /**
   * Generates a technical coordinate grid
   */
  static generateGridSvg(config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number }): string {
    const svgWidth = config.width * config.scale;
    const svgHeight = config.height * config.scale;
    let grid = `<g id="grid" stroke="#6E6F72" stroke-width="0.5" stroke-dasharray="4 4" opacity="0.3">`;
    
    // Simple grid lines based on pixels for visual structure
    const step = 100 * config.scale;
    for (let x = 0; x <= svgWidth; x += step) {
      grid += `<line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}" />`;
    }
    for (let y = 0; y <= svgHeight; y += step) {
      grid += `<line x1="0" y1="${y}" x2="${svgWidth}" y2="${y}" />`;
    }
    
    grid += `</g>`;
    return grid;
  }

  /**
   * Generates a minimalist dashboard card
   */
  static generateStatsCardSvg(pointCount: number, config: { scale: number }): string {
    const padding = 20 * config.scale;
    const cardWidth = 180 * config.scale;
    const cardHeight = 60 * config.scale;
    
    return `
      <g id="stats-card" transform="translate(${padding}, ${padding})">
        <rect width="${cardWidth}" height="${cardHeight}" rx="${8 * config.scale}" fill="#1B1C1E" fill-opacity="0.8" />
        <text x="${15 * config.scale}" y="${25 * config.scale}" fill="#F7F7F5" font-family="Arial, sans-serif" font-size="${12 * config.scale}" font-weight="bold">USI MAPS | INVESTMENTS</text>
        <text x="${15 * config.scale}" y="${45 * config.scale}" fill="#D8D9DC" font-family="Arial, sans-serif" font-size="${10 * config.scale}">Total: ${pointCount} projects</text>
      </g>`;
  }

  /**
   * Composites Mapbox image with SVG overlay and optional logo
   */
  static async applyOverlay(baseImageBuffer: Buffer, svgOverlay: string, logoPath?: string): Promise<Buffer> {
    const compositions: any[] = [
      { input: Buffer.from(svgOverlay), top: 0, left: 0 }
    ];

    if (logoPath) {
      // Resize logo to 180px width
      const logoBuffer = await sharp(logoPath)
        .resize({ width: 180 })
        .toBuffer();
      
      const metadata = await sharp(baseImageBuffer).metadata();
      const logoMetadata = await sharp(logoBuffer).metadata();
      
      if (metadata.width && metadata.height && logoMetadata.width && logoMetadata.height) {
        compositions.push({
          input: logoBuffer,
          top: metadata.height - logoMetadata.height - 25, // 25px margin from bottom
          left: 25 // 25px margin from left
        });
      }
    }

    return sharp(baseImageBuffer)
      .composite(compositions)
      .png()
      .toBuffer();
  }
}
