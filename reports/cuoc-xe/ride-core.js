(function (root) {
  'use strict';
  const brands = ['UNKNOWN', 'ICOOL', 'RASA'];
  const usable = status => status === 0 || status === 2;
  function endpoint(row, direction) {
    const offset = direction === 'start' ? 6 : 8;
    return { lat: row[offset], lng: row[offset + 1], status: row[direction === 'start' ? 10 : 11], branch: row[direction === 'start' ? 4 : 5], issues: row[direction === 'start' ? 19 : 20] || 0 };
  }
  function filter(rows, options, names) {
    if (options.kind === 'RASA') return [];
    const selected = options.branches || (options.branch && options.branch !== 'all' ? [+options.branch] : []);
    return rows.filter(row => (!options.year || row[0] === +options.year) && (!options.month || row[1] === +options.month) &&
      (!options.months || options.months.includes(row[1])) &&
      (options.provider === 'all' || row[2] === +options.provider) &&
      (!selected.length || (options.basis === 'unit' ? selected.includes(row[16]) : selected.includes(row[4]) || selected.includes(row[5]))));
  }
  function distance(a, b) {
    const rad = Math.PI / 180;
    const p = (b.lat - a.lat) * rad, q = (b.lng - a.lng) * rad;
    const h = Math.sin(p / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(q / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  function nearest(point, stores) {
    let best = Infinity, store = null;
    for (const candidate of stores) {
      const d = distance(point, candidate);
      if (d < best) { best = d; store = candidate; }
    }
    return { distance: best, store };
  }
  function quality(rows, direction) {
    const stats = { total: rows.length, usable: 0, missing: 0, swapped: 0, invalid: 0 };
    for (const row of rows) {
      const status = endpoint(row, direction).status;
      if (usable(status)) stats.usable++;
      if (status === 1) stats.missing++;
      if (status === 2) stats.swapped++;
      if (status === 3 || status === 4) stats.invalid++;
    }
    return stats;
  }
  function groupPoints(rows, direction) {
    const groups = new Map();
    for (const row of rows) {
      const p = endpoint(row, direction);
      if (!usable(p.status)) continue;
      const key = `${p.lat},${p.lng}`;
      if (!groups.has(key)) groups.set(key, { lat: p.lat, lng: p.lng, count: 0, samples: [] });
      const group = groups.get(key); group.count++;
      if (group.samples.length < 5) group.samples.push(row);
    }
    return [...groups.values()];
  }
  function delta(current, previous) {
    return previous === 0 ? null : (current - previous) / previous * 100;
  }
  function coverageStores(stores, selected, kind) {
    if (kind === 'RASA') return [];
    return stores.filter(store => store.brand === 'ICOOL' && store.visible !== false && (!selected.length || selected.includes(store.branch)));
  }
  function endpointDescription(row, direction, places = []) {
    return { name: places[row[direction === 'start' ? 21 : 22]] || '', address: places[row[direction === 'start' ? 23 : 24]] || '' };
  }
  function endpointLabel(row, direction, names, places = []) {
    const point = endpoint(row, direction);
    if (point.branch >= 0 && names[point.branch]) return names[point.branch];
    const description = endpointDescription(row, direction, places);
    if (description.name || description.address) return description.name || description.address;
    if (point.issues & (2 | 4 | 8 | 32)) return 'Cần rà địa chỉ';
    return usable(point.status) ? 'Địa điểm khác' : 'Chưa xác định địa điểm';
  }
  function issueReasons(row, direction) {
    const point = endpoint(row, direction), reasons = [];
    if (point.status === 1) reasons.push('Thiếu tọa độ');
    if (point.status === 3) reasons.push('Tọa độ bằng 0');
    if (point.status === 4) reasons.push('Tọa độ cần kiểm tra');
    if (point.status === 2) reasons.push('Đã đổi thứ tự tọa độ');
    if (point.issues & 2) reasons.push('Tên chi nhánh chưa khớp danh mục');
    if (point.issues & 4) reasons.push('Địa chỉ khớp nhiều chi nhánh hoặc khác tên đã ghi');
    if (point.issues & 8) reasons.push('Gần chi nhánh; cần xem địa chỉ gốc');
    if (point.issues & 16) reasons.push('Điểm cách chi nhánh đã tra hơn 500m');
    if (point.issues & 32) reasons.push('Thiếu địa chỉ để tra chi nhánh');
    return reasons;
  }
  function issueMatches(row, direction, type) {
    const point = endpoint(row, direction);
    if (type === 'coordinates') return !usable(point.status);
    if (type === 'lookup') return !!(point.issues & (2 | 4 | 8 | 16 | 32));
    if (type === 'swapped') return point.status === 2;
    return point.status !== 0 || point.issues !== 0;
  }
  function years(sources) { return [...new Set(sources.map(source => source.year))].sort((a, b) => b - a); }
  function months(sources, year) { return [...new Set(sources.filter(source => source.year === +year).map(source => source.month))].sort((a, b) => a - b); }
  function comparisonCoverage(sources, year, period, provider) {
    const providers = provider === 'all' ? [0, 1] : [+provider], missing = [];
    for (const month of period) for (const service of providers) {
      if (!sources.some(source => source.year === +year && source.month === month && source.provider === service)) missing.push(`${service === 0 ? 'Bee' : 'Grab'} ${String(month).padStart(2, '0')}/${year}`);
    }
    return { complete: missing.length === 0, missing };
  }
  root.RideCore = { brands, usable, endpoint, filter, distance, nearest, quality, groupPoints, delta, coverageStores, endpointDescription, endpointLabel, issueReasons, issueMatches, years, months, comparisonCoverage };
})(globalThis);
