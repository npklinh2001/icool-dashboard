(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat('vi-VN').format(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const status = $('status');
  if (!window.RIDE_DATA || !window.RideCore || !window.L) {
    status.hidden = false;
    status.classList.add('error');
    status.textContent = 'Không tải được dữ liệu hoặc thư viện bản đồ. Kiểm tra các file data.js, ride-core.js và vendor/leaflet.js trong cùng folder.';
    return;
  }
  const D = window.RIDE_DATA, C = window.RideCore;
  const reports = window.RideReports.create(D, C);
  let direction = 'start', view = 'map', scheduled = false, syncing = false, errorPage = 0, fitBranches = false;
  const selectedBranches = new Set();
  const dataYears = C.years(D.sources), latestYear = dataYears[0];
  const latestMonth = Math.max(...C.months(D.sources, latestYear));
  const colorsForYear = year => year === latestYear ? { inside: '#169a70', outside: '#df8339', unknown: '#8090a2' } : { inside: '#4b76cc', outside: '#b96a88', unknown: '#8090a2' };
  const maps = {}, layers = {}, drawn = {};
  const branchName = index => D.branchNames[index] || 'Chưa xác định đơn vị';
  const endpointName = (row, side) => C.endpointLabel(row, side, D.branchNames, D.placeNames);
  function endpointDetails(row, side) {
    const info = C.endpointDescription(row, side, D.placeNames), label = endpointName(row, side), lines = [];
    if (info.name && info.name !== label) lines.push(`Địa điểm: ${esc(info.name)}`);
    if (info.address && info.address !== label && info.address !== info.name) lines.push(`Địa chỉ đặt: ${esc(info.address)}`);
    return lines.length ? `<small>${lines.join('<br>')}</small>` : '';
  }
  const deltaText = (now, before) => {
    const d = C.delta(now, before);
    return d === null ? 'Không có số cùng kỳ để tính %' : `${d >= 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}% so với cùng kỳ`;
  };
  function appendOption(select, value, label) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; select.appendChild(option);
  }
  $('year').replaceChildren(); dataYears.forEach(year => appendOption($('year'), year, year)); $('year').value = latestYear;
  function refreshMonths(preferred) {
    const months = C.months(D.sources, $('year').value), last = Math.max(...months);
    $('month').replaceChildren();
    [...months].reverse().forEach(month => appendOption($('month'), month, `Tháng ${String(month).padStart(2, '0')}`));
    appendOption($('month'), '', `Toàn kỳ 01–${String(last).padStart(2, '0')}`);
    $('month').value = preferred === '' ? '' : months.includes(+preferred) ? preferred : last;
  }
  refreshMonths(latestMonth);
  function periodMonths() {
    if ($('month').value) return [+$('month').value];
    const last = Math.max(...C.months(D.sources, $('year').value));
    return Array.from({ length: last }, (_, index) => index + 1);
  }
  function periodLabel() {
    return $('month').value ? `Tháng ${String($('month').value).padStart(2, '0')}` : `Tháng 01–${String(periodMonths().length).padStart(2, '0')}`;
  }
  $('dataset-period').textContent = dataYears.slice().reverse().map(year => `${year}: 01–${String(Math.max(...C.months(D.sources, year))).padStart(2, '0')}`).join(' · ');
  $('footer-period').textContent = 'Dữ liệu theo các file tháng đã xử lý';
  for (const name of ['primary', 'compare']) {
    maps[name] = L.map(`map-${name}`, { preferCanvas: true, zoomControl: true }).setView([10.81, 106.69], 11);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(maps[name]);
    let tileError = false;
    tiles.on('tileerror', () => {
      if (tileError) return;
      tileError = true;
      status.hidden = false;
      status.classList.add('error');
      status.textContent = 'Một số phần nền bản đồ chưa tải được. Hãy tải lại trang hoặc kiểm tra Internet.';
    });
    layers[name] = { points: L.layerGroup().addTo(maps[name]), stores: L.layerGroup().addTo(maps[name]), circles: L.layerGroup().addTo(maps[name]), route: L.layerGroup().addTo(maps[name]) };
    L.control.scale({ imperial: false }).addTo(maps[name]);
    maps[name].on('moveend', () => {
      if (syncing || !$('compare').checked) return;
      syncing = true;
      maps[name === 'primary' ? 'compare' : 'primary'].setView(maps[name].getCenter(), maps[name].getZoom(), { animate: false });
      syncing = false;
    });
  }
  const branchInputs = [];
  const visibleBranchIds = new Set(D.stores.filter(store => store.visible !== false).map(store => store.branch));
  D.branchNames.map((name, index) => ({ name, index })).filter(item => visibleBranchIds.has(item.index)).sort((a, b) => a.name.localeCompare(b.name, 'vi')).forEach(item => {
    const label = document.createElement('label'); label.className = 'branch-choice';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = item.index;
    input.addEventListener('change', () => {
      input.checked ? selectedBranches.add(item.index) : selectedBranches.delete(item.index);
      updateBranchSummary(); fitBranches = true; errorPage = 0; schedule();
    });
    label.appendChild(input); label.appendChild(document.createTextNode(item.name)); $('branch-options').appendChild(label); branchInputs.push(input);
  });
  function updateBranchSummary() {
    $('branch-all').checked = selectedBranches.size === 0;
    $('branch-summary').textContent = !selectedBranches.size ? 'Tất cả chi nhánh' : selectedBranches.size === 1 ? branchName([...selectedBranches][0]) : `${selectedBranches.size} chi nhánh`;
  }
  $('branch-all').addEventListener('change', () => { selectedBranches.clear(); branchInputs.forEach(input => { input.checked = false; }); updateBranchSummary(); fitBranches = true; errorPage = 0; schedule(); });
  document.addEventListener('pointerdown', event => { if (!$('branch-picker').contains(event.target)) $('branch-picker').open = false; }, true);
  document.addEventListener('focusin', event => { if (!$('branch-picker').contains(event.target)) $('branch-picker').open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('branch-picker').open) { $('branch-picker').open = false; $('branch-summary').focus(); } });
  D.sources.forEach((source, index) => { const option = document.createElement('option'); option.value = index; option.textContent = source.file; $('error-source').appendChild(option); });
  function options(year) {
    return { year: year ?? +$('year').value, month: $('month').value, months: periodMonths(), provider: $('provider').value, kind: $('kind').value,
      basis: $('basis').value, branches: [...selectedBranches], direction };
  }
  function coverageStores() {
    return C.coverageStores(D.stores, [...selectedBranches], $('kind').value);
  }
  function popup(group, mapName) {
    const wrap = document.createElement('div');
    let info = group.nearest.store ? `Gần ${esc(group.nearest.store.name)} nhất · ${(group.nearest.distance / 1000).toFixed(2)} km` : 'Khoảng cách chưa xác định';
    wrap.innerHTML = `<div class="popup-title">${fmt(group.count)} cuốc cùng vị trí</div><div class="popup-line">${group.lat.toFixed(6)}, ${group.lng.toFixed(6)}</div><div class="popup-line">${info}</div><div class="popup-samples"></div>`;
    const list = wrap.querySelector('.popup-samples');
    group.samples.forEach(row => {
      const sample = document.createElement('div'); sample.className = 'popup-trip';
      const source = D.sources[row[14]];
      sample.innerHTML = `<b>${row[2] === 0 ? 'Bee' : 'Grab'} · ${String(row[1]).padStart(2, '0')}/${row[0]}</b><div class="endpoint-detail"><b>Đi:</b> ${esc(endpointName(row, 'start'))}${endpointDetails(row, 'start')}</div><div class="endpoint-detail"><b>Đến:</b> ${esc(endpointName(row, 'end'))}${endpointDetails(row, 'end')}</div>Đơn vị đặt: ${esc(branchName(row[16]))} · ${row[12] < 0 ? 'Chưa rõ giờ' : `Xuất phát ${row[12]}h`}<br><small>${esc(source.file)} · ${esc(source.sheet)} · dòng ${row[15]}</small>`;
      if (C.usable(row[10]) && C.usable(row[11])) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'route-button'; button.textContent = 'Xem hai đầu cuốc này';
        button.addEventListener('click', () => {
          layers[mapName].route.clearLayers();
          const a = [row[6], row[7]], b = [row[8], row[9]];
          L.polyline([a, b], { color: '#4b76cc', weight: 2, dashArray: '6 5' }).bindTooltip('Nối hai đầu chuyến; không phải lộ trình xe chạy').addTo(layers[mapName].route);
          L.circleMarker(a, { radius: 8, color: '#169a70', fillOpacity: .8 }).bindTooltip('Điểm đi').addTo(layers[mapName].route);
          L.circleMarker(b, { radius: 8, color: '#df8339', fillOpacity: .8 }).bindTooltip('Điểm đến').addTo(layers[mapName].route);
          maps[mapName].fitBounds([a, b], { padding: [35, 35], maxZoom: 15, animate: false });
        });
        sample.appendChild(button);
      }
      list.appendChild(sample);
    });
    if (group.count > group.samples.length) {
      const note = document.createElement('div'); note.className = 'muted'; note.textContent = `Hiển thị ${group.samples.length} cuốc mẫu trong ${fmt(group.count)} cuốc.`; wrap.appendChild(note);
    }
    return wrap;
  }
  function draw(mapName, year, stores) {
    const rows = C.filter(D.rows, options(year), D.branchNames);
    const q = C.quality(rows, direction);
    const groups = C.groupPoints(rows, direction);
    let inside = 0, outside = 0;
    for (const group of groups) {
      group.nearest = C.nearest(group, stores);
      group.zone = !group.nearest.store ? 'unknown' : group.nearest.distance <= 3000 ? 'inside' : 'outside';
      if (group.zone === 'inside') inside += group.count;
      if (group.zone === 'outside') outside += group.count;
    }
    for (const layer of Object.values(layers[mapName])) layer.clearLayers();
    for (const store of stores) {
      const icon = L.divIcon({ className: 'store-icon', html: '⌂', iconSize: [28, 28], iconAnchor: [14, 14] });
      L.marker([store.lat, store.lng], { icon }).bindPopup(`<b>${esc(store.name)}</b><br>${esc(store.address)}<br><small>Tọa độ theo danh mục chi nhánh; chưa xác minh thực địa.</small>`).addTo(layers[mapName].stores);
      if ($('circles').checked) L.circle([store.lat, store.lng], { radius: 3000, color: '#7b73c7', weight: 1, fillOpacity: .025 }).addTo(layers[mapName].circles);
    }
    const shown = groups.filter(g => !$('outside').checked || g.zone === 'outside');
    for (const group of shown) {
      L.circleMarker([group.lat, group.lng], { radius: Math.min(16, 3 + Math.log2(group.count + 1) * 1.6), color: colorsForYear(year)[group.zone], weight: .6, fillOpacity: .68 })
        .bindPopup(() => popup(group, mapName)).addTo(layers[mapName].points);
    }
    const shownCount = shown.reduce((sum, g) => sum + g.count, 0);
    const period = periodLabel();
    $(`title-${mapName}`).textContent = `${period} / ${year}`;
    $(`count-${mapName}`).textContent = `${fmt(shownCount)} cuốc · ${fmt(shown.length)} vị trí đang vẽ`;
    $(`quality-${mapName}`).textContent = `${fmt(shownCount)} điểm từ ${fmt(q.total)} cuốc. Các cuốc cùng vị trí được gom thành một chấm.`;
    drawn[mapName] = { rows, q, groups, shown, inside, outside };
    return drawn[mapName];
  }
  function metric(label, value, note) {
    return `<article class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${value}</div><div class="metric-note">${esc(note)}</div></article>`;
  }
  function charts(primary) {
    const flows = new Map();
    $('flows-year').textContent = $('year').value;
    primary.rows.forEach(r => { const key = JSON.stringify([endpointName(r, 'start'), endpointName(r, 'end')]); flows.set(key, (flows.get(key) || 0) + 1); });
    const topFlows = [...flows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('flows').innerHTML = topFlows.length ? `<div class="table-scroll"><table class="flow-table"><thead><tr><th>Điểm đi</th><th>Điểm đến</th><th>Số cuốc</th></tr></thead><tbody>${topFlows.map(([key, count]) => { const pair = JSON.parse(key); return `<tr><td>${esc(pair[0])}</td><td>${esc(pair[1])}</td><td><b>${fmt(count)}</b></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="empty">Không có cuốc trong bộ lọc.</p>';
    const hotspots = primary.groups.filter(g => g.zone === 'outside').sort((a, b) => b.count - a.count).slice(0, 6);
    $('hotspots').replaceChildren();
    if (!hotspots.length) $('hotspots').innerHTML = '<p class="empty">Không có điểm ngoài 3 km hoặc chưa có danh mục để đánh giá.</p>';
    hotspots.forEach(g => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'data-row hotspot';
      button.innerHTML = `<span>${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}<small>Gần ${esc(g.nearest.store.name)} · ${(g.nearest.distance / 1000).toFixed(2)} km</small></span><b>${fmt(g.count)} cuốc</b>`;
      button.addEventListener('click', () => {
        showView('map');
        setTimeout(() => {
        maps.primary.setView([g.lat, g.lng], 15, { animate: false });
        L.popup().setLatLng([g.lat, g.lng]).setContent(popup(g, 'primary')).openOn(maps.primary);
        $('map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      });
      $('hotspots').appendChild(button);
    });
  }
  function render() {
    const comparing = $('compare').checked, year = +$('year').value, otherYear = year - 1;
    $('map-view').hidden = view !== 'map'; $('error-view').hidden = view !== 'errors'; $('report-view').hidden = view !== 'report';
    $('panel-compare').hidden = !comparing; $('maps').classList.toggle('single', !comparing);
    if (view === 'map') { maps.primary.invalidateSize(); if (comparing) maps.compare.invalidateSize(); }
    const stores = coverageStores(), primary = draw('primary', year, stores);
    const previous = comparing ? draw('compare', otherYear, stores) : {q:C.quality(C.filter(D.rows,options(otherYear),D.branchNames),direction)};
    const currentCoverage = C.comparisonCoverage(D.sources, year, periodMonths(), $('provider').value);
    const priorCoverage = C.comparisonCoverage(D.sources, otherYear, periodMonths(), $('provider').value);
    const comparable = currentCoverage.complete && priorCoverage.complete;
    const comparisonNote = !comparing ? `${periodLabel()} / ${year}` : comparable ? `${otherYear}: ${fmt(previous.q.total)} · ${deltaText(primary.q.total, previous.q.total)}` : `Chưa đủ file để so cùng kỳ ${otherYear}`;
    for (const [mapName, coverage] of [['primary', currentCoverage], ['compare', priorCoverage]]) {
      if(mapName==='compare'&&!comparing)continue;
      if (!coverage.complete) {
        $(`quality-${mapName}`).textContent = `Chưa có file: ${coverage.missing.slice(0, 4).join(', ')}${coverage.missing.length > 4 ? '…' : ''}.`;
        $(`count-${mapName}`).textContent = `${fmt(drawn[mapName].q.total)} cuốc trong các file đã có · chưa đủ kỳ`;
      }
    }
    const legendYears = comparing ? [year, otherYear] : [year];
    $('map-legend').innerHTML = legendYears.map(y => `<span><i class="dot" style="background:${colorsForYear(y).inside}"></i>${y}: trong 3 km</span><span><i class="dot" style="background:${colorsForYear(y).outside}"></i>${y}: ngoài 3 km</span>`).join('') + '<span><i class="dot gray"></i>Khoảng cách chưa xác định</span><span><i class="dot purple"></i>Chi nhánh</span>';
    const evaluated = primary.inside + primary.outside;
    const pct = evaluated ? (primary.outside / evaluated * 100).toFixed(1).replace('.', ',') : '—';
    const q = primary.q;
    $('metrics').innerHTML = metric('Tổng cuốc', fmt(q.total), comparisonNote) +
      metric('Số cuốc có thể vẽ', fmt(q.usable), `${q.total ? (q.usable / q.total * 100).toFixed(1).replace('.', ',') : '0'}% có tọa độ dùng được; đã gồm điểm đổi tọa độ`) +
      metric('Số điểm ngoài phạm vi 3 km', fmt(primary.outside), `${pct}% trên các điểm có thể vẽ · ${stores.length} chi nhánh`) +
      `<button class="metric metric-action" id="open-errors" type="button"><span class="metric-label">Số điểm chưa xác định</span><span class="metric-value">${fmt(q.missing + q.invalid)}</span><span class="metric-note">${esc(periodLabel())}/${year} · ${direction==='start'?'đầu đi':'đầu đến'} · Bấm để kiểm tra →</span></button>`;
    $('open-errors').addEventListener('click', () => { $('error-direction').value = direction; $('error-type').value = 'coordinates'; $('error-source').value = 'all'; errorPage = 0; showView('errors'); });
    const directionHint = direction === 'start' ? 'Với cuốc xe tới chi nhánh: xem nơi đón khách.' : 'Với cuốc xe từ chi nhánh: xem nơi trả khách về.';
    const filterHint = !selectedBranches.size ? 'Hai tab hiển thị hai đầu của cùng nhóm cuốc.' : $('basis').value === 'unit' ? 'Các cuốc do đơn vị được chọn đặt xe.' : 'Gồm cuốc tới và từ chi nhánh được chọn.';
    $('direction-note').textContent = view === 'errors' ? `${periodLabel()}/${year} · Tra lại bằng file, sheet và dòng Excel.` : view === 'report' ? 'Phân tích số cuốc tới và từ chi nhánh theo bộ lọc.' : `${directionHint} ${filterHint}`;
    if (!status.classList.contains('error')) {
      const missingFiles = [...currentCoverage.missing, ...(comparing ? priorCoverage.missing : [])];
      status.hidden = $('kind').value !== 'RASA' && !missingFiles.length;
      status.textContent = $('kind').value === 'RASA' ? 'RASA đang cập nhật. Hiện chưa có dữ liệu cuốc xe RASA để hiển thị.' : `Chưa có file: ${missingFiles.slice(0, 4).join(', ')}${missingFiles.length > 4 ? '…' : ''}. Chưa tính % thay đổi khi thiếu file cùng kỳ.`;
    }
    if(view==='report'){reports.render(options(),comparing);charts(primary);}
    if(view==='errors')renderErrors();
    if (fitBranches && view === 'map' && stores.length) {
      const bounds = stores.flatMap(store => [[store.lat - .035, store.lng - .035], [store.lat + .035, store.lng + .035]]);
      maps.primary.fitBounds(bounds, { padding: [20, 20], maxZoom: 12, animate: false }); fitBranches = false;
    }
  }
  function showView(next, side) {
    view = next; if (side) direction = side;
    document.querySelectorAll('[data-view]').forEach(tab => {
      const active = view==='map' ? tab.dataset.view==='map'&&tab.dataset.direction===direction : tab.dataset.view===view;
      tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active));
    });
    schedule();
  }
  function renderErrors() {
    const selectedSide = $('error-direction').value, type = $('error-type').value, source = $('error-source').value;
    const sides = selectedSide === 'both' ? ['start', 'end'] : [selectedSide], entries = [];
    for (const side of sides) {
      const rows = C.filter(D.rows, { ...options(), direction: side }, D.branchNames);
      for (const row of rows) {
        if (source !== 'all' && row[14] !== +source) continue;
        if (C.issueMatches(row, side, type)) entries.push({ row, side });
      }
    }
    const size = 50, pages = Math.max(1, Math.ceil(entries.length / size)); errorPage = Math.max(0, Math.min(errorPage, pages - 1));
    $('error-count').textContent = `${fmt(entries.length)} điểm · ${periodLabel()}/${$('year').value}`;
    $('error-page').textContent = `Trang ${errorPage + 1} / ${pages}`;
    $('error-prev').disabled = errorPage === 0; $('error-next').disabled = errorPage >= pages - 1;
    $('error-rows').innerHTML = entries.slice(errorPage * size, (errorPage + 1) * size).map(({ row, side }, index) => {
      const file = D.sources[row[14]];
      return `<tr><td>${fmt(errorPage * size + index + 1)}</td><td>${esc(file.file)}</td><td>${esc(file.sheet)}</td><td><b>${row[15]}</b></td><td>${side === 'start' ? 'Đi' : 'Đến'}</td><td>${esc(C.issueReasons(row, side).join('; '))}</td></tr>`;
    }).join('') || '<tr><td colspan="6">Không có điểm cần kiểm tra trong bộ lọc này.</td></tr>';
  }
  function schedule() {
    if (scheduled) return; scheduled = true;
    setTimeout(() => { scheduled = false; try { render(); } catch (error) { status.hidden = false; status.classList.add('error'); status.textContent = `Không thể dựng bản đồ: ${error.message}`; console.error(error); } }, 0);
  }
  for (const id of ['year', 'month', 'provider', 'basis', 'kind', 'compare', 'circles', 'outside']) $(id).addEventListener('change', () => { if (id === 'year') refreshMonths($('month').value); errorPage = 0; schedule(); });
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => {
    showView('map', button.dataset.direction);
  }));
  $('tab-errors').addEventListener('click', () => { $('error-direction').value = direction; errorPage = 0; showView('errors'); });
  $('tab-report').addEventListener('click',()=>showView('report'));
  $('report-metric').addEventListener('change',schedule);
  document.querySelectorAll('[data-analysis]').forEach(button=>button.addEventListener('click',()=>{reports.select(button.dataset.analysis);schedule();}));
  for (const id of ['error-direction', 'error-type', 'error-source']) $(id).addEventListener('change', () => { errorPage = 0; renderErrors(); });
  $('error-prev').addEventListener('click', () => { errorPage--; renderErrors(); });
  $('error-next').addEventListener('click', () => { errorPage++; renderErrors(); });
  $('fit').addEventListener('click', () => {
    const points = (drawn.primary?.shown || []).map(g => [g.lat, g.lng]);
    if (points.length) maps.primary.fitBounds(points, { padding: [25, 25], maxZoom: 15, animate: false });
  });
  $('reset').addEventListener('click', () => {
    $('year').value = latestYear; refreshMonths(latestMonth); $('provider').value = 'all'; $('basis').value = 'endpoint'; $('kind').value = 'ICOOL';
    selectedBranches.clear(); branchInputs.forEach(input => { input.checked = false; }); updateBranchSummary();
    fitBranches = false;
    $('compare').checked = false; $('circles').checked = true; $('outside').checked = false; $('branch-picker').open=false;
    maps.primary.setView([10.81, 106.69], 11, { animate: false }); $('tab-start').click();
  });
  $('total-source').textContent = `${fmt(D.rows.length)} cuốc · ${D.sources.length} file tháng`;
  if (location.protocol === 'file:') { status.hidden = false; status.classList.add('error'); status.textContent = 'Hãy mở trang qua server local HTTP để tránh nền OpenStreetMap bị chặn. Ví dụ http://127.0.0.1:8000/CUOC_XE_WEB/dist/'; }
  schedule();
})();
