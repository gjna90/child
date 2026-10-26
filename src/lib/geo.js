// 좌표 → 읍·면·동 판정 (행정동 경계 GeoJSON 사용)
// 경계 자료: data/geo/asan_admdong_20261001.geojson
//   출처: vuski/admdongkor ver20261001 (통계청 행정동 경계를 정리해 공개한 자료, 제3자 가공)

import fs from 'node:fs';

function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng, lat, poly) {
  if (!inRing(lng, lat, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (inRing(lng, lat, poly[k])) return false; // 구멍
  return true;
}

export function loadBoundaries(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  return d.features.map((f) => ({
    name: f.properties.adm_nm.split(' ').pop(),
    fullName: f.properties.adm_nm,
    code: f.properties.adm_cd2,
    polys: f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
  }));
}

/** @returns {string|null} 읍·면·동 이름. 경계 밖이거나 좌표가 없으면 null */
export function districtOf(lat, lng, boundaries) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  for (const b of boundaries) if (b.polys.some((p) => inPolygon(lng, lat, p))) return b.name;
  return null;
}

/** 두 지점의 직선거리(m). 실제 도보·자동차 거리가 아님 */
export function straightDistanceM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
