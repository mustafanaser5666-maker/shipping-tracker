import { useState } from "react";

// ═══════════════════════════════════════════
//  ضع بياناتك هنا بعد إنشاء البوت
// ═══════════════════════════════════════════
const TELEGRAM_CONFIG = {
  BOT_TOKEN: "YOUR_BOT_TOKEN_HERE",       // من @BotFather
  ADMIN_CHAT_ID: "YOUR_ADMIN_CHAT_ID",    // Chat ID الخاص بك
};

async function sendTelegramMessage(chatId, message) {
  if (
    TELEGRAM_CONFIG.BOT_TOKEN === "YOUR_BOT_TOKEN_HERE" ||
    !chatId
  ) return { ok: false, demo: true };

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    return await res.json();
  } catch {
    return { ok: false };
  }
}

const STATUS_META = {
  warehouse: { label: "في المخزن", emoji: "📦", color: "#f59e0b", bg: "#fef3c7" },
  office:    { label: "في مكتب",   emoji: "🏢", color: "#6366f1", bg: "#ede9fe" },
  transit:   { label: "في الطريق", emoji: "🚚", color: "#0ea5e9", bg: "#e0f2fe" },
  delivered: { label: "تم التسليم",emoji: "✅", color: "#16a34a", bg: "#dcfce7" },
};

const INITIAL_SHIPMENTS = [
  { id: "8161", date: "2026-06-04", amount: 12500, weight: 1.2, status: "warehouse", clientName: "أحمد محمد", clientChatId: "", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
  { id: "8162", date: "2026-06-04", amount: 8000,  weight: 0.8, status: "warehouse", clientName: "سارة علي",   clientChatId: "", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
  { id: "7991", date: "2026-05-28", amount: 15000, weight: 2.1, status: "office",    clientName: "كريم حسن",   clientChatId: "", image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&q=80" },
  { id: "7845", date: "2026-05-20", amount: 5500,  weight: 3.5, status: "transit",   clientName: "نور عباس",   clientChatId: "", image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&q=80" },
];

// ═══════════════ MAIN APP ═══════════════
export default function App() {
  const [view, setView] = useState("client"); // client | admin | settings
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [config, setConfig] = useState(TELEGRAM_CONFIG);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateShipmentStatus = async (id, newStatus) => {
    const s = shipments.find((x) => x.id === id);
    const oldStatus = s.status;
    if (oldStatus === newStatus) return;

    setShipments((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x))
    );

    const meta = STATUS_META[newStatus];

    // إشعار للعميل
    if (s.clientChatId) {
      const clientMsg =
        `📬 <b>تحديث شحنتك</b>\n\n` +
        `رقم الشحنة: <code>${s.id}</code>\n` +
        `الحالة الجديدة: ${meta.emoji} <b>${meta.label}</b>\n` +
        `التاريخ: ${new Date().toLocaleDateString("ar-IQ")}\n\n` +
        `شكراً لثقتك بنا 🙏`;
      await sendTelegramMessage(s.clientChatId, clientMsg);
    }

    // إشعار للمسؤول
    const adminMsg =
      `⚙️ <b>تغيير حالة شحنة</b>\n\n` +
      `رقم الشحنة: <code>${s.id}</code>\n` +
      `العميل: ${s.clientName}\n` +
      `من: ${STATUS_META[oldStatus].label}\n` +
      `إلى: ${meta.emoji} ${meta.label}\n` +
      `الوقت: ${new Date().toLocaleTimeString("ar-IQ")}`;
    const res = await sendTelegramMessage(config.ADMIN_CHAT_ID, adminMsg);

    if (res.demo) {
      showToast("⚠️ وضع تجريبي — أضف Bot Token لإرسال حقيقي", "warn");
    } else if (res.ok) {
      showToast("✅ تم تغيير الحالة وإرسال الإشعار");
    } else {
      showToast("تم التغيير — فشل إرسال Telegram", "warn");
    }
  };

  const addShipment = async (newS) => {
    setShipments((prev) => [newS, ...prev]);

    // إشعار للمسؤول عند إضافة شحنة
    const adminMsg =
      `🆕 <b>شحنة جديدة!</b>\n\n` +
      `رقم الشحنة: <code>${newS.id}</code>\n` +
      `العميل: ${newS.clientName}\n` +
      `الوزن: ${newS.weight} كغ\n` +
      `المبلغ: ${newS.amount.toLocaleString()} د.ع\n` +
      `التاريخ: ${newS.date}`;
    const res = await sendTelegramMessage(config.ADMIN_CHAT_ID, adminMsg);

    if (res.demo) showToast("⚠️ وضع تجريبي — أضف Bot Token", "warn");
    else if (res.ok) showToast("✅ تمت إضافة الشحنة وإرسال الإشعار");
    else showToast("تمت الإضافة — تحقق من Bot Token", "warn");
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: "#f1f5f9", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "warn" ? "#f59e0b" : "#16a34a",
          color: "#fff", padding: "10px 20px", borderRadius: 12,
          fontWeight: 700, fontSize: 13, zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideDown .3s ease",
        }}>{toast.msg}</div>
      )}

      {/* Nav */}
      <div style={{
        background: "#0f172a",
        display: "flex",
        borderBottom: "2px solid #1e293b",
      }}>
        {[
          { key: "client",   label: "واجهة العميل", icon: "👤" },
          { key: "admin",    label: "لوحة التحكم",  icon: "⚙️" },
          { key: "settings", label: "الإعدادات",    icon: "🤖" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setView(tab.key)} style={{
            flex: 1, padding: "12px 4px", border: "none",
            background: view === tab.key ? "#1e40af" : "transparent",
            color: view === tab.key ? "#fff" : "#94a3b8",
            fontWeight: 700, fontSize: 12,
            fontFamily: "'Cairo', sans-serif", cursor: "pointer",
            borderBottom: view === tab.key ? "2px solid #60a5fa" : "2px solid transparent",
            transition: "all .2s",
          }}>
            <div style={{ fontSize: 18 }}>{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </div>

      {view === "client"   && <ClientView shipments={shipments} />}
      {view === "admin"    && <AdminView shipments={shipments} onStatusChange={updateShipmentStatus} onAdd={addShipment} />}
      {view === "settings" && <SettingsView config={config} setConfig={setConfig} showToast={showToast} />}

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  );
}

// ═══════════════ CLIENT VIEW ═══════════════
function ClientView({ shipments }) {
  const [activeTab, setActiveTab] = useState("warehouse");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const filtered = shipments.filter((s) => s.status === activeTab);
  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((k) => [k, shipments.filter((s) => s.status === k).length])
  );
  const totalAmount = filtered.reduce((a, s) => a + s.amount, 0);
  const totalWeight = filtered.reduce((a, s) => a + s.weight, 0);

  const doSearch = () => {
    setSearchResult(shipments.find((s) => s.id === search.trim()) || null);
    setSearched(true);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, background: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🚢</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>الراقي للشحن</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 20 }}>👤 🌐 🏠</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, padding: "14px 14px 0", overflowX: "auto" }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => { setActiveTab(key); setSearched(false); setSearch(""); }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "7px 13px", borderRadius: 999,
                border: active ? "none" : "2px solid #d1d5db",
                background: active ? meta.color : "#fff",
                color: active ? "#fff" : "#6b7280",
                fontWeight: 700, fontSize: 12, fontFamily: "'Cairo', sans-serif",
                cursor: "pointer", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
              }}>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>
                {counts[key] || 0}
              </span>
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>رقم شحنة</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={doSearch} style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>بحث</button>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="أدخل رقم الشحنة..." style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none" }} />
          </div>
          {searched && (
            <div style={{ marginTop: 12 }}>
              {searchResult
                ? <ShipmentCard s={searchResult} highlight />
                : <div style={{ textAlign: "center", color: "#ef4444", fontWeight: 700, padding: 10 }}>❌ لم يتم العثور على الشحنة</div>}
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div style={{ margin: "14px 14px 0", background: "#fff", borderRadius: 14, padding: "12px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.07)", display: "flex", justifyContent: "space-around" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>إجمالي الوزن</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{totalWeight.toFixed(1)} <span style={{ fontSize: 11 }}>كغ</span></div>
        </div>
        <div style={{ width: 1, background: "#e5e7eb" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>إجمالي المبلغ</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{totalAmount.toLocaleString()} <span style={{ fontSize: 11 }}>د.ع</span></div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: "14px 14px 24px" }}>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}>📦 لا توجد شحنات في هذه الفئة</div>
          : filtered.map((s) => <ShipmentCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}

function ShipmentCard({ s, highlight }) {
  const meta = STATUS_META[s.status];
  return (
    <div style={{
      background: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden",
      boxShadow: highlight ? `0 0 0 2px ${meta.color}, 0 4px 16px rgba(0,0,0,.12)` : "0 1px 6px rgba(0,0,0,.07)",
      display: "flex", alignItems: "stretch",
    }}>
      <div style={{ width: 96, flexShrink: 0, background: "#f3f4f6", overflow: "hidden" }}>
        <img src={s.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
      </div>
      <div style={{ flex: 1, padding: "12px 14px", textAlign: "right" }}>
        <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{s.date}</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: s.amount === 0 ? "#ef4444" : "#111", marginBottom: 8 }}>
          {s.amount.toLocaleString()} <span style={{ fontSize: 12 }}>د.ع</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            {meta.emoji} {s.weight} كغ
          </span>
          <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{s.id}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>👤 {s.clientName}</div>
      </div>
    </div>
  );
}

// ═══════════════ ADMIN VIEW ═══════════════
function AdminView({ shipments, onStatusChange, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id: "", clientName: "", clientChatId: "", amount: "", weight: "", status: "warehouse" });
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? shipments : shipments.filter((s) => s.status === filter);

  const handleAdd = () => {
    if (!form.id || !form.clientName) return;
    onAdd({
      ...form,
      amount: Number(form.amount) || 0,
      weight: Number(form.weight) || 0,
      date: new Date().toISOString().split("T")[0],
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80",
    });
    setForm({ id: "", clientName: "", clientChatId: "", amount: "", weight: "", status: "warehouse" });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontWeight: 900, fontSize: 18, color: "#0f172a" }}>⚙️ لوحة التحكم</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10,
          padding: "8px 16px", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 13,
        }}>+ إضافة شحنة</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>📦 شحنة جديدة</div>
          {[
            { key: "id", label: "رقم الشحنة *" },
            { key: "clientName", label: "اسم العميل *" },
            { key: "clientChatId", label: "Chat ID العميل (Telegram)" },
            { key: "amount", label: "المبلغ (د.ع)", type: "number" },
            { key: "weight", label: "الوزن (كغ)", type: "number" },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
              <input
                type={f.type || "text"} value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>الحالة</div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none" }}>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>✅ حفظ وإرسال إشعار</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        <button onClick={() => setFilter("all")} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: "none", background: filter === "all" ? "#0f172a" : "#e5e7eb", color: filter === "all" ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>الكل ({shipments.length})</button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", background: filter === k ? m.color : "#e5e7eb", color: filter === k ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Shipment rows */}
      {filtered.map((s) => (
        <AdminCard key={s.id} s={s} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}

function AdminCard({ s, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[s.status];

  return (
    <div style={{ background: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 13, fontWeight: 800 }}>{s.id}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{s.clientName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{meta.emoji} {meta.label}</span>
          <span style={{ color: "#9ca3af", fontSize: 18 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, marginTop: 10 }}>
            📅 {s.date} &nbsp;|&nbsp; ⚖️ {s.weight} كغ &nbsp;|&nbsp; 💰 {s.amount.toLocaleString()} د.ع
          </div>
          {s.clientChatId && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>🤖 Chat ID: {s.clientChatId}</div>}
          <div style={{ fontSize: 12, color: "#374151", fontWeight: 700, marginBottom: 8 }}>تغيير الحالة:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <button key={k} onClick={() => onStatusChange(s.id, k)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: s.status === k ? m.color : m.bg,
                color: s.status === k ? "#fff" : m.color,
                fontWeight: 700, fontSize: 12, fontFamily: "'Cairo', sans-serif",
                opacity: s.status === k ? 1 : 0.85,
              }}>{m.emoji} {m.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ SETTINGS VIEW ═══════════════
function SettingsView({ config, setConfig, showToast }) {
  const [local, setLocal] = useState(config);
  const [testing, setTesting] = useState(false);

  const save = () => {
    setConfig(local);
    showToast("✅ تم حفظ الإعدادات");
  };

  const testBot = async () => {
    setTesting(true);
    const res = await sendTelegramMessage(local.ADMIN_CHAT_ID, "🧪 اختبار Bot — يعمل بشكل صحيح! ✅");
    setTesting(false);
    if (res.demo) showToast("⚠️ أضف Bot Token أولاً", "warn");
    else if (res.ok) showToast("✅ تم إرسال رسالة اختبار");
    else showToast("❌ فشل — تحقق من Token و Chat ID", "warn");
  };

  return (
    <div style={{ padding: 14 }}>
      <h2 style={{ margin: "0 0 16px", fontWeight: 900, fontSize: 18, color: "#0f172a" }}>🤖 إعدادات Telegram Bot</h2>

      {/* Guide */}
      <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#1d4ed8", marginBottom: 8 }}>📋 خطوات إنشاء البوت:</div>
        {[
          "افتح Telegram وابحث عن @BotFather",
          'أرسل /newbot واختر اسماً للبوت',
          "انسخ الـ Token وضعه أدناه",
          "لمعرفة Chat ID: ابحث عن @userinfobot وأرسل /start",
          "انسخ الـ ID وضعه في خانة Admin Chat ID",
          "اضغط اختبار للتحقق ✅",
        ].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
            <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: "50%", width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
            <span style={{ color: "#1e3a8a" }}>{step}</span>
          </div>
        ))}
      </div>

      {[
        { key: "BOT_TOKEN", label: "🔑 Bot Token", placeholder: "123456789:AAF..." },
        { key: "ADMIN_CHAT_ID", label: "👤 Admin Chat ID", placeholder: "123456789" },
      ].map((f) => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{f.label}</div>
          <input
            value={local[f.key] === `YOUR_${f.key}_HERE` ? "" : local[f.key]}
            onChange={(e) => setLocal({ ...local, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      ))}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save} style={{ flex: 1, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontWeight: 800, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 14 }}>💾 حفظ</button>
        <button onClick={testBot} disabled={testing} style={{ flex: 1, background: testing ? "#e5e7eb" : "#16a34a", color: testing ? "#9ca3af" : "#fff", border: "none", borderRadius: 12, padding: 12, fontWeight: 800, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 14 }}>
          {testing ? "⏳ جاري..." : "🧪 اختبار"}
        </button>
      </div>

      <div style={{ marginTop: 20, background: "#f8fafc", borderRadius: 12, padding: 14, fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
        <strong>💡 ملاحظة مهمة:</strong><br />
        لكي يتلقى العميل إشعارات، يجب أن يكون قد أرسل رسالة للبوت أولاً (أو ضغط Start).
        Chat ID الخاص بكل عميل يمكن معرفته عبر @userinfobot.
      </div>
    </div>
  );
}
