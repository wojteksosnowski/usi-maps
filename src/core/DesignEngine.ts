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
   * Generates a "Glassmorphism" effect by adding semi-transparent polygon overlays 
   * or specific marker styles. (Simulated for Static Maps)
   */
  generatePremiumMarkers(coordinates: [number, number][], themeId: string): any[] {
    const theme = THEMES[themeId] || THEMES['standard-light'];
    
    return coordinates.map(([lng, lat]) => ({
      marker: {
        coordinates: [lng, lat],
        ...theme.defaultMarkers
      }
    }));
  }
}
