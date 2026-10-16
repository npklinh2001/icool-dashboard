(function (root) {
  'use strict';
  const fmt = v => new Intl.NumberFormat('vi-VN').format(v);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const palettes = [{current:'#55a99a',compare:'#cb9b4c'},{current:'#9683c5',compare:'#519da9'},{current:'#6c9fd7',compare:'#d0a04f'}];
  function svgChart(series, labels, lineOnly, branchAxis, bands, dateKeys) {
    const width = lineOnly ? Math.max(1000,Math.min(1500,labels.length*4+120)) : Math.max(880, labels.length * (branchAxis ? 95 : 43) + 120), height = 450, left = 75, right = 45, top = 35, bottom = 120;
    const h = height - top - bottom, cell = (width - left - right) / Math.max(1, labels.length);
    const allValues=series.flatMap(s=>s.values.filter(v=>v!==null));
    const maximum = Math.max(1, ...allValues, ...(bands||[]).map(b=>b.high||0)),minimum=Math.min(0,...allValues);
    const rough = (maximum-minimum) / 4, magnitude = 10 ** Math.floor(Math.log10(rough || 1));
    const step = Math.max(1, Math.ceil(rough / magnitude) * magnitude),lower=Math.floor(minimum/step)*step,upper=Math.ceil(maximum/step)*step;
    const y = value => top + h - (value-lower) / (upper-lower) * h;
    let svg = `<svg viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="${esc(series[0].label)}"><title>${esc(series[0].label)}; đơn vị: cuốc</title>`;
    for (let value=lower;value<=upper;value+=step) {
      const py = y(value);
      svg += `<line x1="${left}" x2="${width-right}" y1="${py}" y2="${py}" stroke="#e4eaf1" stroke-dasharray="3 4"/><text x="${left-10}" y="${py+4}" class="axis-label" text-anchor="end">${fmt(value)}</text>`;
    }
    svg += `<text x="${left}" y="17" class="axis-label">Số cuốc</text>`;
    labels.forEach((label, i) => {
      if(dateKeys && !dateKeys[i].endsWith('-01'))return;
      if(dateKeys)label=`T${dateKeys[i].slice(0,2)}`;
      const x = left + cell * (i + .5), rotated = !branchAxis && label.length > 8;
      const lines = [''];
      for (const word of label.split(' ')) {
        if (branchAxis && lines[lines.length-1].length + word.length > 13 && lines[lines.length-1]) lines.push(word);
        else lines[lines.length-1] += (lines[lines.length-1] ? ' ' : '') + word;
      }
      svg += `<text x="${x}" y="${height-bottom+22}" text-anchor="${rotated?'end':'middle'}" ${rotated?`transform="rotate(-35 ${x} ${height-bottom+22})"`:''} class="axis-label"><title>${esc(label)}</title>${lines.map((line,j)=>`<tspan x="${x}" dy="${j?15:0}">${esc(line)}</tspan>`).join('')}</text>`;
    });
    for (const [si, s] of series.entries()) {
      if (!lineOnly && si === 0) {
        s.values.forEach((v, i) => {
          if (v === null) return;
          const bw = Math.min(35, cell * .6), x = left + cell * (i+.5) - bw/2;
          svg += `<rect data-series="${si}" x="${x}" y="${y(v)}" width="${bw}" height="${Math.max(0,y(0)-y(v))}" rx="2" fill="${s.color}"><title>${esc(labels[i])} · ${esc(s.label)}: ${fmt(v)} cuốc</title></rect>`;
          if (v > 0) svg += `<text x="${x+bw/2}" y="${y(Math.max(v,bands?.[i]?.high||0))-8}" text-anchor="middle" class="bar-value" fill="${s.color}">${fmt(v)}</text>`;
        });
      } else {
        let path = '', open = false;
        s.values.forEach((v,i) => {
          if (v === null) { open=false; return; }
          const x=left+cell*(i+.5);path += `${open?'L':'M'}${x},${y(v)} `;open=true;
          if(!s.trend)svg += `<circle cx="${x}" cy="${y(v)}" r="${lineOnly?2:3.5}" fill="${s.color}"><title>${esc(labels[i])} · ${esc(s.label)}: ${fmt(v)} cuốc</title></circle>`;
        });
        svg += `<path data-series="${si}" ${s.trend?'data-trend="linear" stroke-dasharray="6 5"':''} d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.trend?2:2.3}"/>`;
      }
    }
    (bands||[]).forEach((b,i)=>{
      if(b.low===null)return;
      const x=left+cell*(i+.5),lo=y(b.low),hi=y(b.high);
      svg+=`<g class="percentile-band"><title>${esc(labels[i])} · P40: ${b.low.toFixed(1)} · P80: ${b.high.toFixed(1)} · ${b.n} ngày cùng thứ trong 12 tuần trước</title><path d="M${x},${hi}V${lo} M${x-5},${hi}H${x+5} M${x-5},${lo}H${x+5}" fill="none" stroke="white" stroke-width="4"/><path d="M${x},${hi}V${lo} M${x-5},${hi}H${x+5} M${x-5},${lo}H${x+5}" fill="none" stroke="#28364c" stroke-width="1.6"/></g>`;
    });
    return svg+'</svg>';
  }
  function create(data, core) {
    const engine = root.RideReportCore.create(data, core);
    let axis='hour';
    function render(o, comparing) {
      const result = (axis==='branch'&&o.month?engine.previousMonth(o):null)||engine.compare(o, axis==='trend'?'timeline':axis), title={hour:'Cuốc xe theo khung giờ',day:'Cuốc xe theo ngày',month:'Cuốc xe theo tháng',branch:'Cuốc xe theo chi nhánh',trend:'Xu hướng cuốc xe theo ngày'}[axis];
      const byYear = axis==='month'||axis==='trend', period = byYear ? `Năm ${o.year}` : o.month ? `Tháng ${String(o.month).padStart(2,'0')}/${o.year}` : `Kỳ ${result.period.join(', ')} · ${o.year}`;
      document.getElementById('report-title').textContent=title;
      document.getElementById('report-period').textContent=period;
      document.getElementById('report-scope').textContent=byYear?'Biểu đồ theo năm: áp dụng năm, dịch vụ, loại kinh doanh và chi nhánh; không giới hạn theo tháng đang chọn.':'Áp dụng cùng bộ lọc với bản đồ.';
      const metric=+(document.getElementById('report-metric')?.value??2),name=['Tới chi nhánh','Từ chi nhánh','Tổng cuốc'][metric];
      const palette=palettes[metric];
      const series=[{label:`${name} · ${o.year}`,color:palette.current,values:result.values.map(v=>v[metric])}];
      const hasPrior=result.priorValues.some(v=>v[metric]!==null);
      const showPrior=hasPrior&&(axis==='month'||axis==='branch'||comparing)&&!(axis==='branch'&&!o.month);
      const priorLabel=axis==='branch'?`Tháng ${String(result.comparisonMonth).padStart(2,'0')}/${result.comparisonYear}`:String(+o.year-1);
      if(showPrior)series.push({label:`${name} · ${priorLabel}`,color:palette.compare,values:result.priorValues.map(v=>v[metric])});
      if(axis==='trend') {
        const fitted=root.RideReportCore.linearTrend(series[0].values);
        if(fitted.some(v=>v!==null))series.push({label:'Xu hướng · nét đứt',color:'#475569',trend:true,values:fitted});
      }
      const bands=axis==='day'&&o.month?engine.dailyBands(o,metric):null;
      const labels=result.keys.map(key=>axis==='hour'?`${key}h`:axis==='day'?String(key).padStart(2,'0'):axis==='branch'?data.branchNames[key].replace(/^ICOOL /,''):axis==='trend'?`${key.slice(3)}/${key.slice(0,2)}`:`T${String(key).padStart(2,'0')}`);
      document.getElementById('report-legend').innerHTML=series.map((s,i)=>`<span><i class="dot" style="background:${s.color}"></i>${esc(s.label)}${i>0&&!s.trend?' · đường so sánh':''}</span>`).join('')+(bands?'<span>↕ P40–P80 · khoảng tham khảo</span>':'');
      document.getElementById('report-chart').innerHTML=axis==='day'&&!o.month?'<p class="empty">Chọn một tháng để xem các ngày trong tháng đó.</p>':svgChart(series,labels,axis==='trend',axis==='branch',bands,axis==='trend'?result.keys:null);
      document.getElementById('report-stats').innerHTML=`<div><span>${byYear?`Cuốc năm ${o.year}`:'Cuốc trong bộ lọc'}</span><b>${fmt(result.total)}</b></div><div><span>Tới chi nhánh</span><b>${fmt(result.totals[0])}</b></div><div><span>Từ chi nhánh</span><b>${fmt(result.totals[1])}</b></div><div><span>Chưa gắn với nhánh đang xem</span><b>${fmt(result.unclassified)}</b></div>`;
      const missing=[...result.coverage.missing,...(showPrior?result.priorCoverage.missing:[])];
      document.getElementById('report-warning').textContent=missing.length?`Chưa đủ file: ${missing.slice(0,8).join(', ')}${missing.length>8?'…':''}. Khoảng thiếu dữ liệu để trống, không tính là 0 cuốc.`:'';
      const timing=axis==='hour'?`Thống kê theo giờ xuất phát của cuốc, không phải giờ đến. Chưa rõ giờ: tới ${fmt(result.unplaced[0])}, từ ${fmt(result.unplaced[1])} cuốc.`:axis==='day'?'Ngày tính theo ngày bắt đầu cuốc trong tháng/năm chọn.':'';
      const baseline=bands?` P40–P80 tính từ các ngày cùng thứ trong 12 tuần trước từng ngày, không dùng ngày tương lai; cần ít nhất 8 mẫu. ${bands.filter(b=>b.low===null).length} ngày chưa đủ mẫu. Đây là khoảng tham khảo, không phải khoảng dự báo hay kết luận bất thường.`:'';
      const comparison=axis==='branch'?o.month?` Đường so sánh: tháng liền trước (${priorLabel}), nếu có dữ liệu.`:' Chọn một tháng để so với tháng liền trước.':axis==='month'?' Đường so sánh: cùng tháng năm trước, nếu có dữ liệu.':'';
      const trendNote=axis==='trend'?' Mỗi điểm là một ngày trong năm chọn; di chuột để xem ngày và số cuốc. Nét đứt thể hiện chiều tăng/giảm chung bằng đường thẳng khớp các ngày có dữ liệu, không phải dự báo. Thiếu file để đứt đoạn; không dùng số 0 để lấp.':'';
      document.getElementById('report-note').textContent=`${timing} Tổng cuốc đếm mỗi cuốc một lần; cuốc giữa hai nhánh có thể xuất hiện ở cột của mỗi nhánh, không cộng các nhánh thành tổng toàn hệ thống. Tới/Từ chỉ tính khi xác định được nhánh tương ứng, kể cả thiếu tọa độ.${comparison}${baseline}${trendNote}`.trim();
      document.querySelectorAll('[data-analysis]').forEach(b=>{const on=b.dataset.analysis===axis;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
      return result;
    }
    return {render,select(value){axis=value;}};
  }
  root.RideReports={create};
})(globalThis);
