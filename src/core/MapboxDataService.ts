import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export class MapboxDataService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Uploads GeoJSON features to a Mapbox Dataset
   * Note: This uses PUT for each feature as required by Mapbox Datasets API for updates
   */
  async uploadToDataset(datasetId: string, geoJson: any): Promise<void> {
    console.log(`Uploading ${geoJson.features.length} features to dataset ${datasetId}...`);

    for (const feature of geoJson.features) {
      // Create a unique ID for each feature based on index or properties
      const featureId = feature.properties.Inwestycja?.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).substring(7);
      
      const url = `https://api.mapbox.com/datasets/v1/wsos/${datasetId}/features/${featureId}?access_token=${this.accessToken}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature)
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`Failed to upload feature ${featureId}:`, err);
      }
    }
    
    console.log('Upload completed.');
  }

  /**
   * Creates a new empty dataset
   */
  async createDataset(name: string, description: string): Promise<string> {
    const url = `https://api.mapbox.com/datasets/v1/wsos?access_token=${this.accessToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create dataset: ${err}`);
    }

    const data = await response.json();
    return data.id;
  }
}
