import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PLACES, placeById } from "./data/places.js";

/* ============================================================
   DATA
   ============================================================ */

const TRIP_DATES = Array.from({ length: 13 }, (_, i) => 15 + i); // 15..27 Sep 2026
const ITINERARY_STORAGE_KEY = "fk-london-itinerary-v1";

function baseFor(date) {
  if (date <= 18) return { label: "Elstree", he: "מלון: אלסטרי" };
  if (date === 19) return { label: "Transition day", he: "יום מעבר → מלון בטרפלגר סקוור" };
  if (date === 27) return { label: "Flight home", he: "יום הטיסה חזרה" };
  return { label: "Trafalgar Square", he: "מלון: טרפלגר סקוור" };
}
function weekdayLetter(date) {
  return new Date(2026, 8, date).toLocaleDateString("he-IL", { weekday: "narrow" });
}
function emptyDayNote(date) {
  if (date === 15) return "יום הנחיתה בלונדון — התוכנית המפורטת תתעדכן בהמשך";
  if (date === 19) return "יום מעבר מלונות (אלסטרי → טרפלגר סקוור) — התוכנית המפורטת תתעדכן בהמשך";
  return "אין תוכנית עדיין ליום זה — הוסיפו עם ה-+ למטה";
}

function seedItinerary() {
  const it = {};
  TRIP_DATES.forEach((d) => (it[d] = []));
  it[18] = [
    { id: "s1", time: "10:00", placeId: "nhm", done: false },
    { id: "s2", time: "13:00", placeId: "vacafe", done: true },
  ];
  it[20] = [
    { id: "s3", time: "10:00", placeId: "bustour", done: false },
    { id: "s4", time: "13:00", placeId: "chinatown", done: false },
    { id: "s5", time: "15:00", placeId: "lego", done: false },
    { id: "s6", time: "15:45", placeId: "mms", done: false },
  ];
  it[21] = [
    { id: "s7", time: "10:00", placeId: "tol", done: false },
    { id: "s8", time: "14:00", placeId: "onc", done: false },
  ];
  it[22] = [
    { id: "s9", time: "10:00", placeId: "zoo", done: false },
    { id: "s10", time: "15:00", placeId: "hamleys", done: false },
  ];
  it[23] = [
    { id: "s11", time: "10:00", placeId: "nhm", done: false },
    { id: "s12", time: "14:00", placeId: "hsk", done: false },
  ];
  it[24] = [
    { id: "s13", time: "10:00", placeId: "ltm", done: false },
    { id: "s14", time: "13:00", placeId: "cgshop", done: false },
  ];
  it[25] = [
    { id: "s15", time: "10:00", placeId: "diana", done: false },
    { id: "s16", time: "15:00", placeId: "finalshop", done: false },
  ];
  it[26] = [
    { id: "s17", time: "10:00", placeId: "ng", done: false },
  ];
  return it;
}

function loadItinerary() {
  try {
    const raw = localStorage.getItem(ITINERARY_STORAGE_KEY);
    if (!raw) return seedItinerary();
    const saved = JSON.parse(raw);
    const merged = seedItinerary();
    TRIP_DATES.forEach((d) => {
      if (Array.isArray(saved[d])) merged[d] = saved[d];
    });
    return merged;
  } catch {
    return seedItinerary();
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
function formatDistance(m) {
  if (m < 950) return `${Math.round(m / 10) * 10} מ׳`;
  return `${(m / 1000).toFixed(1)} ק"מ`;
}
function walkMinutes(m) {
  return Math.max(1, Math.round(m / 80));
}
function weatherIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}
function weatherDesc(code) {
  const map = { 0: "בהיר", 1: "בהיר בעיקר", 2: "מעונן חלקית", 3: "מעונן", 45: "ערפל", 48: "ערפל קפוא", 51: "טפטוף קל", 53: "טפטוף", 55: "טפטוף חזק", 61: "גשם קל", 63: "גשם", 65: "גשם חזק", 71: "שלג קל", 73: "שלג", 75: "שלג חזק", 80: "ממטרים קלים", 81: "ממטרים", 82: "ממטרים חזקים", 95: "סופת רעמים" };
  return map[code] || "מזג אוויר";
}
function isRainCode(code) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

/* ============================================================
   STYLE (Direction A — retro travel poster)
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Secular+One&family=Heebo:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
html, body { height:100%; }
.fk-root { font-family:'Heebo',sans-serif; direction:rtl; display:flex; justify-content:center; align-items:center; padding:32px 12px; background:#1c2333; min-height:100vh; min-height:100svh; }
.fk-phone { width:100%; max-width:420px; height:100vh; height:100svh; max-height:860px; background:#FFF8ED; background-image:radial-gradient(#EADFC8 1.4px, transparent 1.4px); background-size:16px 16px; border-radius:32px; overflow:hidden; box-shadow:0 30px 60px -20px rgba(0,0,0,0.5); display:flex; flex-direction:column; position:relative; border:6px solid #14161c; }
@media (max-width: 480px) {
  .fk-root { padding:0; align-items:stretch; }
  .fk-phone { max-width:none; max-height:none; border-radius:0; border:none; box-shadow:none; }
}
.fk-header { background:#D64545; padding:calc(20px + env(safe-area-inset-top)) 20px 16px; border-bottom:4px solid #1F3A5F; flex-shrink:0; }
.fk-flag { width:34px; height:34px; background:#F2B705; border-radius:50%; border:2.5px solid #1F3A5F; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.fk-title { font-family:'Secular One',sans-serif; font-size:16px; color:#fff; }
.fk-tag { font-family:'Secular One',sans-serif; font-size:13px; color:#FFE9C7; margin-top:4px; }
.fk-content { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain; padding:16px 16px calc(96px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:14px; }
.fk-content > * { flex-shrink:0; }
.fk-section-label { font-family:'Secular One',sans-serif; font-size:12px; color:#1F3A5F; margin-bottom:5px; margin-right:2px; }
.fk-hourly-row { display:flex; gap:8px; overflow-x:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; padding-top:10px; margin-top:10px; border-top:2px dashed #EADFC8; }
.fk-hourpill { background:#FFE9C7; border:2px solid #1F3A5F; border-radius:12px; padding:6px 9px; text-align:center; font-size:11px; color:#1F3A5F; min-width:46px; flex-shrink:0; font-weight:600; }
.fk-hourpill .t { font-weight:700; font-size:12.5px; margin-top:2px; }
.fk-alertcard { display:flex; align-items:stretch; background:#fff; border:2.5px solid #1F3A5F; border-radius:16px; overflow:hidden; box-shadow:5px 5px 0 #1F3A5F; }
.fk-alertstripe { width:14px; flex-shrink:0; background:repeating-linear-gradient(-45deg,#F2B705,#F2B705 8px,#1F3A5F 8px,#1F3A5F 16px); }
.fk-alertbody { padding:13px 15px; flex:1; }
.fk-card { background:#fff; border:2.5px solid #1F3A5F; border-radius:16px; padding:13px 15px; box-shadow:5px 5px 0 #1F3A5F; }
.fk-card.rec { border-color:#F2B705; box-shadow:5px 5px 0 #F2B705; background:#FFFCF3; }
.fk-food { border-color:#F2B705; box-shadow:5px 5px 0 #F2B705; }
.fk-strong { font-family:'Secular One',sans-serif; font-size:14px; color:#1F3A5F; }
.fk-muted { color:#7A6F5C; font-size:11.5px; font-weight:500; }
.fk-eng { direction:ltr; unicode-bidi:isolate; font-family:'Heebo',sans-serif; }
.fk-tabbar { position:absolute; bottom:0; left:0; right:0; height:calc(78px + env(safe-area-inset-bottom)); background:#fff; border-top:3px solid #1F3A5F; display:flex; justify-content:space-around; align-items:center; padding-bottom:calc(8px + env(safe-area-inset-bottom)); z-index:20; }
.fk-tab { display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; cursor:pointer; padding:6px 6px; flex:1; min-width:0; }
.fk-tab span.lbl { font-size:9.5px; color:#7A6F5C; font-weight:600; line-height:1.15; text-align:center; }
.fk-tab .iw { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; }
.fk-tab.active .iw { background:#F2B705; border:2px solid #1F3A5F; }
.fk-tab.active span.lbl { color:#D64545; }
.fk-pillbtn { border:2.5px solid #1F3A5F; border-radius:14px; padding:11px; font-family:'Secular One',sans-serif; font-size:13px; box-shadow:4px 4px 0 #1F3A5F; cursor:pointer; }
.fk-pillbtn.red { background:#D64545; color:#fff; }
.fk-pillbtn.navy { background:#1F3A5F; color:#fff; }
.fk-pillbtn.white { background:#fff; color:#1F3A5F; }
.fk-daystrip { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; }
.fk-daychip { min-width:48px; text-align:center; padding:8px 6px; border-radius:12px; color:#1F3A5F; background:#FFE9C7; border:2px solid #1F3A5F; flex-shrink:0; cursor:pointer; scroll-snap-align:start; }
.fk-daychip .wd { font-size:10px; font-weight:600; opacity:0.75; }
.fk-daychip .dn { font-size:17px; font-weight:800; font-family:'Secular One',sans-serif; margin-top:2px; }
.fk-daychip.active { background:#D64545; color:#fff; }
.fk-chk { width:22px; height:22px; border-radius:6px; border:2.5px solid #1F3A5F; flex-shrink:0; cursor:pointer; position:relative; background:#fff; }
.fk-chk.done { background:#F2B705; }
.fk-chk.done::after { content:''; position:absolute; left:6px; top:3px; width:6px; height:11px; border:solid #1F3A5F; border-width:0 2.5px 2.5px 0; transform:rotate(35deg); }
.fk-swapbtn { font-size:11px; color:#fff; background:#1F3A5F; border:none; border-radius:10px; padding:6px 10px; font-weight:700; cursor:pointer; }
.fk-connector { text-align:center; font-size:11px; color:#A89A7D; font-weight:600; }
.fk-fab { position:absolute; bottom:calc(88px + env(safe-area-inset-bottom)); left:16px; width:48px; height:48px; border-radius:50%; background:#D64545; color:#fff; font-size:22px; display:flex; align-items:center; justify-content:center; border:3px solid #1F3A5F; box-shadow:4px 4px 0 #1F3A5F; z-index:25; font-family:'Secular One'; cursor:pointer; }
@keyframes fk-toastpop {
  0% { transform: translate(-50%, -40px); opacity: 0; }
  14% { transform: translate(-50%, 0); opacity: 1; }
  80% { transform: translate(-50%, 0); opacity: 1; }
  100% { transform: translate(-50%, -40px); opacity: 0; }
}
.fk-donetoast { position:absolute; top:14px; left:50%; z-index:60; background:#1F3A5F; color:#fff; border:2.5px solid #F2B705; border-radius:14px; padding:10px 20px; font-family:'Secular One',sans-serif; font-size:14px; box-shadow:4px 4px 0 #F2B705; white-space:nowrap; animation:fk-toastpop 2.6s ease forwards; pointer-events:none; }
.fk-dimmer { position:absolute; inset:0; background:rgba(31,58,95,0.45); z-index:40; display:flex; align-items:flex-end; }
.fk-modal { width:100%; max-height:88%; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain; background:#FFF8ED; border-top:4px solid #1F3A5F; border-radius:24px 24px 0 0; padding:18px 18px calc(22px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:10px; }
.fk-weatherstrip { display:flex; align-items:center; gap:8px; background:#1F3A5F; border:2.5px solid #1F3A5F; border-radius:12px; padding:8px 12px; color:#fff; }
.fk-weatherstrip .fk-strong { color:#fff; font-size:12.5px; }
.fk-toggle { display:flex; border:2.5px solid #1F3A5F; border-radius:14px; overflow:hidden; }
.fk-toggleopt { flex:1; text-align:center; padding:9px; font-family:'Secular One'; font-size:12.5px; background:#fff; color:#1F3A5F; cursor:pointer; }
.fk-toggleopt.active { background:#1F3A5F; color:#fff; }
.fk-input { border:2px solid #1F3A5F; border-radius:10px; padding:9px 12px; font-family:'Heebo'; font-size:13px; width:100%; }
.fk-badge { background:#F2B705; border:2px solid #1F3A5F; border-radius:10px; padding:5px 9px; font-size:11px; font-weight:700; color:#1F3A5F; white-space:nowrap; }
.fk-tag { display:inline-block; background:#FFE9C7; border:1.5px solid #1F3A5F; border-radius:8px; padding:2px 7px; font-size:10px; font-weight:700; color:#1F3A5F; margin-top:4px; }
.fk-closex { width:26px; height:26px; border-radius:50%; border:2px solid #1F3A5F; display:flex; align-items:center; justify-content:center; font-size:13px; color:#1F3A5F; font-weight:700; cursor:pointer; background:#fff; flex-shrink:0; }
`;

/* ============================================================
   SMALL COMPONENTS
   ============================================================ */

function Header({ tag }) {
  return (
    <div className="fk-header">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="fk-flag">🇬🇧</div>
        <div className="fk-title">פינקלשטיין נוסעים ללונדון</div>
      </div>
      {tag && <div className="fk-tag">{tag}</div>}
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "home", icon: "🏠", label: "בית" },
    { id: "itinerary", icon: "📅", label: "יומן" },
    { id: "nearme", icon: "📍", label: "קרוב אליי" },
    { id: "backlog", icon: "📋", label: "מחסן האטרקציות" },
  ];
  return (
    <div className="fk-tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={`fk-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
          <div className="iw">{t.icon}</div>
          <span className="lbl">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function WeatherStrip({ weather }) {
  if (!weather) return (
    <div className="fk-weatherstrip"><span>⏳</span><div className="fk-strong">טוען מזג אוויר...</div></div>
  );
  return (
    <div className="fk-weatherstrip">
      <span>{weather.rain ? "☔" : "☀️"}</span>
      <div className="fk-strong">
        {weather.rain ? "גשם קל" : "בהיר"}, {Math.round(weather.temp)}° בלונדון עכשיו
      </div>
    </div>
  );
}

/* ============================================================
   HOME SCREEN
   ============================================================ */

function HomeScreen({ weather, setTab, itinerary, today }) {
  const stops = itinerary[today] || [];
  const next = stops.find((s) => !s.done) || stops[0];
  const nextPlace = next ? placeById(next.placeId) : null;
  const dateLabel = new Date(2026, 8, today).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fk-content">
      <div className="fk-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="fk-strong" style={{ fontSize: 15 }}>{dateLabel}</div>
          <div className="fk-muted">יום {today - 14} מתוך {TRIP_DATES.length}</div>
        </div>
        <div style={{ fontSize: 22 }}>🗓️</div>
      </div>

      <div>
        <div className="fk-section-label">☁️ מזג אוויר</div>
        <div className="fk-card">
          {!weather ? (
            <div className="fk-muted">טוען מזג אוויר...</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 46, lineHeight: 1 }}>{weatherIcon(weather.code)}</div>
                <div>
                  <div className="fk-strong" style={{ fontFamily: "'Secular One'", fontSize: 27, color: "#D64545" }}>{Math.round(weather.temp)}°</div>
                  <div className="fk-muted">{weather.desc} · עודכן {weather.time}</div>
                </div>
              </div>
              <div className="fk-hourly-row">
                {weather.hourly.map((h, i) => (
                  <div key={i} className="fk-hourpill">
                    <div>{h.time}</div>
                    <div style={{ fontSize: 16 }}>{weatherIcon(h.code)}</div>
                    <div className="t">{Math.round(h.temp)}°</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="fk-section-label">📌 הבא בתור</div>
        <div className="fk-card" style={{ cursor: "pointer" }} onClick={() => setTab("itinerary")}>
          <div className="fk-muted">{next ? next.time : ""}</div>
          <div className="fk-strong fk-eng" style={{ fontSize: 15 }}>{nextPlace ? nextPlace.nameEn : "אין תוכנית עדיין להיום"}</div>
        </div>
      </div>

      <div>
        <div className="fk-section-label">🎟️ הזמנת כרטיסים</div>
        <div className="fk-alertcard">
          <div className="fk-alertstripe" />
          <div className="fk-alertbody">
            <div className="fk-strong" style={{ fontSize: 14 }}>🔔 עד 2 בספטמבר</div>
            <div className="fk-muted fk-eng" style={{ fontSize: 12.5 }}>London Eye</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="fk-pillbtn red" style={{ flex: 1 }} onClick={() => setTab("itinerary")}>יומן</button>
        <button className="fk-pillbtn navy" style={{ flex: 1 }} onClick={() => setTab("nearme")}>קרוב אליי</button>
      </div>
    </div>
  );
}

/* ============================================================
   SWAP MODAL
   ============================================================ */

function SwapModal({ swapTarget, onClose, onSelect, weather }) {
  const current = swapTarget ? placeById(swapTarget.placeId) : null;
  const [category, setCategory] = useState(current?.category || "attraction");

  useEffect(() => {
    if (current) setCategory(current.category);
  }, [swapTarget?.id]);

  if (!swapTarget) return null;

  const candidates = PLACES
    .filter((p) => p.category === category && p.id !== swapTarget.placeId)
    .map((p) => ({ ...p, dist: current ? haversine(current.lat, current.lng, p.lat, p.lng) : 0 }));
  const sorted = [...candidates].sort((a, b) => {
    if (weather?.rain && a.indoor !== b.indoor) return a.indoor ? -1 : 1;
    return a.dist - b.dist;
  }).slice(0, 4);

  return (
    <div className="fk-dimmer" onClick={onClose}>
      <div className="fk-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#D8CFBB", alignSelf: "center" }} />
        <WeatherStrip weather={weather} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="fk-strong" style={{ fontSize: 15 }}>להחליף את: {swapTarget.time}</div>
            <div className="fk-muted fk-eng">Currently: {current?.nameEn}</div>
          </div>
          <div className="fk-closex" onClick={onClose}>✕</div>
        </div>

        <div className="fk-toggle">
          <div className={`fk-toggleopt ${category === "attraction" ? "active" : ""}`} onClick={() => setCategory("attraction")}>אטרקציה</div>
          <div className={`fk-toggleopt ${category === "restaurant" ? "active" : ""}`} onClick={() => setCategory("restaurant")}>מזון</div>
        </div>
        <div className="fk-muted" style={{ textAlign: "center" }}>ממוין לפי מרחק מ-{current?.nameEn}</div>

        {sorted.map((p, idx) => {
          const recommended = weather?.rain && p.indoor && idx === 0;
          const dimmed = weather?.rain && !p.indoor;
          return (
            <div key={p.id} className={`fk-card ${recommended ? "rec" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: dimmed ? 0.55 : 1 }}>
              <div>
                <div className="fk-strong fk-eng" style={{ fontSize: 13.5 }}>{p.nameEn}</div>
                <div className="fk-tag" style={dimmed ? { background: "#FCE1D8" } : {}}>
                  {dimmed ? "⚠️ בחוץ — יורד גשם" : p.indoor ? "חוויה בתוך מבנה" : "בחוץ"} · {formatDistance(p.dist)}
                  {category === "attraction" ? ` · ${p.rating}★` : ""}
                </div>
              </div>
              <button className="fk-swapbtn" onClick={() => onSelect(p.id)}>בחר</button>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="fk-muted" style={{ textAlign: "center" }}>אין עדיין מקומות בקטגוריה הזו ברשימה</div>}
        <div style={{ textAlign: "center", fontSize: 12.5, color: "#1F3A5F", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={onClose}>
          השאר את התוכנית המקורית
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ITINERARY SCREEN
   ============================================================ */

function ItineraryScreen({ itinerary, setItinerary, currentDay, setCurrentDay, weather }) {
  const [swapTarget, setSwapTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newStop, setNewStop] = useState({ time: "", placeId: PLACES[0].id });
  const [doneToast, setDoneToast] = useState(null);
  const toastTimer = useRef(null);

  const stops = itinerary[currentDay] || [];
  const base = baseFor(currentDay);

  const DONE_MESSAGES = ["איך היה? 🎉", "נהניתם? 😄", "עוד וי אחד ביום המושלם", "כל הכבוד, הלאה! 🙌", "וי! מקווים שהיה כיף"];

  function toggleDone(stopId) {
    const stop = stops.find((s) => s.id === stopId);
    const nowDone = !stop?.done;
    if (nowDone) {
      const msg = DONE_MESSAGES[Math.floor(Math.random() * DONE_MESSAGES.length)];
      setDoneToast({ id: Date.now(), text: msg });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setDoneToast(null), 2600);
    }
    setItinerary((prev) => ({
      ...prev,
      [currentDay]: prev[currentDay].map((s) => (s.id === stopId ? { ...s, done: nowDone } : s)),
    }));
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function applySwap(newPlaceId) {
    setItinerary((prev) => ({
      ...prev,
      [currentDay]: prev[currentDay].map((s) => (s.id === swapTarget.id ? { ...s, placeId: newPlaceId } : s)),
    }));
    setSwapTarget(null);
  }

  function addStop() {
    if (!newStop.time) return;
    setItinerary((prev) => ({
      ...prev,
      [currentDay]: [...(prev[currentDay] || []), { id: `s${Date.now()}`, time: newStop.time, placeId: newStop.placeId, done: false }].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setAddOpen(false);
    setNewStop({ time: "", placeId: PLACES[0].id });
  }

  const rainySoon = weather?.rain && stops.some((s) => !placeById(s.placeId)?.indoor);

  return (
    <div className="fk-content">
      <div className="fk-card">
        <div className="fk-daystrip">
          {TRIP_DATES.map((d) => (
            <div key={d} className={`fk-daychip ${d === currentDay ? "active" : ""}`} onClick={() => setCurrentDay(d)}>
              <div className="wd">{weekdayLetter(d)}</div>
              <div className="dn">{d}</div>
            </div>
          ))}
        </div>
        <div className="fk-muted" style={{ marginTop: 10 }}>📍 {base.he}</div>
      </div>

      {stops.length === 0 && <div className="fk-muted" style={{ textAlign: "center" }}>{emptyDayNote(currentDay)}</div>}

      {stops.map((s, i) => {
        const p = placeById(s.placeId);
        const isFood = p?.category === "restaurant";
        return (
          <React.Fragment key={s.id}>
            {isFood && <div className="fk-section-label">🍽️ המלצת אוכל · קרוב, מתאים למשפחה</div>}
            <div className={`fk-card ${isFood ? "fk-food" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className={`fk-chk ${s.done ? "done" : ""}`} onClick={() => toggleDone(s.id)} />
                  <div>
                    <div className="fk-strong">{s.time}</div>
                    <div className="fk-eng" style={{ fontWeight: 600, fontSize: 13.5, color: "#1F3A5F" }}>{p?.nameEn}</div>
                  </div>
                </div>
                <button className="fk-swapbtn" onClick={() => setSwapTarget(s)}>↻ החלף</button>
              </div>
              <div className="fk-muted" style={{ marginTop: 6 }}>
                {isFood ? p?.tagHe : `דירוג ${p?.rating} · ${p?.indoor ? "חוויה בתוך מבנה" : "בחוץ"}`}
              </div>
            </div>
            {i < stops.length - 1 && (() => {
              const next = placeById(stops[i + 1].placeId);
              if (!p || !next) return null;
              const meters = haversine(p.lat, p.lng, next.lat, next.lng);
              return <div className="fk-connector">↓ הליכה {walkMinutes(meters)} דק' ({formatDistance(meters)})</div>;
            })()}
          </React.Fragment>
        );
      })}

      {rainySoon && (
        <div className="fk-alertcard">
          <div className="fk-alertstripe" />
          <div className="fk-alertbody">
            <div className="fk-strong" style={{ fontSize: 13.5 }}>☔ יורד גשם — יש פעילות חוץ היום</div>
            <div className="fk-muted">לחצו "החלף" ליד הפעילות כדי לראות חלופות בתוך מבנה</div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fk-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="fk-strong" style={{ fontSize: 13 }}>הוסף פעילות</div>
          <input className="fk-input" type="time" value={newStop.time} onChange={(e) => setNewStop((n) => ({ ...n, time: e.target.value }))} />
          <select className="fk-input" value={newStop.placeId} onChange={(e) => setNewStop((n) => ({ ...n, placeId: e.target.value }))}>
            {PLACES.map((p) => <option key={p.id} value={p.id}>{p.nameEn}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="fk-pillbtn navy" style={{ flex: 1 }} onClick={addStop}>הוסף</button>
            <button className="fk-pillbtn white" style={{ flex: 1 }} onClick={() => setAddOpen(false)}>ביטול</button>
          </div>
        </div>
      )}

      <div className="fk-fab" onClick={() => setAddOpen((v) => !v)}>+</div>
      <SwapModal swapTarget={swapTarget} onClose={() => setSwapTarget(null)} onSelect={applySwap} weather={weather} />
      {doneToast && <div className="fk-donetoast" key={doneToast.id}>{doneToast.text}</div>}
    </div>
  );
}

/* ============================================================
   NEAR ME SCREEN
   ============================================================ */

function AddToItineraryModal({ place, itinerary, setItinerary, onClose }) {
  const [mode, setMode] = useState("new");
  const [day, setDay] = useState(TRIP_DATES[0]);
  const [time, setTime] = useState("12:00");
  const [replaceStopId, setReplaceStopId] = useState("");

  if (!place) return null;
  const dayStops = itinerary[day] || [];

  function confirmNew() {
    if (!time) return;
    setItinerary((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { id: `s${Date.now()}`, time, placeId: place.id, done: false }].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    onClose();
  }
  function confirmReplace() {
    if (!replaceStopId) return;
    setItinerary((prev) => ({
      ...prev,
      [day]: prev[day].map((s) => (s.id === replaceStopId ? { ...s, placeId: place.id } : s)),
    }));
    onClose();
  }

  return (
    <div className="fk-dimmer" onClick={onClose}>
      <div className="fk-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#D8CFBB", alignSelf: "center" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="fk-strong" style={{ fontSize: 15 }}>הוסף ליומן</div>
            <div className="fk-muted fk-eng">{place.nameEn}</div>
          </div>
          <div className="fk-closex" onClick={onClose}>✕</div>
        </div>

        <div className="fk-toggle">
          <div className={`fk-toggleopt ${mode === "new" ? "active" : ""}`} onClick={() => setMode("new")}>עצירה חדשה</div>
          <div className={`fk-toggleopt ${mode === "replace" ? "active" : ""}`} onClick={() => setMode("replace")}>החלף עצירה קיימת</div>
        </div>

        <select className="fk-input" value={day} onChange={(e) => { setDay(Number(e.target.value)); setReplaceStopId(""); }}>
          {TRIP_DATES.map((d) => <option key={d} value={d}>{d}.9</option>)}
        </select>

        {mode === "new" ? (
          <>
            <input className="fk-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <button className="fk-pillbtn navy" onClick={confirmNew}>הוסף כעצירה חדשה</button>
          </>
        ) : (
          <>
            {dayStops.length === 0 && <div className="fk-muted" style={{ textAlign: "center" }}>אין עדיין עצירות ביום הזה להחלפה</div>}
            {dayStops.map((s) => {
              const p2 = placeById(s.placeId);
              const sel = replaceStopId === s.id;
              return (
                <div key={s.id} className="fk-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: sel ? "#FFE9C7" : "#fff" }} onClick={() => setReplaceStopId(s.id)}>
                  <div>
                    <div className="fk-strong" style={{ fontSize: 13 }}>{s.time}</div>
                    <div className="fk-eng" style={{ fontSize: 12.5, fontWeight: 600, color: "#1F3A5F" }}>{p2?.nameEn}</div>
                  </div>
                  <div className="fk-chk" style={sel ? { background: "#F2B705" } : {}} />
                </div>
              );
            })}
            <button className="fk-pillbtn red" disabled={!replaceStopId} style={{ opacity: replaceStopId ? 1 : 0.5 }} onClick={confirmReplace}>החלף</button>
          </>
        )}
      </div>
    </div>
  );
}

function NearMeScreen({ weather, itinerary, setItinerary }) {
  const [filter, setFilter] = useState("attraction");
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [manualText, setManualText] = useState("");
  const [addTarget, setAddTarget] = useState(null);

  function locate() {
    setGeoStatus("locating");
    if (!navigator.geolocation) {
      setCoords({ lat: 51.5080, lng: -0.1281 });
      setGeoStatus("fallback");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("ok"); },
      () => { setGeoStatus("denied"); },
      { timeout: 6000 }
    );
  }

  async function locateManual() {
    if (!manualText.trim()) return;
    setGeoStatus("locating");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(manualText + ", London, UK")}`);
      const data = await res.json();
      if (data && data[0]) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setGeoStatus("manual");
      } else {
        setGeoStatus("manualfail");
      }
    } catch {
      setGeoStatus("manualfail");
    }
  }

  const list = useMemo(() => {
    const base = coords || { lat: 51.5080, lng: -0.1281 };
    return PLACES.filter((p) => {
      if (filter === "attraction") return p.category === "attraction";
      return p.category === "restaurant" && p.foodType === filter;
    })
      .map((p) => ({ ...p, dist: haversine(base.lat, base.lng, p.lat, p.lng) }))
      .sort((a, b) => a.dist - b.dist);
  }, [filter, coords]);

  return (
    <div className="fk-content">
      <WeatherStrip weather={weather} />
      <button className="fk-pillbtn red" onClick={locate}>
        📍 {geoStatus === "locating" ? "מאתר מיקום..." : "מה קרוב אליי עכשיו?"}
      </button>

      {geoStatus === "denied" && <div className="fk-muted" style={{ textAlign: "center" }}>לא הצלחתי לקבל מיקום — אפשר להקליד למטה איפה אתם נמצאים</div>}
      {geoStatus === "manualfail" && <div className="fk-muted" style={{ textAlign: "center" }}>לא מצאתי את המקום הזה — נסו לנסח אחרת (למשל שם רחוב או אטרקציה ידועה)</div>}
      {geoStatus === "manual" && <div className="fk-muted" style={{ textAlign: "center" }}>מציג מרחקים לפי "{manualText}"</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <input className="fk-input" placeholder="או הקלידו איפה אתם נמצאים..." value={manualText} onChange={(e) => setManualText(e.target.value)} />
        <button className="fk-pillbtn white" style={{ padding: "9px 14px", fontSize: 12.5, boxShadow: "none" }} onClick={locateManual}>אתר</button>
      </div>

      <div className="fk-toggle">
        <div className={`fk-toggleopt ${filter === "restaurant" ? "active" : ""}`} onClick={() => setFilter("restaurant")}>מסעדות</div>
        <div className={`fk-toggleopt ${filter === "cafe" ? "active" : ""}`} onClick={() => setFilter("cafe")}>בתי קפה</div>
        <div className={`fk-toggleopt ${filter === "attraction" ? "active" : ""}`} onClick={() => setFilter("attraction")}>אטרקציות</div>
      </div>

      {list.map((p) => {
        const good = weather?.rain ? p.indoor : true;
        const isFood = p.category === "restaurant";
        return (
          <div key={p.id} className={`fk-card ${isFood ? "fk-food" : ""}`} style={{ cursor: "pointer" }} onClick={() => setAddTarget(p)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="fk-strong fk-eng" style={{ fontSize: 14 }}>{p.nameEn}</div>
                <div className="fk-tag">{p.tagHe}{p.rating ? ` · ${p.rating}★` : ""}</div>
              </div>
              <div className="fk-badge">{formatDistance(p.dist)}</div>
            </div>
            {weather?.rain && (
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, color: good ? "#3E7A4A" : "#B5442B" }}>
                {good ? "☂️ מתאים למזג האוויר עכשיו" : "⚠️ יורד גשם — שקלו לדחות"}
              </div>
            )}
            {isFood && (
              <a className="fk-pillbtn white" style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, padding: "6px 10px", textDecoration: "none" }}
                 href={`https://www.google.com/search?q=${encodeURIComponent(p.nameEn + " London reviews")}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                🔍 חפש ביקורות בגוגל
              </a>
            )}
            <div className="fk-muted" style={{ marginTop: 6 }}>{walkMinutes(p.dist)} דק' הליכה · הקש כדי להוסיף ליומן</div>
          </div>
        );
      })}

      <AddToItineraryModal place={addTarget} itinerary={itinerary} setItinerary={setItinerary} onClose={() => setAddTarget(null)} />
    </div>
  );
}

/* ============================================================
   BACKLOG SCREEN
   ============================================================ */

function BacklogScreen({ itinerary, setItinerary, simToday, currentDay, setCurrentDay }) {
  const items = [];
  TRIP_DATES.forEach((d) => {
    if (d < simToday) {
      (itinerary[d] || []).forEach((s) => {
        if (!s.done) items.push({ day: d, stop: s });
      });
    }
  });

  function reschedule(day, stopId, targetDay) {
    setItinerary((prev) => {
      const stop = prev[day].find((s) => s.id === stopId);
      return {
        ...prev,
        [day]: prev[day].filter((s) => s.id !== stopId),
        [targetDay]: [...(prev[targetDay] || []), stop],
      };
    });
  }

  return (
    <div className="fk-content">
      {items.length === 0 && <div className="fk-muted" style={{ textAlign: "center" }}>מחסן האטרקציות ריק — כל הכבוד! 🎉</div>}
      {items.map(({ day, stop }) => {
        const p = placeById(stop.placeId);
        return (
          <div key={stop.id} className="fk-card">
            <div className="fk-strong fk-eng" style={{ fontSize: 14.5 }}>{p?.nameEn}</div>
            <div className="fk-muted">היה מתוכנן ליום {day}.9 · לא סומן כבוצע</div>
            <select className="fk-input" style={{ marginTop: 8 }} onChange={(e) => e.target.value && reschedule(day, stop.id, Number(e.target.value))} defaultValue="">
              <option value="" disabled>שבץ ליום אחר...</option>
              {TRIP_DATES.filter((d) => d >= simToday).map((d) => <option key={d} value={d}>{d}.9</option>)}
            </select>
          </div>
        );
      })}
      <div className="fk-muted" style={{ textAlign: "center", marginTop: 6 }}>פריטים נכנסים לכאן אוטומטית כשהיום שלהם עובר בלי סימון</div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

function computeToday() {
  // During the actual trip (Sep 2026) this reflects the real device date.
  // Before/after the trip window it falls back to day 1, since there is no "today" to show yet.
  const now = new Date();
  if (now.getFullYear() === 2026 && now.getMonth() === 8 && now.getDate() >= 15 && now.getDate() <= 27) {
    return now.getDate();
  }
  return 15;
}

export default function FinkelsteinLondonApp() {
  const [tab, setTabRaw] = useState("home");
  const [itinerary, setItinerary] = useState(loadItinerary);
  const today = useMemo(() => computeToday(), []);
  const [currentDay, setCurrentDay] = useState(today);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify(itinerary));
    } catch {
      // storage unavailable (private mode / quota) — trip continues without persistence
    }
  }, [itinerary]);

  const setTab = useCallback((t) => {
    if (t === "home") setCurrentDay(today); // returning home always snaps the itinerary back to today
    setTabRaw(t);
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current=temperature_2m,precipitation,weather_code&hourly=temperature_2m,weather_code&timezone=Europe%2FLondon&forecast_days=2")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const cur = data.current;
        const code = cur.weather_code;
        const times = data.hourly.time;
        const currentHourStr = cur.time.slice(0, 13) + ":00";
        let idx = times.indexOf(currentHourStr);
        if (idx < 0) idx = 0;
        const hourly = times.slice(idx + 1, idx + 5).map((t, i) => ({
          time: t.slice(11, 16),
          temp: data.hourly.temperature_2m[idx + 1 + i],
          code: data.hourly.weather_code[idx + 1 + i],
        }));
        setWeather({
          temp: cur.temperature_2m,
          code,
          rain: isRainCode(code) || cur.precipitation > 0,
          desc: weatherDesc(code),
          time: cur.time.slice(11, 16),
          hourly,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setWeather({
            temp: 17, code: 61, rain: true, desc: "גשם קל", time: "14:00",
            hourly: [{ time: "15:00", temp: 16, code: 61 }, { time: "16:00", temp: 16, code: 61 }, { time: "17:00", temp: 15, code: 3 }, { time: "18:00", temp: 15, code: 3 }],
          });
        }
      });
    return () => { cancelled = true; };
  }, []);

  const tagFor = { home: null, itinerary: "תכנון יומי", nearme: "קרוב אליי", backlog: "מחסן האטרקציות" };

  return (
    <div className="fk-root">
      <style>{CSS}</style>
      <div className="fk-phone">
        <Header tag={tagFor[tab]} />
        {tab === "home" && <HomeScreen weather={weather} setTab={setTab} itinerary={itinerary} today={today} />}
        {tab === "itinerary" && <ItineraryScreen itinerary={itinerary} setItinerary={setItinerary} currentDay={currentDay} setCurrentDay={setCurrentDay} weather={weather} />}
        {tab === "nearme" && <NearMeScreen weather={weather} itinerary={itinerary} setItinerary={setItinerary} />}
        {tab === "backlog" && <BacklogScreen itinerary={itinerary} setItinerary={setItinerary} simToday={today} currentDay={currentDay} setCurrentDay={setCurrentDay} />}
        <TabBar tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}
