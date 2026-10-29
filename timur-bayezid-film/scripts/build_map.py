"""Project & simplify Natural Earth data into SVG paths for the old-map component.
Output: src/data/mapData.ts  (world canvas W x H, equirectangular scaled by cos 38°)."""
import json, math
from shapely.geometry import shape, box, Polygon, MultiPolygon, LineString, MultiLineString, mapping
from shapely.ops import unary_union

LON0, LON1, LAT0, LAT1 = 14.0, 82.0, 56.0, 20.0
S = 60.0
KX = math.cos(math.radians(38)) * S
W, H = round((LON1 - LON0) * KX), round((LAT0 - LAT1) * S)

def P(lon, lat):
    return ((lon - LON0) * KX, (LAT0 - lat) * S)

BB = box(LON0 - 1, LAT1 - 1, LON1 + 1, LAT0 + 1)

def ring_d(coords):
    pts = [P(*c[:2]) for c in coords]
    return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'

def poly_d(g, tol=0.03):
    g = g.simplify(tol, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(getattr(g, 'geoms', []))
    out = []
    for p in polys:
        if not isinstance(p, Polygon) or p.area < 0.02: continue
        out.append(ring_d(p.exterior.coords))
        out += [ring_d(i.coords) for i in p.interiors if Polygon(i).area > 0.05]
    return ''.join(out)

def line_d(g, tol=0.03):
    g = g.simplify(tol)
    lines = [g] if isinstance(g, LineString) else list(getattr(g, 'geoms', []))
    out = []
    for l in lines:
        if not isinstance(l, LineString) or len(l.coords) < 2: continue
        pts = [P(*c[:2]) for c in l.coords]
        out.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts))
    return ''.join(out)

land = unary_union([shape(f['geometry']) for f in json.load(open('.cache/ne/ne_50m_land.geojson'))['features']]).intersection(BB)
LAKES = ['Lake Urmia', 'Lake Tuz', 'Lake Van', 'Lake Sevan', 'South Aral Sea', 'North Aral Sea', 'Lake Balkhash']
lakes = unary_union([shape(f['geometry']) for f in json.load(open('.cache/ne/ne_50m_lakes.geojson'))['features']
                     if f['properties'].get('name') in LAKES]).intersection(BB)
land = land.difference(lakes)
RIV = {'Euphrates', 'Al Furat', 'Firat', 'Tigris', 'Dicle', 'Danube', 'Donau', 'Volga', 'Indus', 'Amu  Darya', 'Syr Darya', 'Nile', 'Don', 'Dnipro', 'Dnepre', 'Panj', 'Shatt al Arab', 'Ural', 'Sutlej', 'Kama', 'Jordan'}
rivers = unary_union([shape(f['geometry']) for f in json.load(open('.cache/ne/ne_50m_rivers_lake_centerlines.geojson'))['features']
                      if (f['properties'].get('name') or '') in RIV]).intersection(BB)

# Approximate realms c. 1400 (clipped to land)
OTT = Polygon([(19.4, 40.0), (19.4, 42.0), (20.8, 43.4), (22.6, 44.3), (25.5, 44.1), (28.6, 44.3), (29.5, 41.4), (31.5, 41.6),
               (35.0, 42.3), (37.2, 41.2), (38.9, 40.7), (39.6, 39.6), (38.6, 38.3), (37.5, 37.7), (36.0, 36.8), (34.4, 36.3),
               (32.3, 35.9), (30.4, 36.1), (28.4, 36.4), (26.8, 37.4), (26.0, 39.0), (26.1, 40.1), (24.0, 40.0), (22.6, 39.4), (20.6, 39.4)])
TIM = Polygon([(39.9, 41.6), (41.6, 42.6), (44.0, 43.2), (47.6, 43.6), (50.5, 42.5), (53.0, 45.5), (58.0, 46.8), (62.0, 46.4),
               (66.0, 45.8), (70.5, 43.8), (73.5, 42.0), (75.5, 39.0), (73.5, 36.0), (70.5, 33.8), (67.0, 30.0), (62.0, 26.6),
               (57.0, 25.4), (52.0, 26.8), (49.0, 29.8), (47.2, 30.4), (44.6, 31.9), (42.5, 33.6), (40.6, 35.2), (39.6, 37.0),
               (39.9, 39.0)])
CONST = Polygon([(28.4, 40.9), (28.4, 41.4), (29.3, 41.4), (29.3, 40.9)])
ott = OTT.intersection(land).difference(CONST)
tim = TIM.intersection(land)
# Interregnum split (approximate)
REG = {
    'suleyman': box(18, 38, 29.3, 46),             # Rumelia (Edirne)
    'isa': box(25.5, 35.5, 31.2, 41.0),            # around Bursa
    'mehmed': box(33.8, 39.6, 38.2, 42.5),         # Amasya / Tokat
}
split = {k: ott.intersection(v) for k, v in REG.items()}
beyliks_rest = ott.difference(unary_union(list(REG.values())))

CITIES = {
    'edirne': ('أدرنة', 26.56, 41.68), 'bursa': ('بورصة', 29.06, 40.19), 'constantinople': ('القسطنطينية', 28.98, 41.01),
    'ankara': ('أنقرة', 32.86, 39.93), 'sivas': ('سيواس', 37.02, 39.75), 'erzincan': ('أرزنجان', 39.49, 39.75),
    'kayseri': ('قيصرية', 35.48, 38.72), 'tokat': ('توقات', 36.55, 40.31), 'aksehir': ('آق شهر', 31.42, 38.36),
    'amasya': ('أماسيا', 35.83, 40.65), 'konya': ('قونية', 32.48, 37.87), 'smyrna': ('إزمير', 27.14, 38.42),
    'aleppo': ('حلب', 37.16, 36.2), 'damascus': ('دمشق', 36.29, 33.51), 'baghdad': ('بغداد', 44.36, 33.31),
    'tabriz': ('تبريز', 46.29, 38.08), 'karabakh': ('قراباغ', 46.9, 39.8), 'samarkand': ('سمرقند', 66.96, 39.65),
    'kesh': ('كش', 66.83, 39.05), 'delhi': ('دلهي', 77.2, 28.6), 'nicopolis': ('نيكوبوليس', 24.9, 43.7),
    'kosovo': ('قوصوه', 21.1, 42.65), 'herat': ('هراة', 62.2, 34.35), 'isfahan': ('أصفهان', 51.67, 32.65),
    'sarai': ('سراي', 47.0, 47.0), 'otrar': ('أترار', 68.3, 42.85), 'malatya': ('ملطية', 38.3, 38.35),
    'cairo': ('القاهرة', 31.24, 30.04), 'shiraz': ('شيراز', 52.53, 29.6), 'cubuk': ('چوبوق', 33.03, 40.24),
}
BEYLIKS = {'aydin': ('آيدين', 27.9, 38.0), 'saruhan': ('صاروخان', 27.6, 38.75), 'mentese': ('منتشا', 28.2, 37.2),
           'germiyan': ('كرميان', 29.9, 39.3), 'hamid': ('الحميد', 30.8, 37.8), 'karaman': ('قرمان', 33.2, 37.3)}
MOUNTAINS = [(lon, lat) for lon, lat in [
    (31.0, 37.3), (32.5, 37.0), (34.0, 37.2), (35.5, 37.6), (36.8, 38.0), (38.5, 38.4), (40.0, 38.6), (41.5, 38.7), (42.8, 38.9),
    (34.0, 40.8), (35.8, 40.9), (37.6, 40.6), (39.6, 40.6), (41.0, 40.7), (43.0, 42.9), (44.8, 42.7), (46.5, 42.2), (48.0, 41.6),
    (45.6, 36.0), (46.8, 34.9), (48.0, 33.8), (49.6, 32.6), (51.2, 31.4), (52.4, 36.3), (54.0, 36.6), (56.0, 37.6), (58.5, 37.6),
    (68.0, 35.4), (70.0, 35.6), (71.6, 36.4), (73.0, 38.5), (71.0, 39.6), (68.6, 39.3), (75.5, 35.2), (77.5, 34.0), (64.6, 34.6),
    (66.0, 34.2), (22.6, 42.3), (24.0, 42.0), (25.4, 42.7), (20.6, 41.6), (21.8, 40.1), (61.0, 33.0), (57.0, 30.0), (59.0, 31.4),
    (44.0, 40.4), (42.0, 39.8), (36.2, 35.6), (44.4, 37.4), (30.0, 39.9), (29.0, 39.2)]]

def pts(d):
    return {k: {'name': v[0], 'x': round(P(v[1], v[2])[0], 1), 'y': round(P(v[1], v[2])[1], 1)} for k, v in d.items()}

with open('src/data/mapData.ts', 'w', encoding='utf-8') as f:
    f.write('// Generated by scripts/build_map.py from Natural Earth 1:50m (public domain).\n')
    f.write(f'export const MAP_W = {W};\nexport const MAP_H = {H};\n')
    f.write(f'export const LON0 = {LON0}; export const LAT0 = {LAT0}; export const KX = {KX:.5f}; export const KY = {S};\n')
    f.write('export const project = (lon: number, lat: number): [number, number] => [(lon - LON0) * KX, (LAT0 - lat) * KY];\n')
    for name, g, fn in [('LAND', land, poly_d), ('LAKES', lakes, poly_d), ('RIVERS', rivers, line_d), ('OTTOMAN_1400', ott, poly_d),
                        ('TIMURID_1400', tim, poly_d), ('SPLIT_SULEYMAN', split['suleyman'], poly_d), ('SPLIT_ISA', split['isa'], poly_d),
                        ('SPLIT_MEHMED', split['mehmed'], poly_d), ('SPLIT_BEYLIKS', beyliks_rest, poly_d)]:
        f.write(f'export const {name} = {json.dumps(fn(g))};\n')
    f.write(f'export const CITIES = {json.dumps(pts(CITIES), ensure_ascii=False)} as const;\n')
    f.write(f'export const BEYLIKS = {json.dumps(pts(BEYLIKS), ensure_ascii=False)} as const;\n')
    f.write(f'export const MOUNTAINS: [number, number][] = {json.dumps([[round(c, 1) for c in P(*m)] for m in MOUNTAINS])};\n')
    f.write('export type CityKey = keyof typeof CITIES;\n')
import os
print(W, H, os.path.getsize('src/data/mapData.ts'))
