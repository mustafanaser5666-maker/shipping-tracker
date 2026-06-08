import { useState, useEffect } from "react";

const SUPABASE_URL = "https://zifkgtfwmzpsphdstsew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmtndGZ3bXpwc3BoZHN0c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTQ4MzAsImV4cCI6MjA5NjQ5MDgzMH0.QLE0PeHKHZma2PS9Blxu7MedxrsRFypmjLNpCtB1aP8";
const TELEGRAM_BOT_TOKEN = "8939404362:AAHvQd3Bx2--SYrk3HNwstMMuto2nssHn1s";
const ADMIN_CHAT_ID = "1312627565";
const ADMIN_CODE = "admin123";

const db = {
  async get(table, filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${v}`; });
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  }
};

async function sendTelegram(chatId, msg) {
  if (!chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
    });
  } catch {}
}

const STATUS_META = {
  warehouse: { label: "في المخزن", emoji: "📦", color: "#f59e0b", bg: "#fef3c7" },
  office:    { label: "في مكتب",   emoji: "🏢", color: "#6366f1", bg: "#ede9fe" },
  transit:   { label: "في الطريق", emoji: "🚚", color: "#0ea5e9", bg: "#e0f2fe" },
  delivered: { label: "تم التسليم",emoji: "✅", color: "#16a34a", bg: "#dcfce7" },
};

export default function App() {
  const [session, setSession] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([db.get("clients"), db.get("shipments")]);
    setClients(Array.isArray(c) ? c : []);
    setShipments(Array.isArray(s) ? s : []);
    setLoading(false);
  };

  useEffect(() => { if (session) loadData(); }, [session]);

  const updateStatus = async (id, newStatus) => {
    const s = shipments.find(x => x.id === id);
    if (!s || s.status === newStatus) return;
    await db.update("shipments", id, { status: newStatus });
    setShipments(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x));
    const client = clients.find(c => c.id === s.client_id);
    const meta = STATUS_META[newStatus];
    if (client?.chat_id) {
      await sendTelegram(client.chat_id, `📬 <b>تحديث شحنتك</b>\n\nرقم الشحنة: <code>${s.id}</code>\nالحالة: ${meta.emoji} <b>${meta.label}</b>\n\nشكراً لثقتك بنا 🙏`);
    }
    await sendTelegram(ADMIN_CHAT_ID, `⚙️ <b>تغيير حالة</b>\nشحنة: <code>${s.id}</code>\nالعميل: ${client?.name}\nإلى: ${meta.emoji} ${meta.label}`);
    showToast("✅ تم تغيير الحالة");
  };

  const addShipment = async (data) => {
    const res = await db.insert("shipments", data);
    if (Array.isArray(res)) setShipments(prev => [res[0], ...prev]);
    const client = clients.find(c => c.id === data.client_id);
    await sendTelegram(ADMIN_CHAT_ID, `🆕 <b>شحنة جديدة</b>\nرقم: <code>${data.id}</code>\nالعميل: ${client?.name}\nالوزن: ${data.weight} كغ`);
    showToast("✅ تمت إضافة الشحنة");
  };

  const addClient = async (data) => {
    const res = await db.insert("clients", data);
    if (Array.isArray(res)) setClients(prev => [...prev, res[0]]);
    showToast(`✅ تمت إضافة العميل — رقمه: ${data.id}`);
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: "#f1f5f9", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.type === "warn" ? "#f59e0b" : "#16a34a", color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 32px", fontWeight: 700, fontSize: 16 }}>⏳ جاري التحميل...</div>
        </div>
      )}
      {!session && <LoginScreen clients={clients} onLogin={setSession} loadClients={async () => { const c = await db.get("clients"); setClients(Array.isArray(c) ? c : []); }} />}
      {session?.role === "client" && <ClientView shipments={shipments.filter(s => s.client_id === session.clientId)} client={clients.find(c => c.id === session.clientId)} onLogout={() => setSession(null)} />}
      {session?.role === "admin" && <AdminApp shipments={shipments} clients={clients} onStatusChange={updateStatus} onAdd={addShipment} onAddClient={addClient} onLogout={() => setSession(null)} showToast={showToast} />}
    </div>
  );
}

function LoginScreen({ clients, onLogin, loadClients }) {
  const [mode, setMode] = useState("client");
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClientLogin = async () => {
    setLoading(true);
    await loadClients();
    setLoading(false);
    const client = clients.find(c => c.id === clientId.trim() && c.code === code.trim());
    if (client) { setError(""); onLogin({ role: "client", clientId: client.id }); }
    else setError("❌ رقم العميل أو الكود غير صحيح");
  };

  const handleAdminLogin = () => {
    if (adminCode === ADMIN_CODE) { setError(""); onLogin({ role: "admin" }); }
    else setError("❌ كلمة المرور غير صحيحة");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "40px 20px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🚢</div>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>الراقي للشحن</div>
        <div style={{ color: "#bfdbfe", fontSize: 14, marginTop: 4 }}>تتبع شحناتك بسهولة</div>
      </div>
      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[{ key: "client", label: "👤 عميل" }, { key: "admin", label: "⚙️ مسؤول" }].map(t => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: mode === t.key ? "#fff" : "transparent", color: mode === t.key ? "#1d4ed8" : "#64748b", fontWeight: 800, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 14 }}>
              {t.label}
            </button>
          ))}
        </div>
        {mode === "client" ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20 }}>تسجيل دخول العميل</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>رقم العميل</div>
              <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="مثال: C001"
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>الكود السري</div>
              <input value={code} onChange={e => setCode(e.target.value)} type="password" placeholder="••••"
                onKeyDown={e => e.key === "Enter" && handleClientLogin()}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
            {error && <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}
            <button onClick={handleClientLogin} disabled={loading}
              style={{ width: "100%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 16 }}>
              {loading ? "⏳ جاري..." : "دخول 🚀"}
            </button>
            <div style={{ marginTop: 16, background: "#f0fdf4", borderRadius: 10, padding: 12, fontSize: 12, color: "#166534" }}>
              💡 رقم العميل والكود يعطيك إياهم المسؤول عند تسجيلك
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20 }}>دخول المسؤول</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>كلمة المرور</div>
              <input value={adminCode} onChange={e => setAdminCode(e.target.value)} type="password" placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
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

function ClientView({ shipments, client, onLogout }) {
  const [activeTab, setActiveTab] = useState("warehouse");
  const filtered = shipments.filter(s => s.status === activeTab);
  const counts = Object.fromEntries(Object.keys(STATUS_META).map(k => [k, shipments.filter(s => s.status === k).length]));
  const totalAmount = filtered.reduce((a, s) => a + (s.amount || 0), 0);
  const totalWeight = filtered.reduce((a, s) => a + (s.weight || 0), 0);

  return (
    <div>
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
      <div style={{ padding: "14px 14px 24px" }}>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}>📦 لا توجد شحنات في هذه الفئة</div>
          : filtered.map(s => <ShipmentCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}

function ShipmentCard({ s }) {
  const meta = STATUS_META[s.status] || STATUS_META.warehouse;
  return (
    <div style={{ background: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.07)", display: "flex" }}>
      <div style={{ width: 96, flexShrink: 0, background: "#f3f4f6", overflow: "hidden" }}>
        {s.image ? <img src={s.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : <div style={{ width: "100%", height: "100%", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📦</div>}
      </div>
      <div style={{ flex: 1, padding: "12px 14px", textAlign: "right" }}>
        <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{s.date}</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#111", marginBottom: 8 }}>{(s.amount || 0).toLocaleString()} <span style={{ fontSize: 12 }}>د.ع</span></div>
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

function AdminApp({ shipments, clients, onStatusChange, onAdd, onAddClient, onLogout, showToast }) {
  const [tab, setTab] = useState("shipments");
  return (
    <div>
      <div style={{ background: "#0f172a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onLogout} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>خروج</button>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>⚙️ لوحة التحكم</div>
        <div style={{ fontSize: 24 }}>🚢</div>
      </div>
      <div style={{ display: "flex", background: "#1e293b" }}>
        {[{ key: "shipments", label: "📦 الشحنات" }, { key: "clients", label: "👥 العملاء" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "12px", border: "none", background: tab === t.key ? "#1d4ed8" : "transparent", color: tab === t.key ? "#fff" : "#94a3b8", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "shipments" && <ShipmentsAdmin shipments={shipments} clients={clients} onStatusChange={onStatusChange} onAdd={onAdd} />}
      {tab === "clients" && <ClientsAdmin clients={clients} shipments={shipments} onAddClient={onAddClient} />}
    </div>
  );
}

function ShipmentsAdmin({ shipments, clients, onStatusChange, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ id: "", client_id: "", amount: "", weight: "", status: "warehouse" });

  const filtered = filter === "all" ? shipments : shipments.filter(s => s.status === filter);

  const handleAdd = () => {
    if (!form.id || !form.client_id) return;
    onAdd({ ...form, amount: Number(form.amount) || 0, weight: Number(form.weight) || 0, date: new Date().toISOString().split("T")[0], image: "" });
    setForm({ id: "", client_id: "", amount: "", weight: "", status: "warehouse" });
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
          {[{ key: "id", label: "رقم الشحنة *" }, { key: "amount", label: "المبلغ (د.ع)", type: "number" }, { key: "weight", label: "الوزن (كغ)", type: "number" }].map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
              <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>العميل *</div>
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", outline: "none" }}>
              <option value="">-- اختر العميل --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>الحالة</div>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", outline: "none" }}>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>✅ حفظ</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        <button onClick={() => setFilter("all")} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", background: filter === "all" ? "#0f172a" : "#e5e7eb", color: filter === "all" ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>الكل</button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", background: filter === k ? m.color : "#e5e7eb", color: filter === k ? "#fff" : "#374151", fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer", fontSize: 12 }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      {filtered.map(s => {
        const client = clients.find(c => c.id === s.client_id);
        return <AdminShipmentCard key={s.id} s={s} clientName={client?.name} onStatusChange={onStatusChange} />;
      })}
    </div>
  );
}

function AdminShipmentCard({ s, clientName, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[s.status] || STATUS_META.warehouse;
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
          <div style={{ fontSize: 12, color: "#6b7280", margin: "10px 0" }}>📅 {s.date} | ⚖️ {s.weight} كغ | 💰 {(s.amount || 0).toLocaleString()} د.ع</div>
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

function ClientsAdmin({ clients, shipments, onAddClient }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", chat_id: "" });

  const handleAdd = () => {
    if (!form.name || !form.code) return;
    const newId = "C" + String(clients.length + 1).padStart(3, "0");
    onAddClient({ id: newId, name: form.name, code: form.code, chat_id: form.chat_id || "" });
    setForm({ name: "", code: "", chat_id: "" });
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
          {[{ key: "name", label: "اسم العميل *" }, { key: "code", label: "الكود السري *", placeholder: "مثال: 1234" }, { key: "chat_id", label: "Telegram Chat ID (اختياري)" }].map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
              <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder || ""}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'Cairo', sans-serif", textAlign: "right", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>✅ حفظ</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 10, padding: 10, fontWeight: 700, fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>إلغاء</button>
          </div>
        </div>
      )}
      {clients.map(c => {
        const count = shipments.filter(s => s.client_id === c.id).length;
        return (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, marginBottom: 10, padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: "#1f2937", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{c.id}</span>
                <span style={{ fontWeight: 700 }}>{c.name}</span>
              </div>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{count} شحنة</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              🔑 الكود: <b style={{ color: "#374151" }}>{c.code}</b>
              {c.chat_id && <span> &nbsp;|&nbsp; 🤖 {c.chat_id}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
