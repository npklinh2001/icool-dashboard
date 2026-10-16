(function (root) {
  'use strict';
  function create(data, core) {
    const active = data.stores.filter(s => s.visible !== false && s.brand === 'ICOOL');
    const dayByRow = new WeakMap(data.rows.map((row, index) => [row, data.days?.[index]]));
    const defaults = { provider: 'all', kind: 'ICOOL', basis: 'endpoint', branches: [] };
    function options(value, annual) {
      const o = { ...defaults, ...value };
      if (annual) { o.month = ''; const available=core.months(data.sources,o.year); o.months=Array.from({length:Math.max(0,...available)},(_,i)=>i+1); }
      return o;
    }
    function scope(o) {
      return active.filter(s => o.basis === 'unit' || !o.branches.length || o.branches.includes(s.branch));
    }
    function summarize(value, axis) {
      const o = options(value, axis === 'month' || axis === 'timeline'), stores = scope(o), allowed = new Set(stores.map(s => s.branch));
      const dateKey = (month, day) => `${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const rows = core.filter(data.rows, o, data.branchNames);
      const period = o.month ? [+o.month] : (o.months || core.months(data.sources, o.year));
      let keys;
      if (axis === 'hour') keys = Array.from({ length: 24 }, (_, i) => i);
      else if (axis === 'timeline') keys = period.flatMap(month=>Array.from({length:new Date(+o.year,month,0).getDate()},(_,i)=>dateKey(month,i+1)));
      else if (axis === 'day') keys = o.month ? Array.from({ length: new Date(+o.year, +o.month, 0).getDate() }, (_, i) => i + 1) : [];
      else if (axis === 'branch') keys = stores.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')).map(s => s.branch);
      else keys = period;
      const bins = new Map(keys.map(key => [key, [0, 0, 0]])), totals = [0, 0, rows.length], unplaced = [0, 0, 0];
      let unclassified = 0;
      for (const row of rows) {
        const inbound = allowed.has(row[5]), outbound = allowed.has(row[4]);
        if (!inbound && !outbound) unclassified++;
        const flags = [inbound, outbound];
        flags.forEach((counts, side) => {
          if (!counts) return;
          totals[side]++;
          const key = axis === 'hour' ? row[12] : axis === 'day' ? dayByRow.get(row) : axis === 'timeline' ? dateKey(row[1],dayByRow.get(row)) : axis === 'branch' ? row[side === 0 ? 5 : 4] : row[1];
          if (bins.has(key)) bins.get(key)[side]++; else unplaced[side]++;
        });
        const totalKeys = axis === 'branch' ? [...new Set([row[4],row[5]].filter(key=>allowed.has(key)))] : [axis === 'hour' ? row[12] : axis === 'day' ? dayByRow.get(row) : axis === 'timeline' ? dateKey(row[1],dayByRow.get(row)) : row[1]];
        for (const key of totalKeys) { if (bins.has(key)) bins.get(key)[2]++; else unplaced[2]++; }
      }
      const coverage = core.comparisonCoverage(data.sources, +o.year, period, o.provider);
      const values = keys.map(key => {
        const covered = axis === 'month' || axis === 'timeline' ? core.comparisonCoverage(data.sources, +o.year, [axis==='timeline'?+key.slice(0,2):key], o.provider).complete : coverage.complete;
        return covered ? bins.get(key) : [null, null, null];
      });
      return { keys, values, totals, unplaced, unclassified, total: rows.length, coverage, stores, year: +o.year, period };
    }
    function compare(value, axis) {
      const current = summarize(value, axis), prior = summarize({ ...value, year: +value.year - 1 }, axis);
      const priorIndex = new Map(prior.keys.map((key, i) => [key, prior.values[i]]));
      return { ...current, priorValues: current.keys.map(key => priorIndex.get(key) || [null, null, null]), priorCoverage: core.comparisonCoverage(data.sources,+value.year-1,current.period,value.provider||'all') };
    }
    function previousMonth(value) {
      if (!value.month) return null;
      const date = new Date(+value.year, +value.month - 2, 1);
      const year = date.getFullYear(), month = date.getMonth() + 1;
      const current = summarize(value, 'branch');
      const prior = summarize({ ...value, year, month, months: [month] }, 'branch');
      const index = new Map(prior.keys.map((key, i) => [key, prior.values[i]]));
      return { ...current, priorValues: current.keys.map(key => index.get(key) || [null, null, null]), priorCoverage: prior.coverage, comparisonYear: year, comparisonMonth: month };
    }
    function dailyBands(value, metric) {
      const current=summarize(value,'day'), cache=new Map();
      function quantile(sorted,p) { const x=(sorted.length-1)*p, i=Math.floor(x);return sorted[i]+(sorted[Math.ceil(x)]-sorted[i])*(x-i); }
      return current.keys.map(day=>{
        const samples=[];
        for(let week=1;week<=12;week++) {
          const date=new Date(+value.year,+value.month-1,day-week*7),year=date.getFullYear(),month=date.getMonth()+1,key=`${year}-${month}`;
          if(!cache.has(key))cache.set(key,summarize({...value,year,month,months:[month]},'day'));
          const history=cache.get(key),v=history.values[date.getDate()-1]?.[metric];
          if(v!==null&&v!==undefined)samples.push(v);
        }
        samples.sort((a,b)=>a-b);
        return {n:samples.length,low:samples.length>=8?quantile(samples,.4):null,high:samples.length>=8?quantile(samples,.8):null};
      });
    }
    return { summarize, compare, previousMonth, dailyBands };
  }
  function linearTrend(values) {
    const points=values.map((y,x)=>({x,y})).filter(p=>p.y!==null&&Number.isFinite(p.y));
    if(points.length<2)return values.map(()=>null);
    const mx=points.reduce((s,p)=>s+p.x,0)/points.length,my=points.reduce((s,p)=>s+p.y,0)/points.length;
    const denominator=points.reduce((s,p)=>s+(p.x-mx)**2,0);
    const slope=points.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/denominator;
    return values.map((v,x)=>v===null?null:my+slope*(x-mx));
  }
  root.RideReportCore = { create, linearTrend };
})(globalThis);
