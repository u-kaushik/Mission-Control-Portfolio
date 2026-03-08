// Mission Control — L10 Meeting page
// =============================================
// L10 MEETING PAGE
// =============================================

const L10_AGENDA=[
  {id:'segue',icon:'<i class="ph-thin ph-hand-waving"></i>',title:'Segue',duration:5,desc:'Good news from the week'},
  {id:'scorecard',icon:'<i class="ph-thin ph-chart-bar"></i>',title:'Scorecard Review',duration:5,desc:'Review weekly metrics'},
  {id:'rocks',icon:'<i class="ph-thin ph-mountains"></i>',title:'Rock Review',duration:5,desc:'Each Rock owner: on track / off track'},
  {id:'headlines',icon:'<i class="ph-thin ph-newspaper"></i>',title:'Customer Headlines',duration:5,desc:'Customer and employee headlines'},
  {id:'todos',icon:'<i class="ph-thin ph-check-square"></i>',title:'To-Do List Review',duration:5,desc:'Did everyone complete 7-day To-Dos?'},
  {id:'ids',icon:'<i class="ph-thin ph-warning"></i>',title:'IDS',duration:60,desc:'Identify, Discuss, Solve'},
  {id:'conclude',icon:'<i class="ph-thin ph-flag-checkered"></i>',title:'Conclude',duration:5,desc:'Recap To-Dos, rate meeting 1-10'},
];
const L10_TOTAL_MINS=L10_AGENDA.reduce((s,a)=>s+a.duration,0);
let _l10ActiveSegment=null,_l10MeetingStart=null;

function getNextMondayDate(){const now=new Date(),day=now.getDay();const dtm=day===1?0:(8-day)%7||7;const next=new Date(now);next.setDate(now.getDate()+dtm);next.setHours(9,0,0,0);if(next<=now)next.setDate(next.getDate()+7);return next;}

function renderL10Page() {
  // Next meeting badge
  const badge = document.getElementById('l10-next-badge');
  if (badge) {
    const next = getNextMondayDate();
    const dms = next - Date.now();
    const dh = Math.floor(dms / 3600000);
    const dd = Math.floor(dh / 24);
    if (dd > 1)     badge.textContent = 'Next: Mon ' + next.toLocaleDateString('en-GB', {day:'numeric', month:'short'}) + ' 09:00';
    else if (dd===1) badge.textContent = 'Tomorrow 09:00';
    else if (dh>0)   badge.textContent = 'In ' + dh + 'h ' + Math.floor((dms % 3600000) / 60000) + 'm';
    else             badge.textContent = 'Starting now';
  }

  // Agenda grid
  const grid = document.getElementById('l10-agenda-grid');
  if (grid) {
    grid.innerHTML = L10_AGENDA.map(seg => {
      const ia = _l10ActiveSegment === seg.id;
      const pct = Math.round((seg.duration / L10_TOTAL_MINS) * 100);
      const border = ia ? '2px solid var(--blue)' : '1px solid var(--border)';
      const activeBadge = ia ? '<div style="margin-top:8px;font-size:10px;font-weight:700;color:var(--blue);letter-spacing:0.06em">▶ ACTIVE</div>' : '';
      return `<div style="background:var(--surface);border:${border};border-radius:var(--radius);padding:14px 16px;cursor:pointer;transition:box-shadow 0.15s" onclick="setL10Segment('${seg.id}')">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">${seg.icon}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);flex:1">${seg.title}</span>
          <span style="font-size:11px;font-weight:600;color:${ia ? 'var(--blue)' : 'var(--text-muted)'};white-space:nowrap">${seg.duration} min</span>
        </div>
        <p style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px">${escHtml(seg.desc)}</p>
        <div style="background:var(--border-light);border-radius:99px;height:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${ia ? 'var(--blue)' : 'var(--border)'};border-radius:99px"></div>
        </div>
        ${activeBadge}
      </div>`;
    }).join('');
  }

  // IDS — open issues
  const idsSection = document.getElementById('l10-ids-section');
  if (idsSection) {
    const openIssues = (MC.allIssues || []).filter(i => i.status === 'open' || i.status === 'identified');
    let h = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:16px"><i class="ph-thin ph-warning"></i></span>
        <span style="font-size:14px;font-weight:700;color:var(--text-primary)">Issues List (IDS)</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;background:var(--orange-bg);color:var(--orange);border-radius:99px">${openIssues.length} open</span>
        <button onclick="navigateTo('issues')" style="margin-left:auto;font-size:11px;font-weight:700;padding:4px 10px;border:1px solid var(--border);background:none;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-secondary);font-family:inherit">View all →</button>
      </div>`;
    if (openIssues.length === 0) {
      h += '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:16px 0">No open issues — great shape!</p>';
    } else {
      openIssues.slice(0, 8).forEach(issue => {
        h += `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-light)">
          <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;background:var(--orange-bg);color:var(--orange);white-space:nowrap;margin-top:1px">${escHtml((issue.priority||'med').toUpperCase())}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${escHtml(issue.title||'Untitled')}</div>
            ${issue.description ? `<div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(issue.description.slice(0,80))}</div>` : ''}
          </div>
        </div>`;
      });
    }
    h += '</div>';
    idsSection.innerHTML = h;
  }

  // Last meeting stub
  const lm = document.getElementById('l10-last-meeting');
  if (lm) {
    lm.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:16px"><i class="ph-thin ph-list-bullets"></i></span>
        <span style="font-size:14px;font-weight:700;color:var(--text-primary)">Previous Meeting</span>
      </div>
      <p style="font-size:12px;color:var(--text-muted)">No previous meeting log yet. After your first L10, To-Dos and meeting rating will appear here.</p>
    </div>`;
  }
}

function setL10Segment(segId) {
  _l10ActiveSegment = _l10ActiveSegment === segId ? null : segId;
  renderL10Page();
}

function startL10Meeting() {
  _l10MeetingStart = Date.now();
  _l10ActiveSegment = L10_AGENDA[0].id;
  renderL10Page();
  showToast('L10 Meeting started — 90 minutes on the clock', 'info');
}

