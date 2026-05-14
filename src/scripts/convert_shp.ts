import shapefile from 'shapefile';
import fs from 'fs';
import path from 'path';

const shpPath = 'reference/jednostki_administracyjne/A06_Granice_obrebow_ewidencyjnych.shp';
const dbfPath = 'reference/jednostki_administracyjne/A06_Granice_obrebow_ewidencyjnych.dbf';
const outputDir = 'reference/boundaries';

const PROVINCE_MAP: Record<string, string> = {
  '02': 'dolnoslaskie',
  '04': 'kujawsko-pomorskie',
  '06': 'lubelskie',
  '08': 'lubuskie',
  '10': 'lodzkie',
  '12': 'malopolskie',
  '14': 'mazowieckie',
  '16': 'opolskie',
  '18': 'podkarpackie',
  '20': 'podlaskie',
  '22': 'pomorskie',
  '24': 'slaskie',
  '26': 'swietokrzyskie',
  '28': 'warminsko-mazurskie',
  '30': 'wielkopolskie',
  '32': 'zachodniopomorskie'
};

async function convertAll() {
  console.log('Starting full conversion by province...');
  const provinceFeatures: Record<string, any[]> = {};
  
  // Initialize arrays for each province
  for (const code of Object.keys(PROVINCE_MAP)) {
    provinceFeatures[code] = [];
  }

  const source = await shapefile.open(shpPath, dbfPath, { encoding: 'utf-8' });
  let count = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;

    const props = result.value.properties;
    const code = props.JPT_KOD_JE || '';
    const provincePrefix = code.substring(0, 2);

    if (provinceFeatures[provincePrefix]) {
      // Round to 7 decimal places for high precision (~1cm)
      const precision = 10000000;
      
      const roundCoord = (coord: number[]) => [
        Math.round(coord[0] * precision) / precision,
        Math.round(coord[1] * precision) / precision
      ];

      if (result.value.geometry.type === 'Polygon') {
        result.value.geometry.coordinates = result.value.geometry.coordinates.map(ring => 
          ring.map(roundCoord)
        );
      } else if (result.value.geometry.type === 'MultiPolygon') {
        result.value.geometry.coordinates = result.value.geometry.coordinates.map(poly => 
          poly.map(ring => 
            ring.map(roundCoord)
          )
        );
      }

      // Keep metadata
      result.value.properties = {
        id: props.JPT_KOD_JE,
        name: props.JPT_NAZWA_,
        area: props.Shape_Area
      };

      provinceFeatures[provincePrefix].push(result.value);
    }

    count++;
    if (count % 10000 === 0) console.log(`Processed ${count} features...`);
  }

  console.log('Writing files...');
  for (const [code, name] of Object.entries(PROVINCE_MAP)) {
    const features = provinceFeatures[code];
    if (features.length > 0) {
      const geojson = {
        type: 'FeatureCollection',
        features: features
      };
      const fileName = `${code}_${name}.geojson`;
      fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(geojson));
      console.log(`- ${fileName}: ${features.length} features`);
    }
  }

  console.log('Full conversion completed.');
}

convertAll().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
