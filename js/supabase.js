// Mission Control — Supabase REST helpers
// =============================================
// SUPABASE REST HELPER
// =============================================
async function sbQuery(table, params = {}, svcOverride = false) {
  const key = svcOverride ? SUPABASE_SVC : SUPABASE_KEY;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    // PostgREST column-filter shorthand: 'col.op' key → ?col=op.value
    // e.g. 'week_of.gte': '2025-11-20'  →  ?week_of=gte.2025-11-20
    // Reserved non-column keys that must NOT be split: select, order, limit, offset, or, and
    const reserved = new Set(['select','order','limit','offset','or','and']);
    const dotIdx = k.indexOf('.');
    if (dotIdx !== -1 && !reserved.has(k)) {
      const col = k.slice(0, dotIdx);
      const op  = k.slice(dotIdx + 1);
      url.searchParams.set(col, `${op}.${v}`);
    } else {
      // PostgREST requires or()/and() values wrapped in parentheses
      url.searchParams.set(k, k === 'or' || k === 'and' ? `(${v})` : v);
    }
  });
  const res = await fetch(url.toString(), {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    }
  });
  if (!res.ok) {
    const err = new Error(`${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_SVC, 'Authorization': `Bearer ${SUPABASE_SVC}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
  return res.json();
}
async function sbUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SVC, 'Authorization': `Bearer ${SUPABASE_SVC}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
}
async function sbDelete(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: { 'apikey': SUPABASE_SVC, 'Authorization': `Bearer ${SUPABASE_SVC}` } });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

