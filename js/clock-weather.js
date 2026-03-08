// Mission Control — Live clock & weather
// =============================================
// LIVE CLOCK
// =============================================
function getISOWeek(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dy=dt.getUTCDay()||7;dt.setUTCDate(dt.getUTCDate()+4-dy);const ys=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-ys)/86400000)+1)/7);}

function updateClock(){
  const now=new Date();
  const days=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const hh=String(now.getHours()).padStart(2,'0'),mm=String(now.getMinutes()).padStart(2,'0'),ss=String(now.getSeconds()).padStart(2,'0');
  const ce=document.getElementById('header-clock'),de=document.getElementById('header-date'),we=document.getElementById('header-week-chip');
  if(ce)ce.textContent=`${hh}:${mm}:${ss}`;
  if(de)de.textContent=`${days[now.getDay()]} ${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]}`;
  if(we)we.textContent=`W${getISOWeek(now)}`;
  const cd=document.getElementById('week-countdown');
  if(cd){
    const ds=(7-now.getDay())%7;
    const ns=new Date(now.getFullYear(),now.getMonth(),now.getDate()+ds,0,0,0,0);
    if(ns<=now)ns.setDate(ns.getDate()+7);
    const ml=ns-now,hl=Math.floor(ml/3600000),ml2=Math.floor((ml%3600000)/60000),dl=Math.floor(hl/24),hr=hl%24;
    const cs=dl>0?`${dl}d ${hr}h left`:hl>0?`${hl}h ${ml2}m left`:`${ml2}m left`;
    cd.innerHTML=`<i class="ph-thin ph-timer"></i> ${cs}`;
    cd.style.color=hl<4?'var(--orange)':'var(--text-muted)';
  }
}
updateClock();
setInterval(updateClock, 1000);

// =============================================
// WEATHER — Open-Meteo (free, no key)
// =============================================
const WEATHER_LOCATIONS = {
  harlow:    { lat: 51.77, lon: 0.10, tz: 'Europe/London',  label: 'Harlow, UK' },
  barcelona: { lat: 41.39, lon: 2.17, tz: 'Europe/Madrid',  label: 'Barcelona, ES' },
};
const WEATHER_ICONS = {
  0:  ['ph-sun',          'ph-moon'],
  1:  ['ph-cloud-sun',    'ph-cloud'],
  2:  ['ph-cloud-sun',    'ph-cloud'],
  3:  ['ph-cloud',        'ph-cloud'],
  45: ['ph-cloud-fog',    'ph-cloud-fog'],
  48: ['ph-cloud-fog',    'ph-cloud-fog'],
  51: ['ph-cloud-rain',   'ph-cloud-rain'],
  53: ['ph-cloud-rain',   'ph-cloud-rain'],
  55: ['ph-cloud-rain',   'ph-cloud-rain'],
  56: ['ph-cloud-rain',   'ph-cloud-rain'],
  57: ['ph-cloud-rain',   'ph-cloud-rain'],
  61: ['ph-cloud-rain',   'ph-cloud-rain'],
  63: ['ph-cloud-rain',   'ph-cloud-rain'],
  65: ['ph-cloud-rain',   'ph-cloud-rain'],
  66: ['ph-cloud-rain',   'ph-cloud-rain'],
  67: ['ph-cloud-rain',   'ph-cloud-rain'],
  71: ['ph-cloud-snow',   'ph-cloud-snow'],
  73: ['ph-cloud-snow',   'ph-cloud-snow'],
  75: ['ph-cloud-snow',   'ph-cloud-snow'],
  77: ['ph-cloud-snow',   'ph-cloud-snow'],
  80: ['ph-cloud-rain',   'ph-cloud-rain'],
  81: ['ph-cloud-rain',   'ph-cloud-rain'],
  82: ['ph-cloud-rain',   'ph-cloud-rain'],
  85: ['ph-cloud-snow',   'ph-cloud-snow'],
  86: ['ph-cloud-snow',   'ph-cloud-snow'],
  95: ['ph-cloud-lightning','ph-cloud-lightning'],
  96: ['ph-cloud-lightning','ph-cloud-lightning'],
  99: ['ph-cloud-lightning','ph-cloud-lightning'],
};
function weatherEmoji(code, isDay) {
  const icons = WEATHER_ICONS[code];
  const icon = icons ? icons[isDay ? 0 : 1] : 'ph-thermometer';
  return `<i class="ph-thin ${icon}"></i>`;
}
let _lastWeatherData = null; // expose for dropdown
async function fetchWeather() {
  try {
    const loc = WEATHER_LOCATIONS[S.weatherLocation] || WEATHER_LOCATIONS.harlow;
    const tz = encodeURIComponent(loc.tz);
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,is_day&timezone=${tz}`);
    const d = await r.json();
    const cur = d.current;
    const temp = Math.round(cur.temperature_2m);
    const emoji = weatherEmoji(cur.weather_code, cur.is_day);
    document.getElementById('weather-emoji').innerHTML = emoji;
    document.getElementById('weather-temp').textContent = temp + '°';
    document.getElementById('weather-chip').title = loc.label + ' — ' + temp + '°C';
    _lastWeatherData = { temp, emoji, code: cur.weather_code, isDay: cur.is_day, location: S.weatherLocation, label: loc.label };
  } catch(e) { console.warn('[weather]', e); }
}
fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);  // refresh every 15 min

