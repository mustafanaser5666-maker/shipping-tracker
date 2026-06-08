import { useState } from "react";

const TELEGRAM_CONFIG = {
  BOT_TOKEN: "8805440426:AAFvjQPN3D1eBg-V1CGY4IgmIz9afGNvK4I",
  ADMIN_CHAT_ID: "1312627565",
};

async function sendTelegramMessage(chatId, message) {
  if (!TELEGRAM_CONFIG.BOT_TOKEN || !chatId) return { ok: false, demo: true };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }) }
    );
    return await res.json();
  } catch { return { ok: false }; }
}

const STATUS_META = {
  warehouse: { label: "في المخزن", emoji: "📦", color: "#f59e0b", bg: "#fef3c7" },
  office:    { label: "في مكتب",   emoji: "🏢", color: "#6366f1", bg: "#ede9fe" },
  transit:   { label: "في الطريق", emoji: "🚚", color: "#0ea5e9", bg: "#e0f2fe" },
  delivered: { label: "تم التسليم",emoji: "✅", color: "#16a34a", bg: "#dcfce7" },
};

// قاعدة بيانات العملاء — كل عميل عنده كود خاص
const INITIAL_CLIENTS = [
  { id: "C001", name: "أحمد محمد",  code: "1234", chatId: "" },
  { id: "C002", name: "سارة علي",   code: "5678", chatId: "" },
  { id: "C003", name: "كريم حسن",   code: "9012", chatId: "" },
  { id: "C004", name: "نور عباس",   code: "3456", chatId: "" },
];

const INITIAL_SHIPMENTS = [
  { id: "8161", date: "2026-06-04", amount: 12500, weight: 1.2, status: "warehouse", clientId: "C001", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
  { id: "8162", date: "2026-06-04", amount: 8000,  weight: 0.8, status: "warehouse", clientId: "C001", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
  { id: "7991", date: "2026-05-28", amount: 15000, weight: 2.1, status: "office",    clientId: "C002", image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&q=80" },
  { id: "7845", date: "2026-05-20", amount: 5500,  weight: 3.5, status: "transit",   clientId: "C003", image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&q=80" },
];

const ADMIN_CODE = "admin123";

export default function App() {
  const [session, setSession] = useState(null); // null | { role: "client", clientId } | { role: "admin" }
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateShipmentStatus = async (id, newStatus) => {
    const s = shipments.find((x) => x.id === id);
    if (s.status === newStatus) return;
    setShipments((prev) => prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
    const client = clients.find((c) => c.id === s.clientId);
    const meta = STATUS_META[newStatus];
    if (client?.chatId) {
      await sendTelegramMessage(client.chatId,
        `📬 <b>تحديث شحنتك</b>\n\nرقم الشحنة: <code>${s.id}</code>\nالحالة: ${meta.emoji} <b>${meta.label}</b>\n\nشكراً لثقتك بنا 🙏`
      );
    }
    const res = await sendTelegramMessage(TELEGRAM_CONFIG.ADMIN_CHAT_ID,
      `⚙️ <b>تغيير حالة</b>\nشحنة: <code>${s.id}</code>\nالعميل: ${client?.name}\nإلى: ${meta.emoji} ${meta.label}`
    );
    if (res?.demo) showToast("✅ تم التغيير (وضع تجريبي)", "warn");
    else showToast("✅ تم التغيير وإرسال الإشعار");
  };

  const addShipment = async (newS) => {
    setShipments((prev) => [newS, ...prev]);
    const client = clients.find((c) => c.id === newS.clientId);
    const res = await sendTelegramMessage(TELEGRAM_CONFIG.ADMIN_CHAT_ID,
      `🆕 <b>شحنة جديدة</b>\nرقم: <code>${newS.id}</code>\nالعميل: ${client?.name}\nالوزن: ${newS.weight} كغ\nالمبلغ: ${newS.amount.toLocaleString()} د.ع`
    );
    if (res?.demo) showToast("✅ تمت الإضافة (وضع تجريبي)", "warn");
    else showToast("✅ تمت الإضافة وإرسال الإشعار");
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: "#f1f5f9", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.type === "warn" ? "#f59e0b" : "#16a34a", color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {!session && <LoginScreen clients={clients} onLogin={setSession} />}
      {session?.role === "client" && (
        <ClientView
          shipments={shipments.filter((s) => s.clientId === session.clientId)}
          client={clients.find((c) => c.id === session.clientId)}
          onLogout={() => setSession(null)}
        />
      )}
      {session?.role === "admin" && (
        <AdminApp
          shipments={shipments} clients={clients}
          onStatusChange={updateShipmentStatus}
          onAdd={addShipment}
          onAddClient={(c) => setClients((prev) => [...prev, c])}
          onLogout={() => setSession(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ═══════════════ LOGIN ═══════════════
function LoginScreen({ clients, onLogin }) {
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("client"); // client | admin
  const [adminCode, setAdminCode] = useState("");

  const handleClientLogin = () => {
    const client = clients.find((c) => c.id === clientId.trim() && c.code === code.trim());
    if (client) { setError(""); onLogin({ role: "client", clientId: client.id }); }
    else setError("❌ رقم العميل أو الكود غير صحيح");
  };

  const handleAdminLogin = () => {
    if (adminCode === ADMIN_CODE) { setError(""); onLogin({ role: "admin" }); }
    else setError("❌ كلمة مرور المسؤول غير صحيحة");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "40px 20px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🚢</div>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>الراقي للشحن</div>
        <div style={{ color: "#bfdbfe", fontSize: 14, marginTop: 4 }}>تتبع شحناتك بسهولة</div>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        {/* Toggle */}
        <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[{ key: "client", label: "👤 عميل" }, { key: "admin", label: "⚙️ مسؤول" }].map((t) => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: mode === t.key ? "#fff" : "transparent", color: mode === t.key ? "#1d4ed8" : "#64748b", fontWeight: 800, fontFamily: "'Cairo', sans-serif", cursor: "pointer", boxShadow: mode === t.key ? "0 2px 8px rgba(0,0,0,0.1)" : "none", fontSize: 14 }}>
              {t.label}
            </button>
          ))}
        </div>

        {mode === "client" ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#0f172a" }}>تسجيل دخول العميل</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>رقم العميل</div>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)}
                placeholder="مثال: C001"
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>الكود السري</div>
              <input value={code} onChange={(e) => setCode(e.target.value)} type="password"
                placeholder="••••"
                onKeyDown={(e) => e.key === "Enter" && handleClientLogin()}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
            {error && <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}
            <button onClick={handleClientLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 16 }}>
              دخول 🚀
            </button>
            <div style={{ marginTop: 16, background: "#f0fdf4", borderRadius: 10, padding: 12, fontSize: 12, color: "#166534" }}>
              💡 رقم العميل والكود يعطيك إياهم المسؤول عند تسجيلك
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#0f172a" }}>دخول المسؤول</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>كلمة المرور</div>
              <input value={adminCode} onChange={(e) => setAdminCode(e.target.value)} type="password"
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
            {error && <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}
            <button onClick={handleAdminLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#0f172a,#334155)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 16 }}>
              دخول المسؤول ⚙️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════ CLIENT VIEW ═══════════════
function ClientView({ shipments, client, onLogout }) {
  const [activeTab, setActiveTab] = useState("warehouse");
  const filtered = shipments.filter((s) => s.status === activeTab);
  const counts = Object.fromEntries(Object.keys(STATUS_META).map((k) => [k, shipments.filter((s) => s.status === k).length]));
  const totalAmount = filtered.reduce((a, s) => a + s.amount, 0);
  const totalWeight = filtered.reduce((a, s) => a + s.weight, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>خروج</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>الراقي للشحن</div>
            <div style={{ color: "#bfdbfe", fontSize: 12 }}>مرحباً {client?.name} 👋</div>
          </div>
          <div style={{ fontSize: 28 }}>🚢</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, padding: "14px 14px 0", overflowX: "auto" }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, border: active ? "none" : "2px solid #d1d5db", background: active ? meta.color : "#fff", color: active ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 12, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{counts[key] || 0}</span>
              {meta.emoji} {meta.label}
            </button>
          );
        })}
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

function ShipmentCard({ s }) {
  const meta = STATUS_META[s.status];
  return (
    <div style={{ background: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.07)", display: "flex" }}>
      <div style={{ width: 96, flexShrink: 0, background: "#f3f4f6", overflow: "hidden" }}>
        <img src={s.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
      </div>
      <div style={{ flex: 1, padding: "12px 14px", textAlign: "right" }}>
        <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{s.date}</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: s.amount === 0 ? "#ef4444" : "#111", marginBottom: 8 }}>
          {s.amount.toLocaleString()} <span style={{ fontSize: 12 }}>د.ع</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{meta.emoji} {s.weight} كغ</span>
          <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{s.id}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{meta.emoji} {meta.label}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ ADMIN APP ═══════════════
function AdminApp({ shipments, clients, onStatusChange, onAdd, onAddClient, onLogout, showToast }) {
  const [tab, setTab] = useState("shipments"); // shipments | clients

  return (
    <div>
      {/* Header */}
      <div style={{ background: "#0f172a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onLogout} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>خروج</button>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>⚙️ لوحة التحكم</div>
        <div style={{ fontSize: 24 }}>🚢</div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: "flex", background: "#1e293b" }}>
        {[{ key: "shipments", label: "📦 الشحنات" }, { key: "clients", label: "👥 العملاء" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "12px", border: "none", background: tab === t.key ? "#1d4ed8" : "transparent", color: tab === t.key ? "#fff" : "#94a3b8", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "shipments" && <ShipmentsAdmin shipments={shipments} clients={clients} onStatusChange={onStatusChange} onAdd={onAdd} />}
      {tab === "clients" && <ClientsAdmin clients={clients} shipments={shipments} onAddClient={onAddClient} showToast={showToast} />}
    </div>
  );
}

function ShipmentsAdmin({ shipments, clients, onStatusChange, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ id: "", clientId: "", amount: "", weight: "", status: "warehouse" });

  const filtered = filter === "all" ? shipments : shipments.filter((s) => s.status === filter);

  const handleAdd = () => {
    if (!form.id || !form.clientId) return;
    onAdd({ ...form, amount: Number(form.amount) || 0, weight: Number(form.weight) || 0, date: new Date().toISOString().split("T")[0], image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" });
    setForm({ id: "", clientId: "", amount: "", weight: "", status: "warehouse" });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>الشحنات ({shipments.length})</div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 13 }}>+ إضافة</button>
      </div>

      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>📦 شحنة جديدة</div>
          {[{ key: "id", label: "رقم الشحنة *" }, { key: "amount", label: "المبلغ (د.ع)", type: "number" }, { key: "weight", label: "الوزن (كغ)", type: "number" }].map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
              <input type={f.type || "text"} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>العميل *</div>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none" }}>
              <option value="">-- اختر العميل --</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>الحالة</div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none" }}>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>✅ حفظ</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        <button onClick={() => setFilter("all")} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", background: filter === "all" ? "#0f172a" : "#e5e7eb", color: filter === "all" ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>الكل</button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", background: filter === k ? m.color : "#e5e7eb", color: filter === k ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {filtered.map((s) => {
        const client = clients.find((c) => c.id === s.clientId);
        return <AdminShipmentCard key={s.id} s={s} clientName={client?.name} onStatusChange={onStatusChange} />;
      })}
    </div>
  );
}

function AdminShipmentCard({ s, clientName, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[s.status];
  return (
    <div style={{ background: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 13, fontWeight: 800 }}>{s.id}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{clientName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{meta.emoji} {meta.label}</span>
          <span style={{ color: "#9ca3af" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 12, color: "#6b7280", margin: "10px 0 10px" }}>📅 {s.date} | ⚖️ {s.weight} كغ | 💰 {s.amount.toLocaleString()} د.ع</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>تغيير الحالة:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <button key={k} onClick={() => onStatusChange(s.id, k)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: s.status === k ? m.color : m.bg, color: s.status === k ? "#fff" : m.color, fontWeight: 700, fontSize: 12, fontFamily: "'Cairo', sans-serif" }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ CLIENTS ADMIN ═══════════════
function ClientsAdmin({ clients, shipments, onAddClient, showToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", chatId: "" });

  const handleAdd = () => {
    if (!form.name || !form.code) return;
    const newId = "C" + String(clients.length + 1).padStart(3, "0");
    onAddClient({ id: newId, name: form.name, code: form.code, chatId: form.chatId });
    showToast(`✅ تمت إضافة العميل — رقمه: ${newId}`);
    setForm({ name: "", code: "", chatId: "" });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>العملاء ({clients.length})</div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 13 }}>+ إضافة عميل</button>
      </div>

      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>👤 عميل جديد</div>
          {[{ key: "name", label: "اسم العميل *" }, { key: "code", label: "الكود السري *", placeholder: "مثال: 1234" }, { key: "chatId", label: "Telegram Chat ID (اختياري)" }].map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
              <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder || ""}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>✅ حفظ</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}

      {clients.map((c) => {
        const count = shipments.filter((s) => s.clientId === c.id).length;
        return (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, marginBottom: 10, padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{c.id}</span>
                <span style={{ fontWeight: 700 }}>{c.name}</span>
              </div>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{count} شحنة</span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
              <span>🔑 الكود: <b style={{ color: "#374151" }}>{c.code}</b></span>
              {c.chatId && <span>🤖 Chat ID: {c.chatId}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
