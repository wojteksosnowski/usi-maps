import { StaticMapOptions } from './StaticMapBuilder.js';
import { THEMES, Theme } from '../designs/themes.js';

export class DesignEngine {
  applyTheme(options: StaticMapOptions, themeId: string): StaticMapOptions {
    const theme = THEMES[themeId] || THEMES['standard-light'];
    
    return {
      ...options,
      styleId: theme.mapboxStyle,
      overlays: this.getThemeOverlays(theme, options.overlays || [])
    };
  }

  private getThemeOverlays(theme: Theme, existingOverlays: any[]): any[] {
    // If no markers are provided, we could add a default one or just return existing
    if (existingOverlays.length === 0 && theme.defaultMarkers) {
      // Logic to add a default marker if needed, but usually overlays are passed by the user
    }
    
    // Enhance markers if they are in the 'simple' format
    return existingOverlays.map(overlay => {
      if (overlay.marker) {
        return {
          ...overlay,
          marker: {
            ...theme.defaultMarkers,
            ...overlay.marker
          }
        };
      }
      return overlay;
    });
  }

  /**
   * Generates markers where color and size are determined by a numeric value (0-100 scale recommended).
   */
  generateDataDrivenMarkers(data: { lng: number, lat: number, val: number }[], themeId: string): any[] {
    const theme = THEMES[themeId] || THEMES['standard-light'];
    
    return data.map(point => {
      // Logic for color: 0 (green) -> 100 (red)
      const r = Math.floor((point.val / 100) * 255);
      const g = Math.floor(((100 - point.val) / 100) * 255);
      const color = `#${this.componentToHex(r)}${this.componentToHex(g)}00`;
      
      // Logic for size: val > 50 ? large : small
      const size = point.val > 50 ? 'large' : 'small';

      return {
        marker: {
          coordinates: [point.lng, point.lat],
          color: color,
          size: size
        }
      };
    });
  }

  private componentToHex(c: number): string {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }
}
