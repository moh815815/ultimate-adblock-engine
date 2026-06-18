import { useState, useRef, useEffect } from "react";

// ==================== أنواع الرسائل ====================
// msg: { id, role:"user"|"assistant"|"system", content, type:"chat"|"rules"|"explain"|"conflicts", data?, loading? }

const EXAMPLES = [
  "احجب كل الإعلانات على مواقع الأخبار العربية",
  "امنع تتبع فيسبوك وجوجل على جميع المواقع",
  "احجب تعدين العملات الرقمية في الخلفية",
  "حجب الإعلانات المنبثقة فقط دون المحتوى",
  "امنع بصمات المتصفح والتتبع الخفي",
];

const PRESETS = [
  { label: "EasyList عربي", rules: ["||adnow.com^", "||propellerads.com^$third-party", "||popcash.net^", "||hilltopads.net^$script", "@@||cdn.arabnet.me^$stylesheet"] },
  { label: "خصوصية أساسية", rules: ["||doubleclick.net^", "||googlesyndication.com^$third-party", "||facebook.com/tr?*$third-party", "||mc.yandex.ru/metrika/*", "||pixel.quantserve.com^"] },
  { label: "حماية متقدمة", rules: ["||coinhive.com^$script", "||cryptoloot.pro^", "||fingerprint.com^$xmlhttprequest", "||fingerprintjs.com^", "||evercookie.net^"] },
];

// ==================== API CALLS ====================
async function callGenerate(وصف, قواعد_موجودة = []) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `أنت محرك توليد قواعد حجب إعلانات. حوّل الأوصاف العربية إلى قواعد EasyList ودNR دقيقة.
أجب بـ JSON نقي فقط:
{
  "القواعد_المولّدة": [
    {
      "الوصف": "...",
      "صيغة_EasyList": "||example.com^$script,third-party",
      "قاعدة_DNR": {"id":1,"priority":1,"action":{"type":"block"},"condition":{"urlFilter":"||example.com^","resourceTypes":["script"]}},
      "شرح_الأجزاء": {"النمط":"...","الخيارات":"..."},
      "نوع_التهديد": "إعلانات",
      "مستوى_الثقة": 0.95,
      "تحذيرات": []
    }
  ],
  "ملخص": "...",
  "توصيات_إضافية": []
}`,
      messages: [{ role: "user", content: `ولّد قواعد لـ: ${وصف}${قواعد_موجودة.length ? `\n\nقواعد موجودة:\n${قواعد_موجودة.join("\n")}` : ""}` }],
    }),
  });
  const d = await r.json();
  const t = d.content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(t);
}

async function callExplain(قاعدة) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `أنت خبير شرح قواعد EasyList. اشرح القواعد بالعربية بوضوح.
أجب بـ JSON نقي فقط:
{
  "الشرح_الموجز": "...",
  "الشرح_التفصيلي": "...",
  "تحليل_الأجزاء": [{"الجزء":"||","المعنى":"يطابق بداية النطاق"}],
  "ماذا_تحجب": ["..."],
  "ماذا_لا_تحجب": ["..."],
  "نوع_التهديد": "إعلانات",
  "مستوى_الخطورة": "متوسط",
  "أمثلة_URLs_محجوبة": ["https://..."],
  "هل_القاعدة_آمنة": true,
  "مخاطر_الحجب_الخاطئ": "..."
}`,
      messages: [{ role: "user", content: `اشرح: ${قاعدة}` }],
    }),
  });
  const d = await r.json();
  const t = d.content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(t);
}

async function callConflicts(قواعد) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `أنت محلل تعارضات قواعد EasyList.
أجب بـ JSON نقي فقط:
{
  "ملخص_التحليل": {"إجمالي_القواعد":0,"تعارضات":0,"تكرارات":0,"قواعد_خطرة":0,"درجة_الصحة":95},
  "التعارضات": [{"القاعدة_1":"...","القاعدة_2":"...","الوصف":"...","التوصية":"...","الخطورة":"عالية"}],
  "التكرارات": [{"القواعد":["..."],"التوصية":"..."}],
  "القواعد_الخطرة": [{"القاعدة":"...","السبب":"...","البديل":"..."}],
  "الثغرات_المقترحة": [{"الوصف":"...","القاعدة_المقترحة":"..."}],
  "ترتيب_الإصلاح": ["..."]
}`,
      messages: [{ role: "user", content: `حلل هذه القواعد:\n${قواعد.join("\n")}` }],
    }),
  });
  const d = await r.json();
  const t = d.content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(t);
}

async function callChat(messages, قواعد_السياق = []) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `أنت مساعد متخصص في قواعد حجب الإعلانات وحماية الخصوصية. تتحدث بالعربية دائماً.
${قواعد_السياق.length ? `القواعد الموجودة في المحرر:\n${قواعد_السياق.join("\n")}` : ""}
ساعد المطور في فهم وبناء وتحسين قواعد الحجب. كن مختصراً ومفيداً.`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const d = await r.json();
  return d.content.map(c => c.text || "").join("");
}

// ==================== مكونات UI ====================
function Spinner() {
  return <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #1e3a5f", borderTop: "2px solid #60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
}

function Badge({ text, color = "#60a5fa", bg = "#1e3a5f" }) {
  return <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: bg, color, border: `1px solid ${color}30` }}>{text}</span>;
}

function RuleCard({ قاعدة, onExplain, onCopy }) {
  const THREAT_C = { إعلانات: "#6366f1", تتبع: "#f59e0b", "تتبع_المستخدم": "#f59e0b", تعدين: "#ef4444", بصمات: "#ec4899", تصيد: "#dc2626" };
  const clr = THREAT_C[قاعدة.نوع_التهديد] || "#60a5fa";
  return (
    <div style={{ background: "#0d1829", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge text={قاعدة.نوع_التهديد || "عام"} color={clr} bg={`${clr}18`} />
          <Badge text={`ثقة ${Math.round((قاعدة.مستوى_الثقة || 0.9) * 100)}%`} color="#34d399" bg="#1a3a2a" />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onExplain(قاعدة.صيغة_EasyList)} style={{ padding: "4px 10px", borderRadius: 7, background: "#1a2d4a", color: "#60a5fa", border: "1px solid #1e3a5f", cursor: "pointer", fontSize: 11, fontFamily: "Tajawal,sans-serif" }}>شرح</button>
          <button onClick={() => onCopy(قاعدة.صيغة_EasyList)} style={{ padding: "4px 10px", borderRadius: 7, background: "#1a2d4a", color: "#94a3b8", border: "1px solid #1e3a5f", cursor: "pointer", fontSize: 11, fontFamily: "Tajawal,sans-serif" }}>نسخ</button>
        </div>
      </div>
      <code style={{ display: "block", background: "#060d18", color: "#4ade80", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontFamily: "monospace", marginBottom: 8, wordBreak: "break-all" }}>
        {قاعدة.صيغة_EasyList}
      </code>
      <div style={{ color: "#64748b", fontSize: 12 }}>{قاعدة.الوصف}</div>
      {قاعدة.شرح_الأجزاء && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(قاعدة.شرح_الأجزاء).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, color: "#475569", background: "#0a1520", padding: "2px 6px", borderRadius: 4 }}>
              <span style={{ color: "#60a5fa" }}>{k}:</span> {v}
            </span>
          ))}
        </div>
      )}
      {قاعدة.تحذيرات?.length > 0 && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "#f59e0b15", border: "1px solid #f59e0b30", borderRadius: 7, color: "#fbbf24", fontSize: 11 }}>
          ⚠ {قاعدة.تحذيرات.join(" · ")}
        </div>
      )}
    </div>
  );
}

function ExplainPanel({ بيانات, onClose }) {
  if (!بيانات) return null;
  const LEVEL_C = { منخفض: "#22c55e", متوسط: "#f59e0b", "عالٍ": "#ef4444", حرج: "#dc2626" };
  return (
    <div style={{ background: "#0a1520", border: "1px solid #1e3a5f", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>شرح القاعدة</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <code style={{ display: "block", background: "#060d18", color: "#4ade80", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontFamily: "monospace", marginBottom: 14 }}>
        {بيانات.القاعدة_الأصلية}
      </code>
      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{بيانات.الشرح_الموجز}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{بيانات.الشرح_التفصيلي}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Badge text={`نوع: ${بيانات.نوع_التهديد}`} color="#60a5fa" />
        <Badge text={`خطورة: ${بيانات.مستوى_الخطورة}`} color={LEVEL_C[بيانات.مستوى_الخطورة] || "#94a3b8"} bg={`${LEVEL_C[بيانات.مستوى_الخطورة] || "#94a3b8"}18`} />
        <Badge text={بيانات.هل_القاعدة_آمنة ? "✓ آمنة" : "⚠ تحقق"} color={بيانات.هل_القاعدة_آمنة ? "#34d399" : "#f59e0b"} bg={بيانات.هل_القاعدة_آمنة ? "#1a3a2a" : "#3a2a1a"} />
      </div>

      {بيانات.تحليل_الأجزاء?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: "0.06em" }}>تشريح القاعدة</div>
          {بيانات.تحليل_الأجزاء.map((j, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 5 }}>
              <code style={{ color: "#4ade80", fontSize: 12, minWidth: 60, fontFamily: "monospace", background: "#060d18", padding: "1px 6px", borderRadius: 4 }}>{j.الجزء}</code>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{j.المعنى}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {بيانات.ماذا_تحجب?.length > 0 && (
          <div style={{ background: "#ef444410", border: "1px solid #ef444430", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⛔ تحجب</div>
            {بيانات.ماذا_تحجب.slice(0, 3).map((s, i) => <div key={i} style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>• {s}</div>)}
          </div>
        )}
        {بيانات.ماذا_لا_تحجب?.length > 0 && (
          <div style={{ background: "#22c55e10", border: "1px solid #22c55e30", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>✓ تسمح بـ</div>
            {بيانات.ماذا_لا_تحجب.slice(0, 3).map((s, i) => <div key={i} style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>• {s}</div>)}
          </div>
        )}
      </div>

      {بيانات.مخاطر_الحجب_الخاطئ && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 8, color: "#fbbf24", fontSize: 12 }}>
          ⚠ {بيانات.مخاطر_الحجب_الخاطئ}
        </div>
      )}
    </div>
  );
}

function ConflictPanel({ بيانات }) {
  if (!بيانات) return null;
  const م = بيانات.ملخص_التحليل || {};
  const healthColor = م.درجة_الصحة >= 90 ? "#22c55e" : م.درجة_الصحة >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* درجة الصحة */}
      <div style={{ background: `${healthColor}10`, border: `1px solid ${healthColor}30`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>درجة صحة القواعد</div>
          <div style={{ color: healthColor, fontSize: 32, fontWeight: 900 }}>{م.درجة_الصحة ?? "—"}%</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[["تعارضات", م.تعارضات, "#ef4444"], ["تكرارات", م.تكرارات, "#f59e0b"], ["خطرة", م.قواعد_خطرة, "#f97316"]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ color: c, fontSize: 22, fontWeight: 800 }}>{v ?? 0}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* التعارضات */}
      {بيانات.التعارضات?.length > 0 && (
        <div style={{ background: "#0a1520", border: "1px solid #ef444330", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>⚡ التعارضات المكتشفة</div>
          {بيانات.التعارضات.map((t, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: "#ef444408", borderRadius: 8, border: "1px solid #ef444420" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <code style={{ color: "#f87171", fontSize: 11, fontFamily: "monospace" }}>{t.القاعدة_1}</code>
                <span style={{ color: "#475569" }}>↔</span>
                <code style={{ color: "#fbbf24", fontSize: 11, fontFamily: "monospace" }}>{t.القاعدة_2}</code>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{t.الوصف}</div>
              <div style={{ color: "#34d399", fontSize: 11 }}>💡 {t.التوصية}</div>
            </div>
          ))}
        </div>
      )}

      {/* القواعد الخطرة */}
      {بيانات.القواعد_الخطرة?.length > 0 && (
        <div style={{ background: "#0a1520", border: "1px solid #f9731630", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#fb923c", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>⚠ قواعد قد تُسبب مشاكل</div>
          {بيانات.القواعد_الخطرة.map((q, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <code style={{ color: "#f97316", fontSize: 11, fontFamily: "monospace" }}>{q.القاعدة}</code>
              <div style={{ color: "#94a3b8", fontSize: 11, margin: "3px 0" }}>{q.السبب}</div>
              <div style={{ color: "#34d399", fontSize: 11 }}>البديل: <code style={{ color: "#4ade80", fontFamily: "monospace" }}>{q.البديل}</code></div>
            </div>
          ))}
        </div>
      )}

      {/* الثغرات */}
      {بيانات.الثغرات_المقترحة?.length > 0 && (
        <div style={{ background: "#0a1520", border: "1px solid #6366f130", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>💡 قواعد مقترحة لسد الثغرات</div>
          {بيانات.الثغرات_المقترحة.map((g, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>{g.الوصف}</div>
              <code style={{ color: "#a78bfa", fontSize: 11, fontFamily: "monospace" }}>{g.القاعدة_المقترحة}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== التطبيق الرئيسي ====================
export default function App() {
  const [tab, setTab] = useState("توليد");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRules, setGeneratedRules] = useState(null);
  const [explainRule, setExplainRule] = useState("");
  const [explainData, setExplainData] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [editorRules, setEditorRules] = useState(PRESETS[0].rules.join("\n"));
  const [conflictData, setConflictData] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { id: 1, role: "assistant", content: "أهلاً! أنا مساعد قواعد الحجب. يمكنني مساعدتك في:\n• شرح أي قاعدة EasyList\n• توليد قواعد جديدة من وصف عربي\n• تحليل تعارضات قواعدك\n\nما الذي تريد فعله؟" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  const handleGenerate = async () => {
    if (!desc.trim()) return;
    setLoading(true);
    setGeneratedRules(null);
    try {
      const res = await callGenerate(desc, editorRules.split("\n").filter(Boolean));
      setGeneratedRules(res);
    } catch (e) { alert("خطأ: " + e.message); }
    setLoading(false);
  };

  const addToEditor = (rule) => {
    setEditorRules(prev => prev ? prev + "\n" + rule : rule);
  };

  const handleExplain = async (rule) => {
    if (!rule && !explainRule.trim()) return;
    const r = rule || explainRule;
    setExplainLoading(true);
    setExplainData(null);
    try {
      const res = await callExplain(r);
      setExplainData({ ...res, القاعدة_الأصلية: r });
    } catch (e) { alert("خطأ: " + e.message); }
    setExplainLoading(false);
  };

  const handleConflicts = async () => {
    const rules = editorRules.split("\n").map(r => r.trim()).filter(r => r && !r.startsWith("!"));
    if (rules.length < 2) return alert("أدخل قاعدتين على الأقل");
    setConflictLoading(true);
    setConflictData(null);
    try {
      const res = await callConflicts(rules);
      setConflictData(res);
    } catch (e) { alert("خطأ: " + e.message); }
    setConflictLoading(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { id: Date.now(), role: "user", content: chatInput };
    const newMsgs = [...chatMsgs, userMsg];
    setChatMsgs(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const history = newMsgs.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
      const reply = await callChat(history, editorRules.split("\n").filter(Boolean));
      setChatMsgs(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: reply }]);
    } catch (e) {
      setChatMsgs(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: "حدث خطأ. حاول مجدداً." }]);
    }
    setChatLoading(false);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(editorRules);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const TABS = ["توليد", "شرح", "محرر", "تعارضات", "مساعد"];
  const TAB_ICONS = { توليد: "✦", شرح: "◎", محرر: "⊞", تعارضات: "⚡", مساعد: "◈" };

  return (
    <div style={{ fontFamily: "Tajawal,Cairo,'Segoe UI',sans-serif", direction: "rtl", background: "#060d18", minHeight: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#080d14}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        textarea{resize:none}
        textarea::placeholder,input::placeholder{color:#334155}
        button:active{transform:scale(0.97)}
      `}</style>

      {/* Header */}
      <header style={{ background: "#080d14", borderBottom: "1px solid #1e2d3d", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⛉</div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>محرك القواعد الذكي</div>
            <div style={{ color: "#334155", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>AI RULE STUDIO · ARABIC ADBLOCK ENGINE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ color: "#475569", fontSize: 12 }}>claude-sonnet-4-6</span>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 180, background: "#080d14", borderLeft: "1px solid #1e2d3d", display: "flex", flexDirection: "column", padding: "16px 10px", gap: 4, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: tab === t ? 700 : 500, fontSize: 13, background: tab === t ? "linear-gradient(90deg,#1e3a5f,#1e2d3d)" : "transparent", color: tab === t ? "#60a5fa" : "#64748b", borderRight: tab === t ? "3px solid #3b82f6" : "3px solid transparent", transition: "all 0.15s", textAlign: "right" }}>
              <span style={{ fontSize: 14, opacity: tab === t ? 1 : 0.5 }}>{TAB_ICONS[t]}</span>{t}
            </button>
          ))}

          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #1e2d3d" }}>
            <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: "0.06em" }}>إعدادات مسبقة</div>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setEditorRules(p.rules.join("\n"))} style={{ display: "block", width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #1e2d3d", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 11, fontFamily: "Tajawal,sans-serif", marginBottom: 4, textAlign: "right", transition: "all 0.1s" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <main style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ===== تبويب: توليد ===== */}
          {tab === "توليد" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
              <div>
                <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>توليد القواعد بالذكاء الاصطناعي</h2>
                <p style={{ color: "#475569", fontSize: 13 }}>اكتب ما تريد حجبه بالعربية العادية وسيولّد المحرك قواعد EasyList و DNR جاهزة</p>
              </div>

              {/* أمثلة سريعة */}
              <div>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>أمثلة سريعة</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {EXAMPLES.map((e, i) => (
                    <button key={i} onClick={() => setDesc(e)} style={{ padding: "6px 12px", borderRadius: 8, background: "#0d1829", border: "1px solid #1e3a5f", color: "#60a5fa", cursor: "pointer", fontSize: 12, fontFamily: "Tajawal,sans-serif", transition: "all 0.15s" }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* مربع الوصف */}
              <div style={{ background: "#0a1520", border: "1px solid #1e3a5f", borderRadius: 14, overflow: "hidden" }}>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleGenerate(); }}
                  placeholder="مثال: احجب كل الإعلانات على مواقع الأخبار العربية، وامنع شبكات التتبع الخارجية..."
                  style={{ width: "100%", minHeight: 110, padding: "16px 18px", background: "transparent", border: "none", color: "#e2e8f0", fontSize: 14, fontFamily: "Tajawal,sans-serif", outline: "none", lineHeight: 1.7 }}
                />
                <div style={{ padding: "10px 18px", borderTop: "1px solid #1e2d3d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontSize: 11 }}>Ctrl+Enter للتوليد</span>
                  <button onClick={handleGenerate} disabled={loading || !desc.trim()} style={{ padding: "9px 22px", borderRadius: 10, background: loading ? "#1e2d3d" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: loading ? "#475569" : "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    {loading ? <><Spinner /> جارٍ التوليد...</> : "✦ ولّد القواعد"}
                  </button>
                </div>
              </div>

              {/* النتائج */}
              {generatedRules && (
                <div style={{ animation: "fadeIn 0.4s ease" }}>
                  <div style={{ background: "#0a1520", border: "1px solid #22c55e30", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>✓ تم توليد {generatedRules.القواعد_المولّدة?.length ?? 0} قاعدة</span>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{generatedRules.ملخص}</div>
                    </div>
                    <button onClick={() => { generatedRules.القواعد_المولّدة?.forEach(q => addToEditor(q.صيغة_EasyList)); }} style={{ padding: "8px 16px", borderRadius: 9, background: "#1a3a2a", color: "#34d399", border: "1px solid #22c55e30", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: 12, fontWeight: 700 }}>
                      ← أضف كل للمحرر
                    </button>
                  </div>

                  {generatedRules.القواعد_المولّدة?.map((q, i) => (
                    <RuleCard key={i} قاعدة={q}
                      onExplain={r => { setExplainRule(r); setTab("شرح"); handleExplain(r); }}
                      onCopy={r => { navigator.clipboard.writeText(r); addToEditor(r); }}
                    />
                  ))}

                  {generatedRules.توصيات_إضافية?.length > 0 && (
                    <div style={{ background: "#6366f110", border: "1px solid #6366f130", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💡 توصيات إضافية</div>
                      {generatedRules.توصيات_إضافية.map((t, i) => <div key={i} style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>• {t}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== تبويب: شرح ===== */}
          {tab === "شرح" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
              <div>
                <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>شرح القواعد بالعربية</h2>
                <p style={{ color: "#475569", fontSize: 13 }}>الصق أي قاعدة EasyList وسيشرحها المحرك بالعربية بالتفصيل</p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={explainRule}
                  onChange={e => setExplainRule(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleExplain(); }}
                  placeholder="مثال: ||doubleclick.net^$third-party,script"
                  style={{ flex: 1, padding: "11px 16px", background: "#0a1520", border: "1px solid #1e3a5f", borderRadius: 10, color: "#4ade80", fontFamily: "monospace", fontSize: 13, outline: "none" }}
                />
                <button onClick={() => handleExplain()} disabled={explainLoading || !explainRule.trim()} style={{ padding: "11px 20px", borderRadius: 10, background: explainLoading ? "#1e2d3d" : "#1e3a5f", color: explainLoading ? "#475569" : "#60a5fa", border: "1px solid #3b82f630", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {explainLoading ? <><Spinner/> جارٍ...</> : "◎ اشرح"}
                </button>
              </div>

              {/* أمثلة */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["||doubleclick.net^$third-party", "@@||fonts.googleapis.com^$stylesheet", "example.com##div[id^='ad-']", "||coinhive.com^$script,third-party"].map((r, i) => (
                  <button key={i} onClick={() => { setExplainRule(r); handleExplain(r); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#0d1829", border: "1px solid #1e2d3d", color: "#64748b", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>
                    {r.slice(0, 35)}{r.length > 35 ? "..." : ""}
                  </button>
                ))}
              </div>

              {explainLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#64748b", fontSize: 13 }}>
                  <Spinner /> جارٍ تحليل القاعدة بالذكاء الاصطناعي...
                </div>
              )}

              {explainData && <ExplainPanel بيانات={explainData} onClose={() => setExplainData(null)} />}
            </div>
          )}

          {/* ===== تبويب: محرر ===== */}
          {tab === "محرر" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>محرر القواعد</h2>
                  <p style={{ color: "#475569", fontSize: 13 }}>{editorRules.split("\n").filter(r => r.trim() && !r.startsWith("!")).length} قاعدة نشطة</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copyAll} style={{ padding: "8px 16px", borderRadius: 9, background: copied ? "#1a3a2a" : "#1e2d3d", color: copied ? "#34d399" : "#94a3b8", border: `1px solid ${copied ? "#22c55e30" : "#1e3a5f"}`, cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: 12, fontWeight: 700 }}>
                    {copied ? "✓ تم النسخ" : "⊞ نسخ الكل"}
                  </button>
                  <button onClick={() => { setTab("تعارضات"); handleConflicts(); }} style={{ padding: "8px 16px", borderRadius: 9, background: "#1e3a5f", color: "#60a5fa", border: "1px solid #3b82f630", cursor: "pointer", fontFamily: "Tajawal,sans-serif", fontSize: 12, fontWeight: 700 }}>
                    ⚡ تحليل التعارضات
                  </button>
                </div>
              </div>

              <textarea
                value={editorRules}
                onChange={e => setEditorRules(e.target.value)}
                placeholder="أدخل قواعد EasyList هنا، كل قاعدة في سطر..."
                style={{ minHeight: 420, padding: "16px 18px", background: "#0a1520", border: "1px solid #1e2d3d", borderRadius: 12, color: "#4ade80", fontFamily: "monospace", fontSize: 12, outline: "none", lineHeight: 1.8, direction: "ltr", textAlign: "left" }}
              />

              {/* تحليل سريع */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {(() => {
                  const lines = editorRules.split("\n").map(r => r.trim()).filter(Boolean);
                  const active = lines.filter(r => !r.startsWith("!"));
                  const exceptions = active.filter(r => r.startsWith("@@"));
                  const cosmetic = active.filter(r => r.includes("##"));
                  const network = active.filter(r => !r.startsWith("@@") && !r.includes("##"));
                  return [["شبكة", network.length, "#ef4444"], ["استثناء", exceptions.length, "#22c55e"], ["تجميل", cosmetic.length, "#f59e0b"], ["تعليق", lines.length - active.length, "#475569"]].map(([l, n, c]) => (
                    <div key={l} style={{ background: "#0a1520", border: `1px solid ${c}20`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ color: c, fontSize: 22, fontWeight: 800 }}>{n}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>قواعد {l}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ===== تبويب: تعارضات ===== */}
          {tab === "تعارضات" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>كاشف التعارضات</h2>
                  <p style={{ color: "#475569", fontSize: 13 }}>يحلل قواعدك ويكتشف التعارضات والتكرارات والقواعد الخطرة</p>
                </div>
                <button onClick={handleConflicts} disabled={conflictLoading} style={{ padding: "10px 20px", borderRadius: 10, background: conflictLoading ? "#1e2d3d" : "linear-gradient(135deg,#dc2626,#9f1239)", color: conflictLoading ? "#475569" : "#fff", border: "none", cursor: conflictLoading ? "not-allowed" : "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {conflictLoading ? <><Spinner /> جارٍ التحليل...</> : "⚡ تحليل القواعد الآن"}
                </button>
              </div>

              {!conflictData && !conflictLoading && (
                <div style={{ background: "#0a1520", border: "1px dashed #1e3a5f", borderRadius: 14, padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>⚡</div>
                  <div style={{ color: "#475569", fontSize: 14 }}>اضغط "تحليل القواعد الآن" لفحص القواعد الموجودة في المحرر</div>
                  <div style={{ color: "#334155", fontSize: 12, marginTop: 6 }}>يعتمد على القواعد المحفوظة في تبويب المحرر</div>
                </div>
              )}

              {conflictLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40, color: "#64748b" }}>
                  <Spinner />
                  <span style={{ fontSize: 13 }}>الذكاء الاصطناعي يحلل القواعد ويكتشف التعارضات...</span>
                </div>
              )}

              {conflictData && <ConflictPanel بيانات={conflictData} />}
            </div>
          )}

          {/* ===== تبويب: مساعد ===== */}
          {tab === "مساعد" && (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>مساعد القواعد الذكي</h2>
                <p style={{ color: "#475569", fontSize: 13 }}>اسأل أي سؤال عن قواعد الحجب — يرى قواعدك الحالية في المحرر</p>
              </div>

              {/* رسائل */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingLeft: 4, marginBottom: 14 }}>
                {chatMsgs.map(msg => (
                  <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-start" : "flex-end", animation: "fadeIn 0.3s ease" }}>
                    <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? "linear-gradient(135deg,#1d4ed8,#4f46e5)" : "#0d1829", border: msg.role === "assistant" ? "1px solid #1e3a5f" : "none", color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: "#0d1829", border: "1px solid #1e3a5f", display: "flex", gap: 6, alignItems: "center" }}>
                      <Spinner /><span style={{ color: "#475569", fontSize: 12 }}>يكتب...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* أسئلة مقترحة */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {["ليه doubleclick.net خطير؟", "أضف قاعدة لـ Taboola", "ما الفرق بين || و |https://|؟", "هل قواعدي متعارضة؟"].map((q, i) => (
                  <button key={i} onClick={() => setChatInput(q)} style={{ padding: "5px 11px", borderRadius: 7, background: "#0d1829", border: "1px solid #1e2d3d", color: "#64748b", cursor: "pointer", fontSize: 11, fontFamily: "Tajawal,sans-serif" }}>
                    {q}
                  </button>
                ))}
              </div>

              {/* مربع الإدخال */}
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleChat(); }}
                  placeholder="اسأل عن قواعد الحجب..."
                  style={{ flex: 1, padding: "12px 16px", background: "#0a1520", border: "1px solid #1e3a5f", borderRadius: 11, color: "#e2e8f0", fontFamily: "Tajawal,sans-serif", fontSize: 13, outline: "none" }}
                />
                <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: "12px 20px", borderRadius: 11, background: chatLoading ? "#1e2d3d" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: chatLoading ? "#475569" : "#fff", border: "none", cursor: chatLoading ? "not-allowed" : "pointer", fontFamily: "Tajawal,sans-serif", fontWeight: 700, fontSize: 14 }}>
                  ↵
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
