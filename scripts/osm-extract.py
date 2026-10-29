# OpenStreetMap 원자료(data/raw/osm/*.osm, 저장소 제외)에서 화면 지도에 필요한 것만 골라 작게 만든다
#   python3 -I scripts/osm-extract.py  → data/geo/osm_basemap.json
# 데이터 출처: © OpenStreetMap contributors (ODbL) — 화면에 표시
import xml.etree.ElementTree as ET, glob, json, math, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S, W, N, E = 36.700, 127.025, 36.842, 127.124
nodes, ways, pois = {}, {}, {}
for f in sorted(glob.glob(os.path.join(ROOT, 'data/raw/osm/t_*.osm'))):
    for ev, el in ET.iterparse(f, events=('end',)):
        if el.tag == 'node':
            nid = el.get('id'); nodes[nid] = (float(el.get('lat')), float(el.get('lon')))
            tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
            if 'name' in tags and (tags.get('railway') in ('station', 'halt') or tags.get('public_transport') == 'station' or tags.get('amenity') in ('school', 'kindergarten', 'townhall', 'library', 'hospital') or tags.get('place') in ('neighbourhood', 'quarter', 'village', 'suburb')):
                pois[nid] = {'lat': nodes[nid][0], 'lng': nodes[nid][1], 'name': tags['name'], 'kind': tags.get('railway') or tags.get('amenity') or tags.get('place')}
            el.clear()
        elif el.tag == 'way':
            wid = el.get('id')
            if wid not in ways:
                tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
                ways[wid] = ([nd.get('ref') for nd in el.findall('nd')], tags)
            el.clear()
        elif el.tag == 'relation':
            el.clear()

ROAD = {'motorway': 1, 'trunk': 1, 'primary': 2, 'secondary': 2, 'tertiary': 3, 'motorway_link': 3, 'trunk_link': 3, 'primary_link': 3, 'secondary_link': 3, 'unclassified': 4, 'residential': 4, 'living_street': 4}
def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[1] - a[1], b[0] - a[0]
    L = math.hypot(dx, dy) or 1e-12
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dy * (p[1] - a[1]) - dx * (p[0] - a[0])) / L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]
def inbox(p): return S - 0.01 <= p[0] <= N + 0.01 and W - 0.01 <= p[1] <= E + 0.01
def enc(pts):
    # 1e-5도(약 1m) 정수, 첫 점 절대값 + 이후 차이
    q = [(round(p[0] * 1e5), round(p[1] * 1e5)) for p in pts]
    out = [q[0][0], q[0][1]]
    for i in range(1, len(q)): out += [q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]]
    return out
roads, rails, waters, areas, labels = [], [], [], [], []
for wid, (refs, t) in ways.items():
    pts = [nodes[r] for r in refs if r in nodes]
    if len(pts) < 2 or not any(inbox(p) for p in pts): continue
    hw = t.get('highway')
    if hw in ROAD:
        roads.append({'c': ROAD[hw], 'n': t.get('name'), 'p': enc(rdp(pts, 0.00003 if ROAD[hw] > 2 else 0.00002))})
    elif t.get('railway') in ('rail', 'subway', 'light_rail') and t.get('service') is None:
        rails.append({'p': enc(rdp(pts, 0.00003))})
    elif t.get('waterway') in ('river', 'stream', 'canal'):
        waters.append({'t': 'l', 'w': 2 if t['waterway'] == 'river' else 1, 'n': t.get('name'), 'p': enc(rdp(pts, 0.00004))})
    elif t.get('natural') == 'water' or t.get('landuse') == 'reservoir' or t.get('water'):
        if refs[0] == refs[-1]: waters.append({'t': 'a', 'n': t.get('name'), 'p': enc(rdp(pts, 0.00003))})
    elif refs[0] == refs[-1] and (t.get('leisure') == 'park' or t.get('landuse') in ('residential', 'forest', 'grass', 'recreation_ground') or t.get('natural') == 'wood' or t.get('amenity') in ('school', 'kindergarten', 'university')):
        kind = 'park' if t.get('leisure') == 'park' or t.get('landuse') in ('grass', 'recreation_ground') else 'wood' if t.get('landuse') == 'forest' or t.get('natural') == 'wood' else 'school' if t.get('amenity') else 'res'
        if kind == 'res' and not t.get('name'): continue  # 이름 있는 주거 단지만
        areas.append({'k': kind, 'n': t.get('name'), 'p': enc(rdp(pts, 0.00003))})
    elif refs[0] == refs[-1] and t.get('building') in ('apartments', 'residential', 'school', 'yes') and t.get('name') and any(s in t.get('name') for s in ('아파트', '단지', '타운', '빌', '캐슬', '자이', '푸르지오', '더샵', '하늘채', '이편한', 'e편한', '힐스테이트', '시티', '유치원', '학교')):
        c = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        labels.append({'lat': round(c[0], 5), 'lng': round(c[1], 5), 'name': t['name'], 'kind': 'bld'})
out = {
    'source': '© OpenStreetMap contributors (ODbL 1.0) — api.openstreetmap.org map 호출로 받은 원자료를 줄여 씀',
    'bbox': [S, W, N, E], 'scale': 1e5,
    'roads': roads, 'rails': rails, 'waters': waters, 'areas': areas,
    'pois': list(pois.values()) + labels,
}
f = os.path.join(ROOT, 'data/geo/osm_basemap.json')
json.dump(out, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
print('roads', len(roads), 'named', sum(1 for r in roads if r['n']), 'rails', len(rails), 'waters', len(waters), 'areas', len(areas), 'pois', len(out['pois']), 'size', os.path.getsize(f))
