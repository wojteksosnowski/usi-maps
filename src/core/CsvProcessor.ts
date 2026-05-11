import fs from 'fs';
import path from 'path';

export interface GeoPoint {
  lat: number;
  lng: number;
  val?: number;
  properties?: Record<string, any>;
}

export class CsvProcessor {
  /**
   * Reads CSV and returns raw geo points
   */
  static parsePoints(filePath: string): GeoPoint[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const header = this.parseCsvLine(lines[0]);
    
    const latIdx = header.findIndex(h => h.trim().toLowerCase() === 'latitude');
    const lngIdx = header.findIndex(h => h.trim().toLowerCase() === 'longitude');

    if (latIdx === -1 || lngIdx === -1) {
      throw new Error('CSV must contain Latitude and Longitude columns');
    }

    const points: GeoPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (cols.length <= Math.max(latIdx, lngIdx)) continue;
      
      const lat = parseFloat(cols[latIdx]);
      const lng = parseFloat(cols[lngIdx]);
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const properties: Record<string, any> = {};
        header.forEach((h, idx) => {
          const val = cols[idx]?.trim();
          // Try to parse as number, removing quotes and commas for thousands
          if (val) {
            const cleanVal = val.replace(/"/g, '').replace(/,/g, '');
            const num = parseFloat(cleanVal);
            properties[h.trim()] = isNaN(num) ? val : num;
          }
        });
        points.push({ lat, lng, properties });
      }
    }
    return points;
  }

  /**
   * Converts array of points to GeoJSON FeatureCollection
   */
  static toGeoJson(points: GeoPoint[]): any {
    return {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        },
        properties: p.properties
      }))
    };
  }

  /**
   * Robust CSV line parser that respects quotes
   */
  private static parseCsvLine(line: string): string[] {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  }

  /**
   * Clusters points into a grid to stay under URL length limits
   * @param points Array of raw points
   * @param gridSize Size of grid cell in degrees (e.g. 0.005 for ~500m)
   */
  static clusterPoints(points: GeoPoint[], gridSize: number = 0.005): GeoPoint[] {
    const grid: Record<string, { latSum: number, lngSum: number, count: number }> = {};

    points.forEach(p => {
      const x = Math.floor(p.lng / gridSize);
      const y = Math.floor(p.lat / gridSize);
      const key = `${x},${y}`;

      if (!grid[key]) {
        grid[key] = { latSum: 0, lngSum: 0, count: 0 };
      }
      grid[key].latSum += p.lat;
      grid[key].lngSum += p.lng;
      grid[key].count += 1;
    });

    return Object.values(grid).map(cell => ({
      lat: cell.latSum / cell.count,
      lng: cell.lngSum / cell.count,
      val: Math.min(100, cell.count * 10) // Scale count to 0-100 for our engine
    }));
  }

  /**
   * Calculates Bounding Box
   */
  static getBounds(points: GeoPoint[]) {
    if (points.length === 0) return null;
    let minLat = points[0].lat, maxLat = points[0].lat;
    let minLng = points[0].lng, maxLng = points[0].lng;

    points.forEach(p => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    });

    return { minLat, maxLat, minLng, maxLng };
  }
}
