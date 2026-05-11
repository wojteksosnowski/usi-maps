# Lista Elementów Stylizowalnych Mapbox (Streets v8)

Poniżej znajduje się lista warstw wektorowych, które możemy kontrolować za pomocą Styles API. Każdy element jest przypisany do typu geometrycznego (Fill/Line).

## 1. Elementy Powierzchniowe (Fill / Polygon)
Te elementy służą do wypełniania obszarów kolorami lub teksturami.

| Warstwa (Source Layer) | Przykładowe Obiekty | Opis |
| :--- | :--- | :--- |
| `landuse` | Parki, ogrody, szpitale, szkoły | Obszary zagospodarowania terenu. |
| `natural` | Lasy, lodowce, bagna, plaże | Naturalne formacje terenu. |
| `water` | Oceany, jeziora, baseny, szerokie rzeki | Zbiorniki wodne. |
| `building` | Budynki mieszkalne, biurowce, zabytki | Obrysy budynków (można też robić extrude 3D). |
| `aeroway` | Lotniska, pasy startowe (pola) | Infrastruktura lotnicza. |
| `structure` | Tunele, mosty (jako obszary) | Stałe konstrukcje inżynieryjne. |
| `landuse_overlay` | Mokradła, lód, formacje skalne | Warstwy nakładane na landuse. |

## 2. Elementy Liniowe (Line)
Te elementy służą do rysowania ścieżek, dróg i granic.

| Warstwa (Source Layer) | Przykładowe Obiekty | Opis |
| :--- | :--- | :--- |
| `road` | Autostrady, ulice, ścieżki rowerowe | Kompletna sieć drogowa. |
| `waterway` | Rzeki, potoki, kanały | Liniowe cieki wodne (węższe niż warstwa water). |
| `admin` | Granice państw, województw, powiatów | Linie podziału administracyjnego. |
| `boundary` | Parki narodowe, rezerwaty, strefy | Inne rodzaje granic. |
| `transit_stop` | Linie metra, tramwajowe, kolejowe | Transport publiczny i tory. |
| `barrier_line` | Płoty, mury, barierki | Fizyczne bariery liniowe. |
| `building (outline)` | Obrysy/krawędzie budynków | Można stylować krawędzie niezależnie od wypełnienia. |

## 3. Elementy Specjalne
| Warstwa | Typ | Opis |
| :--- | :--- | :--- |
| `hillshade` | Raster-DEM | Rzeźba terenu 3D (wymaga osobnego źródła terrain). |
| `poi_label` | Symbol | Etykiety punktów zainteresowania (obecnie wyłączone). |
| `place_label` | Symbol | Nazwy miast, dzielnic, ulic (obecnie wyłączone). |

---
## 4. Zaawansowane Źródła Danych (Opcjonalne)
Poza standardową mapą ulic, Mapbox oferuje specjalistyczne zestawy danych:

| Kategoria | Warstwa | Typ | Opis |
| :--- | :--- | :--- | :--- |
| **Teren** | `contour` | Line | Izolinie pokazujące wysokość terenu. |
| **Ruch** | `traffic` | Line | Natężenie ruchu (wymaga Mapbox Traffic Tiles). |
| **Budynki** | `3D Extrusion` | 3D | Dynamiczne wysokości budynków i cienie. |
| **Granice** | `postal_code` | Fill/Line | Bardzo precyzyjne granice kodów pocztowych. |
| **USI Data** | `Custom Tileset` | Dowolny | Twoje własne dane (np. inwestycje) wgrane do Mapbox. |

## 5. Podsumowanie typów stylizacji
Niezależnie od warstwy, Mapbox pozwala na:
*   **Dla Fill**: `fill-color`, `fill-opacity`, `fill-pattern`.
*   **Dla Line**: `line-color`, `line-width`, `line-blur` (efekt neonu), `line-dasharray`.
*   **Dla 3D**: `fill-extrusion-height`, `fill-extrusion-base`.

## 6. Zasady Grubości Linii (line-width)
Grubość linii w Mapbox mierzona jest w pikselach. Aby mapa wyglądała profesjonalnie, stosujemy **interpolację (skalowanie)** zależną od poziomu zoomu.

### Dynamiczne Skalowanie (Interpolacja)
Zamiast stałej wartości, definiujemy punkty kontrolne:
*   **Przykład dla dróg lokalnych**: `[zoom: 12, width: 0.5px]` → `[zoom: 18, width: 10px]`
*   Dzięki temu drogi "puchną" w miarę przybliżania, nie zasłaniając mapy przy oddaleniu.

### Hierarchia Grubości (Standard USI)
| Klasa Drogi | Zoom 12 (Oddalenie) | Zoom 16 (Zbliżenie) | Efekt Wizualny |
| :--- | :--- | :--- | :--- |
| `motorway` | 2.0 px | 8.0 px | Dominujące arterie. |
| `primary` | 1.5 px | 6.0 px | Główne drogi łączące. |
| `secondary` | 1.0 px | 4.0 px | Drogi powiatowe. |
| `residential` | 0.5 px | 2.5 px | Wąskie ulice osiedlowe. |
| `waterway` | 0.8 px | 3.0 px | Naturalny bieg rzek. |
| `admin` | 0.4 px | 1.0 px | Subtelne linie podziału. |

### Casing (Obramowanie Linii)
Aby uzyskać efekt "wyraźnej drogi" lub "neonu", stosujemy dwie warstwy:
1.  **Casing**: Warstwa spodnia, szersza (np. +2px), nadająca kolor krawędzi lub poświatę (`line-blur`).
2.  **Stroke**: Warstwa wierzchnia, węższa, nadająca właściwy kolor jezdni.
