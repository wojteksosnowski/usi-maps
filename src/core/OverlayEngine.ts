import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeoPoint } from './DataProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
   * Interpolates between multiple color stops
   */
  static interpolateColor(colors: string[], factor: number): string {
    const f = Math.max(0, Math.min(1, factor));
    if (f === 0) return colors[0];
    if (f === 1) return colors[colors.length - 1];

    const segmentCount = colors.length - 1;
    const scaledFactor = f * segmentCount;
    const index = Math.floor(scaledFactor);
    const segmentFactor = scaledFactor - index;

    const color1 = colors[index];
    const color2 = colors[index + 1];

    const hex = (x: number) => x.toString(16).padStart(2, '0');
    const parse = (c: string) => ({
      r: parseInt(c.substring(1, 3), 16),
      g: parseInt(c.substring(3, 5), 16),
      b: parseInt(c.substring(5, 7), 16)
    });

    const c1 = parse(color1);
    const c2 = parse(color2);

    const r = Math.round(c1.r + segmentFactor * (c2.r - c1.r));
    const g = Math.round(c1.g + segmentFactor * (c2.g - c1.g));
    const b = Math.round(c1.b + segmentFactor * (c2.b - c1.b));

    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  /**
   * Helper to get color for a specific point based on theme.
   * On colored/dark backgrounds points are always white.
   */
  static getPointColor(p: GeoPoint, config: { themeId?: string }): string {
    const theme = config.themeId || '';
    const isLight = theme.includes('light');

    if (!isLight) {
      return '#FFFFFF';
    }

    // For light themes, we use the brand palette based on data
    const brandPalette = ['#E5145B', '#F39200', '#5BB733', '#2E86C8'];
    const ocenaLog = parseFloat(p.properties?.['ocenaLOG']) || 0;
    const factor = Math.max(0, Math.min(1, ocenaLog / 4));
    return this.interpolateColor(brandPalette, factor);
  }

  /**
   * Generates connections between points based on category values
   */
  static generateConnectionsSvg(points: GeoPoint[], config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number, themeId?: string, lineThickness?: number, connectionMethod?: 'first' | 'second' }): string {
    const start = Date.now();
    const categories = ['Balkony', 'Fasady', 'Mieszkania', 'Teren', 'Udogodnienia', 'Wnętrza'];
    const LINE_THICKNESS = (config.lineThickness || 1) * config.scale; 
    const method = config.connectionMethod || 'second';
    let svgContent = '';
    let gradients = '';
    let lineId = 0;
    let connectionsCount = 0;

    const dist = (p1: GeoPoint, p2: GeoPoint) => {
      return Math.sqrt(Math.pow(p1.lng - p2.lng, 2) + Math.pow(p1.lat - p2.lat, 2));
    };

    for (const cat of categories) {
      const groups: Record<string, GeoPoint[]> = {};
      for (const p of points) {
        const val = p.properties?.[cat];
        if (val === undefined || val === null || val === '') continue;
        const sVal = String(val);
        if (!groups[sVal]) groups[sVal] = [];
        groups[sVal].push(p);
      }

      for (const val in groups) {
        const groupPoints = groups[val];
        if (groupPoints.length < 3) continue;

        for (const p of groupPoints) {
          const others = groupPoints.filter(o => o !== p)
            .map(o => ({ point: o, d: dist(p, o) }))
            .sort((a, b) => a.d - b.d);
          
          if (others.length < 2) continue;

          // Connection Method: 'first' (closest) vs 'second' (web effect)
          const targetIndex = method === 'first' ? 0 : 1;
          const target = others[targetIndex].point; 
          const pos1 = this.project(p.lng, p.lat, config);
          const pos2 = this.project(target.lng, target.lat, config);

          const colorStart = this.getPointColor(p, config);
          const colorEnd = this.getPointColor(target, config);

          const gradId = `lgrad-${lineId++}`;
          gradients += `
            <linearGradient id="${gradId}" x1="${pos1.x}" y1="${pos1.y}" x2="${pos2.x}" y2="${pos2.y}" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${colorStart}" />
              <stop offset="100%" stop-color="${colorEnd}" />
            </linearGradient>`;
          
          svgContent += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${pos2.x}" y2="${pos2.y}" stroke="url(#${gradId})" stroke-width="${LINE_THICKNESS}" opacity="0.3" />`;
          connectionsCount++;
        }
      }
    }

    console.log(`[Perf] generateConnectionsSvg: ${Date.now() - start}ms (Found ${connectionsCount} connections across ${categories.length} categories, method: ${method})`);
    return `<defs>${gradients}</defs>${svgContent}`;
  }

  /**
   * Generates an SVG overlay with circles
   */
  static generateCirclesSvg(points: GeoPoint[], config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number, sizeField?: string, themeId?: string, circleSize?: number }): string {
    const start = Date.now();
    const svgWidth = config.width * config.scale;
    const svgHeight = config.height * config.scale;
    let svgContent = '';
    let count = 0;

    const baseRadius = (config.circleSize || 2.5) * config.scale;

    for (const p of points) {
      const pos = this.project(p.lng, p.lat, config);
      
      // Skip points outside viewport
      if (pos.x < 0 || pos.x > svgWidth || pos.y < 0 || pos.y > svgHeight) continue;

      // Calculate radius: sqrt(val) * factor
      let radius = baseRadius;
      if (config.sizeField && p.properties && p.properties[config.sizeField]) {
        let rawVal = p.properties[config.sizeField];
        if (typeof rawVal === 'string') rawVal = parseFloat(rawVal.replace(/,/g, ''));
        radius = (Math.sqrt(Number(rawVal)) * (baseRadius / 10) * config.scale) || baseRadius;
      }

      const color = this.getPointColor(p, config);
      svgContent += `<circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" fill-opacity="0.7" />`;
      count++;
    }
    
    console.log(`[Perf] generateCirclesSvg: ${Date.now() - start}ms (Rendered ${count} circles)`);
    return svgContent;
  }

  /**
   * Generates a topography-like isoline overlay based on property ratings.
   */
  static generateTopographySvg(points: GeoPoint[], config: { 
    centerLng: number, 
    centerLat: number, 
    zoom: number, 
    width: number, 
    height: number, 
    scale: number, 
    category?: string, 
    lineThickness?: number 
  }): string {
    const start = Date.now();
    const cat = config.category || 'ocenaLOG';
    const weightField = 'Liczba Mieszkań';
    
    // 1. Setup Grid (e.g., 80x80 for higher detail)
    const gridRes = 80;
    const grid: number[][] = Array(gridRes).fill(0).map(() => Array(gridRes).fill(0));
    
    // Bounds in pixels for projection
    const svgWidth = config.width * config.scale;
    const svgHeight = config.height * config.scale;

    // Helper to get value from point
    const getVal = (p: GeoPoint) => {
      let v = p.properties?.[cat];
      if (typeof v === 'string') v = parseFloat(v.replace(/,/g, ''));
      return Number(v) || 0;
    };
    
    const getWeight = (p: GeoPoint) => {
      let w = p.properties?.[weightField];
      if (typeof w === 'string') w = parseFloat(w.replace(/,/g, ''));
      return Math.max(1, Number(w) || 0);
    };

    // 2. Inverse Distance Weighting (IDW) to fill grid
    for (let gx = 0; gx < gridRes; gx++) {
      for (let gy = 0; gy < gridRes; gy++) {
        const px = (gx / (gridRes - 1)) * svgWidth;
        const py = (gy / (gridRes - 1)) * svgHeight;
        
        let sumWeights = 0;
        let weightedSum = 0;
        
        for (const p of points) {
          const pos = this.project(p.lng, p.lat, config);
          const d2 = Math.pow(px - pos.x, 2) + Math.pow(py - pos.y, 2);
          const influence = 1 / (d2 + 1000); // Smooth factor
          
          const val = getVal(p);
          const weight = getWeight(p);
          
          weightedSum += val * weight * influence;
          sumWeights += weight * influence;
        }
        
        grid[gx][gy] = sumWeights > 0 ? weightedSum / sumWeights : 0;
      }
    }

    // 3. Generate Isolines (Simplified Marching Squares approach)
    let svgContent = '';
    const baseThickness = (config.lineThickness || 1) * config.scale;
    
    // Define steps from 0.1 to 4.0 with 0.1 interval
    const steps = [];
    for (let i = 0.1; i <= 4; i += 0.1) steps.push(Math.round(i * 10) / 10);

    for (const threshold of steps) {
      // Determine line style based on value
      let thickness = baseThickness;
      let opacity = 0.4;
      
      const isFullValue = Math.abs(threshold - Math.round(threshold)) < 0.01;
      const is02Value = Math.abs((threshold * 10) % 2) < 0.01;

      if (isFullValue) {
        thickness = baseThickness * 2; // Full values are 2x thicker
        opacity = 0.6;
      } else if (is02Value) {
        thickness = baseThickness;    // 0.2 values are standard
        opacity = 0.4;
      } else {
        thickness = baseThickness * 0.5; // 0.1 values are thinner
        opacity = 0.2;                   // and more transparent
      }

      for (let gx = 0; gx < gridRes - 1; gx++) {
        for (let gy = 0; gy < gridRes - 1; gy++) {
          // Values at 4 corners
          const v00 = grid[gx][gy];
          const v10 = grid[gx+1][gy];
          const v01 = grid[gx][gy+1];
          const v11 = grid[gx+1][gy+1];

          const x1 = (gx / (gridRes - 1)) * svgWidth;
          const x2 = ((gx + 1) / (gridRes - 1)) * svgWidth;
          const y1 = (gy / (gridRes - 1)) * svgHeight;
          const y2 = ((gy + 1) / (gridRes - 1)) * svgHeight;

          // Simple edge interpolation
          const edges = [];
          if ((v00 >= threshold) !== (v10 >= threshold)) edges.push({ x: x1 + (x2 - x1) * (threshold - v00) / (v10 - v00), y: y1 });
          if ((v10 >= threshold) !== (v11 >= threshold)) edges.push({ x: x2, y: y1 + (y2 - y1) * (threshold - v10) / (v11 - v10) });
          if ((v11 >= threshold) !== (v01 >= threshold)) edges.push({ x: x1 + (x2 - x1) * (threshold - v01) / (v11 - v01), y: y2 });
          if ((v01 >= threshold) !== (v00 >= threshold)) edges.push({ x: x1, y: y1 + (y2 - y1) * (threshold - v00) / (v01 - v00) });

          if (edges.length >= 2) {
            svgContent += `<line x1="${edges[0].x}" y1="${edges[0].y}" x2="${edges[1].x}" y2="${edges[1].y}" stroke="white" stroke-width="${thickness}" opacity="${opacity}" />`;
          }
        }
      }
    }

    // 4. Label local maxima (peaks)
    const fontSize = 10 * config.scale;
    for (let gx = 1; gx < gridRes - 1; gx++) {
      for (let gy = 1; gy < gridRes - 1; gy++) {
        const val = grid[gx][gy];
        if (val < 1.0) continue; // Only label significant values

        // Check if local max against all 8 neighbors
        if (val > grid[gx-1][gy] && val > grid[gx+1][gy] &&
            val > grid[gx][gy-1] && val > grid[gx][gy+1] &&
            val > grid[gx-1][gy-1] && val > grid[gx+1][gy+1] &&
            val > grid[gx-1][gy+1] && val > grid[gx+1][gy-1]) {
          
          const px = (gx / (gridRes - 1)) * svgWidth;
          const py = (gy / (gridRes - 1)) * svgHeight;
          
          svgContent += `<text x="${px}" y="${py + fontSize/3}" fill="white" font-size="${fontSize}" font-family="monospace" text-anchor="middle" font-weight="bold" opacity="0.9">${val.toFixed(2)}</text>`;
        }
      }
    }

    console.log(`[Perf] generateTopographySvg: ${Date.now() - start}ms (Category: ${cat})`);
    return svgContent;
  }

  /**
   * Generates a technical coordinate grid
   */
  static generateGridSvg(config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number }): string {
    const svgWidth = config.width * config.scale;
    const svgHeight = config.height * config.scale;
    let grid = `<g id="grid" stroke="#6E6F72" stroke-width="0.5" stroke-dasharray="4 4" opacity="0.3">`;
    
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
   * Composites Mapbox image with SVG overlay and automatic logo selection
   */
  static async applyOverlay(baseImageBuffer: Buffer, svgOverlay: string): Promise<Buffer> {
    const compositions: any[] = [
      { input: Buffer.from(svgOverlay), top: 0, left: 0 }
    ];

    const metadata = await sharp(baseImageBuffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error('Could not get base image metadata');

    // 1. Analyze bottom-left 200x200 region for brightness (HSL L component)
    const regionWidth = Math.min(200, metadata.width);
    const regionHeight = Math.min(200, metadata.height);
    
    const regionBuffer = await sharp(baseImageBuffer)
      .extract({ left: 0, top: metadata.height - regionHeight, width: regionWidth, height: regionHeight })
      .raw()
      .toBuffer();

    let totalL = 0;
    const pixelCount = regionWidth * regionHeight;
    const channels = metadata.channels || 3;

    for (let i = 0; i < regionBuffer.length; i += channels) {
      const r = regionBuffer[i];
      const g = regionBuffer[i+1];
      const b = regionBuffer[i+2];
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2 / 255;
      totalL += l;
    }

    const avgL = totalL / pixelCount;
    
    // 2. Select logo based on brightness
    let logoFileName = 'USI-logo-V2-mono-white.svg'; // Default for dark
    if (avgL > 0.85) {
      logoFileName = 'USI-logo-V2-on-light.svg'; // Very bright -> Colored logo
    } else if (avgL > 0.4) {
      logoFileName = 'USI-logo-V2-mono.svg'; // Bright colored -> Mono Black logo
    }

    const logoPath = path.join(__dirname, '../../reference', logoFileName);
    console.log(`Branding Analysis: avgL=${avgL.toFixed(3)}, selected: ${logoFileName}`);

    // 3. Composite logo
    const logoBuffer = await sharp(logoPath)
      .resize({ width: 180 })
      .toBuffer();
    
    const logoMetadata = await sharp(logoBuffer).metadata();
    
    if (logoMetadata.width && logoMetadata.height) {
      compositions.push({
        input: logoBuffer,
        top: metadata.height - logoMetadata.height + 10,
        left: 0
      });
    }

    return sharp(baseImageBuffer)
      .composite(compositions)
      .png()
      .toBuffer();
  }

  /**
   * Generates SVG paths for cadastral boundaries from GeoJSON
   */
  static generateBoundariesSvg(geoJson: any, config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number }): string {
    const start = Date.now();
    let svgContent = '';

    if (!geoJson || !geoJson.features) return '';

    for (const feature of geoJson.features) {
      if (!feature.geometry) continue;

      const type = feature.geometry.type;
      const coordinates = feature.geometry.coordinates;

      if (type === 'Polygon') {
        svgContent += this.renderPolygon(coordinates, config);
      } else if (type === 'MultiPolygon') {
        for (const polygonCoords of coordinates) {
          svgContent += this.renderPolygon(polygonCoords, config);
        }
      }
    }

    console.log(`[Perf] generateBoundariesSvg: ${Date.now() - start}ms`);
    return svgContent;
  }

  private static renderPolygon(rings: number[][][], config: { centerLng: number, centerLat: number, zoom: number, width: number, height: number, scale: number }): string {
    let pathData = '';
    for (const ring of rings) {
      let ringPath = '';
      for (let i = 0; i < ring.length; i++) {
        const point = this.project(ring[i][0], ring[i][1], config);
        const command = i === 0 ? 'M' : 'L';
        ringPath += `${command}${point.x.toFixed(1)},${point.y.toFixed(1)} `;
      }
      pathData += ringPath + 'Z ';
    }
    return `<path d="${pathData}" fill="none" stroke="white" stroke-width="${0.5 * config.scale}" opacity="0.25" />`;
  }
}
