import { useState, useEffect, useRef } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');`;

const ADMIN_PIN = "201620";

// Claves de acceso por ejecutivo — id debe coincidir con INITIAL_DATA
const EXEC_PINS = {
  "1001": 1,  // Gerardo Salgado
  "1002": 2,  // Jose Diaz
  "1003": 3,  // Gloria Trejos
  "1004": 4,  // Christian Olivares
  "1005": 5,  // Vacante
};

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
// type: "implant" → Net Sale + Implantes
//       "sirios"  → Sirios + Sirios x3 (unidades)
//       "bio"     → Solo Net Sale
const CATS = {
  straumann:    { label: "Straumann",    color: "#2ecc71", pill: "#0d2b1a", type: "implant" },
  neodent:      { label: "Neodent",      color: "#b07fd4", pill: "#1e0e2e", type: "implant" },
  nuvo:         { label: "Nuvo",         color: "#c8a43a", pill: "#221a05", type: "implant" },
  sirios:       { label: "Sirios",       color: "#e8e8e8", pill: "#1a1a1a", type: "sirios"  },
  biomateriales:{ label: "Biomateriales",color: "#5bc8f5", pill: "#05141f", type: "bio"    },
};
const CAT_KEYS = ["straumann", "neodent", "nuvo", "sirios", "biomateriales"];
const IMPLANT_KEYS = ["straumann", "neodent", "nuvo"];

const MEDALS = ["🥇", "🥈", "🥉"];
const MOTIVATIONAL = [
  "¡Imparable! Eres el top del equipo 🔥",
  "¡Tan cerca de la cima! No pares 💪",
  "¡Buen ritmo! Un último empujón ⚡",
  "¡El equipo te necesita! Dale con todo 🎯",
];

// ── DATA FACTORIES ────────────────────────────────────────────────────────────
// Net Sales en CLP miles, implantes en unidades
// Fuente: CL_Seller.pdf — sección Daniel Jordan — MTD 15/05/2026
const mkImplant = (netReal, netMeta, impReal, impMeta) => ({ netReal, netMeta, impReal, impMeta });
const mkSirios  = (sReal = 0, sMeta = 0, s3Real = 0, s3Meta = 0) => ({ sReal, sMeta, s3Real, s3Meta });
const mkBio     = (netReal, netMeta) => ({ netReal, netMeta });

const INITIAL_DATA = [
  {
    id: 1, nombre: "Gerardo Salgado", initials: "GS", region: "Centro",
    neodent:       mkImplant(9094,  74754, 66,  785),
    straumann:     mkImplant(696,   12230, 14,  50),
    nuvo:          mkImplant(492,   569,   0,   10),
    sirios:        mkSirios(0, 0, 0, 0),
    biomateriales: mkBio(351, 8890),
  },
  {
    id: 2, nombre: "Jose Diaz", initials: "JD", region: "Sur",
    neodent:       mkImplant(4086,  15572, 38,  150),
    straumann:     mkImplant(2687,  8305,  7,   40),
    nuvo:          mkImplant(0,     1153,  0,   20),
    sirios:        mkSirios(0, 0, 0, 0),
    biomateriales: mkBio(435, 702),
  },
  {
    id: 3, nombre: "Gloria Trejos", initials: "GT", region: "Norte",
    neodent:       mkImplant(2133,  15767, 7,   125),
    straumann:     mkImplant(1044,  5152,  3,   25),
    nuvo:          mkImplant(59,    1166,  0,   20),
    sirios:        mkSirios(0, 0, 0, 0),
    biomateriales: mkBio(1252, 2386),
  },
  {
    id: 4, nombre: "Christian Olivares", initials: "CO", region: "Centro",
    neodent:       mkImplant(16029, 43140, 143, 400),
    straumann:     mkImplant(3744,  39727, 11,  180),
    nuvo:          mkImplant(1078,  603,   20,  10),
    sirios:        mkSirios(0, 0, 0, 0),
    biomateriales: mkBio(3150, 6837),
  },
  {
    id: 5, nombre: "Vacante", initials: "V1", region: "—", vacante: true,
    neodent:       mkImplant(5905,  19738, 56,  200),
    straumann:     mkImplant(229,   7008,  2,   30),
    nuvo:          mkImplant(0,     584,   0,   10),
    sirios:        mkSirios(0, 0, 0, 0),
    biomateriales: mkBio(1618, 6591),
  },
];

// ── PONDERACIÓN RANKING ───────────────────────────────────────────────────────
// Solo estas 3 marcas entran al score · solo Net Sale · Bio y Sirios son referenciales
const WEIGHTS = { neodent: 0.65, straumann: 0.25, nuvo: 0.10 };
const RANKING_KEYS = ["neodent", "straumann", "nuvo"];

// ── UTILS ─────────────────────────────────────────────────────────────────────
function pct(real, meta)  { return meta ? Math.round((real / meta) * 100) : 0; }
function gap(real, meta)  { return Math.max(meta - real, 0); }
function semColor(p) {
  if (p >= 100) return "#2ecc71";
  if (p >= 80)  return "#f0c040";
  return "#e74c3c";
}

// Score de una categoría individual (para mostrar en cards/detalle)
// implant → solo Net Sale para ranking; volumen siempre referencial
function catScore(c, key) {
  const cfg = CATS[key];
  if (cfg.type === "implant") {
    const b = c[key];
    return b.netMeta > 0 ? pct(b.netReal, b.netMeta) : 0;
  }
  if (cfg.type === "sirios") {
    const b = c[key];
    const metrics = [];
    if (b.sMeta  > 0) metrics.push(pct(b.sReal,  b.sMeta));
    if (b.s3Meta > 0) metrics.push(pct(b.s3Real, b.s3Meta));
    return metrics.length ? Math.round(metrics.reduce((a, v) => a + v, 0) / metrics.length) : 0;
  }
  if (cfg.type === "bio") {
    const b = c[key];
    return b.netMeta > 0 ? pct(b.netReal, b.netMeta) : 0;
  }
  return 0;
}

function catHasMeta(c, key) {
  const cfg = CATS[key];
  if (cfg.type === "implant") { return c[key].netMeta > 0; }
  if (cfg.type === "sirios")  { const b = c[key]; return b.sMeta > 0 || b.s3Meta > 0; }
  if (cfg.type === "bio")     { return c[key].netMeta > 0; }
  return false;
}

// Score total ponderado — solo Neodent 65% · Straumann 25% · Nuvo 10% · solo Net Sale
function totalScore(c) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of RANKING_KEYS) {
    const b = c[key];
    if (b.netMeta > 0) {
      weightedSum += pct(b.netReal, b.netMeta) * WEIGHTS[key];
      totalWeight += WEIGHTS[key];
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ── ANIMATED NUMBER ───────────────────────────────────────────────────────────
function AnimNum({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    clearInterval(ref.current);
    const start = display, diff = value - start, steps = 28;
    let i = 0;
    ref.current = setInterval(() => {
      i++;
      setDisplay(Math.round(start + diff * (i / steps)));
      if (i >= steps) clearInterval(ref.current);
    }, 16);
    return () => clearInterval(ref.current);
  }, [value]);
  return <span>{display.toLocaleString("es-CL")}{suffix}</span>;
}

// ── MINI BAR ──────────────────────────────────────────────────────────────────
function MiniBar({ real, meta }) {
  const p  = meta ? Math.min((real / meta) * 100, 100) : 0;
  const sc = semColor(pct(real, meta));
  return (
    <div style={{ background: "#ffffff12", borderRadius: 3, height: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${p}%`, background: sc, borderRadius: 3, transition: "width 1s ease" }} />
    </div>
  );
}

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
function DetailModal({ consultor, rank, onClose }) {
  const [tab, setTab] = useState("straumann");
  const score = totalScore(consultor);
  const sc    = semColor(score);
  const msg   = MOTIVATIONAL[rank] || "¡Dale con todo! 🚀";
  const cfg   = CATS[tab];

  function renderMetrics() {
    if (cfg.type === "implant") {
      const b    = consultor[tab];
      const pNet = pct(b.netReal, b.netMeta);
      const pImp = pct(b.impReal, b.impMeta);
      return (
        <>
          <MetricBlock label="Net Sale" real={`$${b.netReal}M`} meta={`$${b.netMeta}M`} p={pNet} gapVal={gap(b.netReal, b.netMeta)} gapFmt={v => `$${v}M`} />
          <MetricBlock label="Implantes" real={b.impReal} meta={b.impMeta} p={pImp} gapVal={gap(b.impReal, b.impMeta)} gapFmt={v => `${v} u`} />
        </>
      );
    }
    if (cfg.type === "sirios") {
      const b   = consultor[tab];
      const ps  = pct(b.sReal,  b.sMeta);
      const ps3 = pct(b.s3Real, b.s3Meta);
      return (
        <>
          <MetricBlock label="Sirios"    real={`${b.sReal} u`}  meta={`${b.sMeta} u`}  p={ps}  gapVal={gap(b.sReal, b.sMeta)}   gapFmt={v => `${v} u`} />
          <MetricBlock label="Sirios x3" real={`${b.s3Real} u`} meta={`${b.s3Meta} u`} p={ps3} gapVal={gap(b.s3Real, b.s3Meta)} gapFmt={v => `${v} u`} />
        </>
      );
    }
    if (cfg.type === "bio") {
      const b   = consultor[tab];
      const pN  = pct(b.netReal, b.netMeta);
      return <MetricBlock label="Net Sale" real={`$${b.netReal}M`} meta={`$${b.netMeta}M`} p={pN} gapVal={gap(b.netReal, b.netMeta)} gapFmt={v => `$${v}M`} />;
    }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(6px)", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#161622", borderRadius: 22,
        padding: "24px 20px", width: "100%", maxWidth: 400,
        border: `1px solid ${sc}44`,
        boxShadow: `0 0 50px ${sc}18`,
        animation: "popIn 0.25s cubic-bezier(.34,1.56,.64,1) both",
        position: "relative", maxHeight: "90vh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 14,
          background: "none", border: "none", color: "#666", fontSize: 22, cursor: "pointer",
        }}>×</button>

        {/* header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 38 }}>{MEDALS[rank] || `#${rank + 1}`}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: "#fff", letterSpacing: 2 }}>{consultor.nombre}</div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 1 }}>{consultor.region}</div>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, background: `${sc}15`, border: `1px solid ${sc}30`, borderRadius: 30, padding: "4px 14px" }}>
            <span style={{ fontSize: 11, color: "#666" }}>Score total</span>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: sc, letterSpacing: 1 }}><AnimNum value={score} suffix="%" /></span>
          </div>
        </div>

        {/* cat tabs — 2 rows */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#1e1e2e", borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {CAT_KEYS.map(key => {
            const c = CATS[key];
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: "1 1 auto",
                background: tab === key ? c.color : "transparent",
                color: tab === key ? "#111" : "#555",
                border: "none", borderRadius: 7, padding: "6px 6px",
                fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 0.8,
                cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
              }}>{c.label}</button>
            );
          })}
        </div>

        {/* score badge for current tab */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: semColor(catScore(consultor, tab)), letterSpacing: 1 }}>
            <AnimNum value={catScore(consultor, tab)} suffix="%" />
          </span>
        </div>

        {renderMetrics()}

        {/* motivacional */}
        <div style={{
          background: `${sc}12`, border: `1px solid ${sc}28`,
          borderRadius: 10, padding: "10px 14px", marginTop: 14,
          color: sc, fontSize: 13, textAlign: "center", fontWeight: 600,
        }}>{msg}</div>
      </div>
    </div>
  );
}

function MetricBlock({ label, real, meta, p, gapVal, gapFmt }) {
  const sc = semColor(p);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: sc, letterSpacing: 1 }}><AnimNum value={p} suffix="%" /></span>
      </div>
      <div style={{ background: "#1e1e30", borderRadius: 5, height: 7, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ height: "100%", width: `${Math.min(p, 100)}%`, background: `linear-gradient(90deg, ${sc}88, ${sc})`, borderRadius: 5, transition: "width 1s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ color: "#888" }}>Real: <strong style={{ color: "#ddd" }}>{real}</strong></span>
        <span style={{ color: "#888" }}>Meta: <strong style={{ color: "#ddd" }}>{meta}</strong></span>
        <span style={{ color: gapVal > 0 ? "#e74c3c" : "#2ecc71", fontWeight: 600 }}>
          {gapVal > 0 ? `-${gapFmt(gapVal)}` : "✓"}
        </span>
      </div>
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function AdminPanel({ data, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(data)));
  const [tab, setTab]     = useState("straumann");
  const cfg = CATS[tab];

  function update(id, field, val) {
    setLocal(prev => prev.map(c =>
      c.id === id ? { ...c, [tab]: { ...c[tab], [field]: Number(val) || 0 } } : c
    ));
  }

  const fields = {
    implant: [
      { field: "netReal", label: "Net Real $M" },
      { field: "netMeta", label: "Net Meta $M" },
      { field: "impReal", label: "Imp Real" },
      { field: "impMeta", label: "Imp Meta" },
    ],
    sirios: [
      { field: "sReal",  label: "Sirios R" },
      { field: "sMeta",  label: "Sirios M" },
      { field: "s3Real", label: "x3 Real" },
      { field: "s3Meta", label: "x3 Meta" },
    ],
    bio: [
      { field: "netReal", label: "Net Real" },
      { field: "netMeta", label: "Net Meta" },
    ],
  };
  const flds = fields[cfg.type];

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, backdropFilter: "blur(8px)", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#161622", borderRadius: 20, padding: "22px 18px",
        width: "100%", maxWidth: 520,
        border: `1px solid ${cfg.color}33`,
        animation: "popIn 0.25s cubic-bezier(.34,1.56,.64,1) both",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "#fff", letterSpacing: 2 }}>⚙️ Admin · Actualizar Datos</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* cat tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", background: "#1e1e2e", borderRadius: 10, padding: 3, gap: 3, marginBottom: 14 }}>
          {CAT_KEYS.map(key => {
            const c = CATS[key];
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: "1 1 auto",
                background: tab === key ? c.color : "transparent",
                color: tab === key ? "#111" : "#555",
                border: "none", borderRadius: 7, padding: "6px 4px",
                fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 0.8,
                cursor: "pointer", transition: "all 0.2s",
              }}>{c.label}</button>
            );
          })}
        </div>

        {/* column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `1fr ${flds.map(() => "72px").join(" ")}`,
          gap: 6, marginBottom: 6, paddingLeft: 4,
        }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase" }}>Consultor</div>
          {flds.map(f => <div key={f.field} style={{ fontSize: 9, color: "#444", textTransform: "uppercase", textAlign: "center" }}>{f.label}</div>)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "50vh", overflowY: "auto" }}>
          {local.map(c => (
            <div key={c.id} style={{
              display: "grid",
              gridTemplateColumns: `1fr ${flds.map(() => "72px").join(" ")}`,
              gap: 6, alignItems: "center",
              background: "#1e1e2e", borderRadius: 10, padding: "9px 11px",
            }}>
              <div>
                <div style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>{c.initials}</div>
                <div style={{ color: "#555", fontSize: 10 }}>{c.nombre.split(" ")[0]}</div>
              </div>
              {flds.map(({ field }) => (
                <input key={field} type="number" value={c[tab][field]}
                  onChange={e => update(c.id, field, e.target.value)}
                  style={{
                    width: "100%", background: "#0d0d1a",
                    border: `1px solid ${cfg.color}22`, borderRadius: 6,
                    color: "#fff", padding: "5px 6px", fontSize: 13,
                    outline: "none", textAlign: "center",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: "#3a3a50", marginTop: 10, marginBottom: 12 }}>
          {cfg.type === "implant" && "Net en $M · Implantes en unidades"}
          {cfg.type === "sirios"  && "Sirios y Sirios x3 en unidades"}
          {cfg.type === "bio"     && "Net Sales en $M"}
        </div>

        <button onClick={() => { onSave(local); onClose(); }} style={{
          width: "100%",
          background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}88)`,
          border: "none", borderRadius: 10,
          color: "#111", fontFamily: "'Bebas Neue'",
          fontSize: 17, letterSpacing: 2,
          padding: "12px 0", cursor: "pointer",
        }}>GUARDAR RANKING</button>
      </div>
    </div>
  );
}

// ── TOTAL CARD ────────────────────────────────────────────────────────────────
function TotalCard({ c, i, onSelect, myId }) {
  const score  = totalScore(c);
  const sc     = semColor(score);
  const isTop  = i === 0;
  const isMe   = myId && c.id === myId;

  return (
    <div onClick={() => onSelect(c)} style={{
      background: isMe
        ? "linear-gradient(135deg, #1e1030 0%, #161622 100%)"
        : isTop ? "linear-gradient(135deg, #12121e 0%, #161622 100%)" : "#12121e",
      border: isMe ? `2px solid #b07fd4` : isTop ? `1px solid ${sc}30` : "1px solid #ffffff09",
      borderRadius: 16, padding: "15px 16px", cursor: "pointer",
      animation: `fadeUp 0.4s ease both`, animationDelay: `${i * 70}ms`,
      transition: "transform 0.15s, box-shadow 0.15s",
      boxShadow: isMe ? `0 0 28px #b07fd444` : isTop ? `0 0 28px ${sc}14` : "none",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isMe ? `0 8px 28px #b07fd444` : `0 8px 28px ${sc}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isMe ? `0 0 28px #b07fd444` : isTop ? `0 0 28px ${sc}14` : "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isTop ? 32 : 24, minWidth: 36, textAlign: "center",
          color: i === 0 ? "#f1c40f" : i === 1 ? "#bdc3c7" : i === 2 ? "#d4893a" : "#3a3a4a" }}>
          {MEDALS[i] || `#${i + 1}`}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
          background: `${sc}15`, border: `2px solid ${sc}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 13, color: sc }}>
          {c.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#e8e8e8", marginBottom: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
            {c.nombre}
            {c.vacante && <span style={{ fontSize: 8, background: "#2a2a3a", color: "#666", borderRadius: 10, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Vacante</span>}
            {isMe && <span style={{ fontSize: 8, background: "#b07fd4", color: "#fff", borderRadius: 10, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Tú</span>}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CAT_KEYS.map(bk => {
              const bs   = catScore(c, bk);
              const bsc  = semColor(bs);
              const bcfg = CATS[bk];
              const isRef = !RANKING_KEYS.includes(bk);
              const weight = WEIGHTS[bk] ? `${Math.round(WEIGHTS[bk]*100)}%` : "Ref.";
              return (
                <div key={bk} style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: isRef ? "#ffffff04" : "#ffffff07",
                  border: `1px solid ${isRef ? "#2a2a3a" : bcfg.color + "20"}`,
                  borderRadius: 20, padding: "2px 7px",
                  opacity: isRef ? 0.5 : 1,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: isRef ? "#3a3a4a" : bcfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 0.3 }}>{bcfg.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: isRef ? "#3a3a4a" : bsc }}>{isRef ? "Ref." : `${bs}%`}</span>
                  {!isRef && <span style={{ fontSize: 7, color: "#444" }}>·{weight}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: sc, textShadow: `0 0 16px ${sc}44`, letterSpacing: 1, minWidth: 54, textAlign: "right" }}>
          <AnimNum value={score} suffix="%" />
        </div>
      </div>
    </div>
  );
}

// ── BRAND CARD ────────────────────────────────────────────────────────────────
function BrandCard({ c, i, cat, onSelect, myId }) {
  const score  = catScore(c, cat);
  const sc     = semColor(score);
  const cfg    = CATS[cat];
  const isTop  = i === 0;
  const isMe   = myId && c.id === myId;

  function renderBars() {
    if (cfg.type === "implant") {
      const b = c[cat];
      return (
        <>
          <BarRow label="Net" real={b.netReal} meta={b.netMeta} />
          <BarRow label="Imp" real={b.impReal} meta={b.impMeta} />
        </>
      );
    }
    if (cfg.type === "sirios") {
      const b = c[cat];
      return (
        <>
          <BarRow label="Sirios" real={b.sReal}  meta={b.sMeta}  />
          <BarRow label="x3"     real={b.s3Real} meta={b.s3Meta} />
        </>
      );
    }
    if (cfg.type === "bio") {
      const b = c[cat];
      return <BarRow label="Net" real={b.netReal} meta={b.netMeta} />;
    }
  }

  return (
    <div onClick={() => onSelect(c)} style={{
      background: isMe
        ? "linear-gradient(135deg, #1e1030 0%, #12121e 100%)"
        : isTop ? `linear-gradient(135deg, ${cfg.pill} 0%, #12121e 100%)` : "#12121e",
      border: isMe ? `2px solid #b07fd4` : isTop ? `1px solid ${cfg.color}28` : "1px solid #ffffff07",
      borderRadius: 16, padding: "15px 16px", cursor: "pointer",
      animation: `fadeUp 0.4s ease both`, animationDelay: `${i * 70}ms`,
      transition: "transform 0.15s, box-shadow 0.15s",
      boxShadow: isMe ? `0 0 28px #b07fd444` : isTop ? `0 0 28px ${cfg.color}12` : "none",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isMe ? `0 8px 28px #b07fd444` : `0 8px 28px ${sc}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isMe ? `0 0 28px #b07fd444` : isTop ? `0 0 28px ${cfg.color}12` : "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isTop ? 32 : 24, minWidth: 36, textAlign: "center",
          color: i === 0 ? "#f1c40f" : i === 1 ? "#bdc3c7" : i === 2 ? "#d4893a" : "#3a3a4a" }}>
          {MEDALS[i] || `#${i + 1}`}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
          background: `${sc}15`, border: `2px solid ${sc}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 13, color: sc }}>
          {c.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#e8e8e8", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
            {c.nombre}
            {c.vacante && <span style={{ fontSize: 8, background: "#2a2a3a", color: "#666", borderRadius: 10, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Vacante</span>}
            {isMe && <span style={{ fontSize: 8, background: "#b07fd4", color: "#fff", borderRadius: 10, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Tú</span>}
          </div>
          {renderBars()}
        </div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: sc, textShadow: `0 0 16px ${sc}44`, letterSpacing: 1, minWidth: 54, textAlign: "right" }}>
          <AnimNum value={score} suffix="%" />
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, real, meta }) {
  const p  = pct(real, meta);
  const sc = semColor(p);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
      <span style={{ fontSize: 8, color: "#444", width: 34, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
      <div style={{ flex: 1 }}><MiniBar real={real} meta={meta} /></div>
      <span style={{ fontSize: 9, color: sc, fontWeight: 700, minWidth: 30, textAlign: "right" }}>{p}%</span>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [data,       setData]      = useState(INITIAL_DATA);
  const [cat,        setCat]       = useState("total");
  const [selected,   setSelected]  = useState(null);
  const [showAdmin,  setShowAdmin] = useState(false);
  const [pinMode,    setPinMode]   = useState(false);
  const [pinInput,   setPinInput]  = useState("");
  const [pinError,   setPinError]  = useState(false);
  const [tapCount,   setTapCount]  = useState(0);

  // Login ejecutivo
  const [loggedIn,   setLoggedIn]  = useState(false);
  const [myId,       setMyId]      = useState(null); // id del ejecutivo logueado
  const [loginPin,   setLoginPin]  = useState("");
  const [loginError, setLoginError]= useState(false);

  function handleLogin() {
    const execId = EXEC_PINS[loginPin];
    if (execId) {
      setLoggedIn(true);
      setMyId(execId);
      setLoginError(false);
    } else if (loginPin === ADMIN_PIN) {
      // Admin también puede entrar como vista general
      setLoggedIn(true);
      setMyId(null);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  }

  const cfg    = cat === "total" ? { color: "#e8e8e8", pill: "#0d0d1a" } : CATS[cat];
  const ranked = [...data].sort((a, b) =>
    cat === "total" ? totalScore(b) - totalScore(a) : catScore(b, cat) - catScore(a, cat)
  );

  // Team KPIs
  const activeCats = cat === "total" ? CAT_KEYS : [cat];
  const teamNetReal = data.reduce((s, c) => s + activeCats.reduce((ss, k) => {
    const cfk = CATS[k]; const b = c[k];
    return ss + (cfk.type !== "sirios" ? (b.netReal || 0) : 0);
  }, 0), 0);
  const teamNetMeta = data.reduce((s, c) => s + activeCats.reduce((ss, k) => {
    const cfk = CATS[k]; const b = c[k];
    return ss + (cfk.type !== "sirios" ? (b.netMeta || 0) : 0);
  }, 0), 0);

  function handleLogoTap() {
    const n = tapCount + 1; setTapCount(n);
    if (n >= 5) { setTapCount(0); setPinMode(true); setPinError(false); setPinInput(""); }
  }
  function handlePin() {
    if (pinInput === ADMIN_PIN) { setPinMode(false); setShowAdmin(true); setPinError(false); }
    else setPinError(true);
  }

  const selRank = selected ? ranked.findIndex(c => c.id === selected.id) : -1;

  // ── PANTALLA DE LOGIN ────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        @keyframes popIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div style={{
        minHeight: "100vh", background: "radial-gradient(ellipse at top, #0d0d20 0%, #080810 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", padding: 20,
      }}>
        <div style={{
          background: "#161622", borderRadius: 24, padding: "36px 28px",
          width: "100%", maxWidth: 320, textAlign: "center",
          border: "1px solid #2a2a3a",
          animation: "popIn 0.3s cubic-bezier(.34,1.56,.64,1) both",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 10, letterSpacing: 5, color: "#2a2a3a", marginBottom: 10 }}>
            STRAUMANN GROUP CHILE
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, lineHeight: 1, marginBottom: 6,
            background: "linear-gradient(90deg, #e0e0e0, #b07fd4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            RANKING<br/>MAYO 2026
          </div>
          <div style={{ color: "#444", fontSize: 12, marginBottom: 28 }}>Ingresa tu clave de acceso</div>

          <input
            type="password"
            placeholder="● ● ● ●"
            value={loginPin}
            onChange={e => { setLoginPin(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            autoFocus
            style={{
              width: "100%", background: "#1e1e2e",
              border: `1px solid ${loginError ? "#e74c3c" : "#2a2a3a"}`,
              borderRadius: 12, color: "#fff",
              padding: "14px", fontSize: 22,
              textAlign: "center", letterSpacing: 6,
              outline: "none", marginBottom: 8,
              fontFamily: "'Bebas Neue'",
            }}
          />
          {loginError && (
            <div style={{ color: "#e74c3c", fontSize: 12, marginBottom: 10 }}>
              Clave incorrecta — contacta a Daniel
            </div>
          )}
          <button onClick={handleLogin} style={{
            width: "100%", background: "linear-gradient(90deg, #b07fd4, #7f5ea8)",
            border: "none", borderRadius: 12,
            color: "#fff", fontFamily: "'Bebas Neue'",
            fontSize: 18, letterSpacing: 2,
            padding: "13px", cursor: "pointer",
            marginTop: loginError ? 0 : 8,
          }}>ENTRAR</button>

          <div style={{ marginTop: 20, fontSize: 10, color: "#2a2a3a" }}>
            ¿No tienes clave? Solicítala a tu coordinador
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d16; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn  { from { opacity:0; transform:scale(0.88); }     to { opacity:1; transform:scale(1); } }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#0d0d16; }
        ::-webkit-scrollbar-thumb { background:#2a2a3a; border-radius:2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top, #0d0d20 0%, #080810 100%)", fontFamily: "'DM Sans', sans-serif", color: "#e0e0e0" }}>

        {/* HEADER */}
        <div style={{ padding: "24px 18px 0", textAlign: "center" }}>
          <div onClick={handleLogoTap} style={{ userSelect: "none", cursor: "default" }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 10, letterSpacing: 5, color: "#2a2a3a", marginBottom: 3 }}>STRAUMANN GROUP CHILE</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 3, lineHeight: 1,
              background: `linear-gradient(90deg, #e0e0e0 0%, ${cfg.color} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", transition: "all 0.4s" }}>
              RANKING MAYO 2026
            </div>
            <div style={{ fontSize: 9, color: "#2a2a3a", letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
              by <span style={{ color: "#3a3a4a", fontStyle: "italic", textTransform: "none", letterSpacing: 0.5 }}>Daniel Jordan</span>
            </div>
          </div>

          {/* tabs — 2 rows */}
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 14, marginBottom: 4, flexWrap: "wrap" }}>
            <button onClick={() => setCat("total")} style={{
              background: cat === "total" ? "#e0e0e0" : "#1e1e2e",
              color: cat === "total" ? "#111" : "#555",
              border: `1px solid ${cat === "total" ? "#e0e0e0" : "#ffffff0a"}`,
              borderRadius: 20, padding: "5px 14px",
              fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 1,
              cursor: "pointer", transition: "all 0.2s",
            }}>Total</button>
            {CAT_KEYS.map(key => {
              const c = CATS[key];
              return (
                <button key={key} onClick={() => setCat(key)} style={{
                  background: cat === key ? c.color : "#1e1e2e",
                  color: cat === key ? "#111" : "#555",
                  border: `1px solid ${cat === key ? c.color : "#ffffff0a"}`,
                  borderRadius: 20, padding: "5px 14px",
                  fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 1,
                  cursor: "pointer", transition: "all 0.2s",
                }}>{c.label}</button>
              );
            })}
          </div>

          {/* KPI strip */}
          {teamNetMeta > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ffffff07", border: "1px solid #ffffff0a", borderRadius: 30, padding: "6px 16px", marginBottom: 6, marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#555" }}>Net Equipo</span>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: semColor(pct(teamNetReal, teamNetMeta)), letterSpacing: 1 }}>
                <AnimNum value={pct(teamNetReal, teamNetMeta)} suffix="%" />
              </span>
              <span style={{ fontSize: 10, color: "#444" }}>${teamNetReal}M / ${teamNetMeta}M</span>
            </div>
          )}
        </div>

        {/* LIST */}
        <div style={{ padding: "10px 14px 100px", display: "flex", flexDirection: "column", gap: 9 }}>
          {ranked.map((c, i) =>
            cat === "total"
              ? <TotalCard key={c.id} c={c} i={i} onSelect={setSelected} myId={myId} />
              : <BrandCard key={c.id} c={c} i={i} cat={cat} onSelect={setSelected} myId={myId} />
          )}
        </div>

        {/* FOOTER */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, #080810)", padding: "16px 14px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#1e1e2e" }}>
            Datos MTD al 15/05/2026 · Score = Neodent 65% · Straumann 25% · Nuvo 10% · solo Net Sale
          </div>
        </div>

        {/* PIN */}
        {pinMode && (
          <div onClick={() => setPinMode(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#161622", borderRadius: 16, padding: "24px 20px", width: 260, border: "1px solid #2a2a3a", animation: "popIn 0.2s ease both" }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, marginBottom: 14, color: "#e0e0e0" }}>🔐 Acceso Admin</div>
              <input type="password" placeholder="PIN" value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                onKeyDown={e => e.key === "Enter" && handlePin()}
                autoFocus
                style={{ width: "100%", background: "#1e1e2e", border: `1px solid ${pinError ? "#e74c3c" : "#2a2a3a"}`, borderRadius: 8, color: "#e0e0e0", padding: "10px 14px", fontSize: 18, textAlign: "center", letterSpacing: 4, outline: "none", marginBottom: 6 }}
              />
              {pinError && <div style={{ color: "#e74c3c", fontSize: 11, textAlign: "center", marginBottom: 8 }}>PIN incorrecto</div>}
              <button onClick={handlePin} style={{ width: "100%", background: "#2ecc71", border: "none", borderRadius: 8, color: "#111", fontFamily: "'Bebas Neue'", fontSize: 15, letterSpacing: 2, padding: "10px", cursor: "pointer", marginTop: 4 }}>ENTRAR</button>
            </div>
          </div>
        )}

        {selected  && <DetailModal consultor={selected} rank={selRank} onClose={() => setSelected(null)} />}
        {showAdmin && <AdminPanel  data={data} onSave={d => setData(d)} onClose={() => setShowAdmin(false)} />}
      </div>
    </>
  );
}
