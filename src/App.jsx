import { useState, useEffect, useRef, useCallback } from "react";
import { LANGS, LANG_KEYS, otherLang } from "./lib/languages.js";
import {
  createWord,
  schedule,
  isDue,
  dueLabel,
  nextIntervalDays,
} from "./lib/srs.js";
import {
  createWordStore,
  resolveBackend,
  selectBackend,
} from "./lib/storage.js";
import { createDailyStats } from "./lib/dailyStats.js";
import { createRemoteWordStore } from "./lib/remoteStore.js";
import {
  isCloudConfigured,
  getSupabase,
  currentUser,
  onAuthChange,
  signInWithEmail,
  signOut,
} from "./lib/supabase.js";
import {
  wordsToJSON,
  wordsToCSV,
  wordsFromJSON,
  mergeWords,
} from "./lib/backup.js";
import { speak } from "./lib/speech.js";
import { papagoUrl, naverDictUrl } from "./lib/lookup.js";

const cloudEnabled = isCloudConfigured();

/* ───────────────────────── icons ───────────────────────── */

const Speaker = ({ s = 20 }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" opacity="0.55" />
  </svg>
);
const IconHome = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7.5 12 3l8 4.5M5 10v9h14v-9" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M12 6v12M6 12h12" />
  </svg>
);
const IconStack = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="5" width="16" height="6" rx="2" />
    <path d="M5.5 14.5h13M7 18h10" opacity="0.6" />
  </svg>
);

/* ───────────────────── liquid aurora background ───────────────────── */

function AuroraBg() {
  return (
    <div className="vc-aurora" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="vc-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <svg
        className="vc-aurora-svg"
        viewBox="0 0 390 820"
        preserveAspectRatio="xMidYMid slice"
      >
        <g filter="url(#vc-goo)">
          <circle fill="#8b7bff" r="110" cx="90" cy="150">
            <animate
              attributeName="cx"
              values="90;170;60;90"
              dur="16s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="150;110;210;150"
              dur="19s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="110;128;100;110"
              dur="14s"
              repeatCount="indefinite"
            />
          </circle>
          <circle fill="#4fd6e6" r="92" cx="300" cy="190">
            <animate
              attributeName="cx"
              values="300;240;330;300"
              dur="20s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="190;260;150;190"
              dur="15s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="92;108;82;92"
              dur="17s"
              repeatCount="indefinite"
            />
          </circle>
          <circle fill="#ff8bc4" r="86" cx="170" cy="300">
            <animate
              attributeName="cx"
              values="170;120;230;170"
              dur="18s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="300;350;270;300"
              dur="21s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="86;104;78;86"
              dur="15s"
              repeatCount="indefinite"
            />
          </circle>
          <circle fill="#7c5cff" r="70" cx="300" cy="430">
            <animate
              attributeName="cx"
              values="300;250;330;300"
              dur="19s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="430;390;470;430"
              dur="16s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>
    </div>
  );
}

/* ───────────────────────── app ───────────────────────── */

export default function App() {
  const [words, setWords] = useState([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("today");
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [passedToday, setPassedToday] = useState(0);
  const storeRef = useRef(null);
  const statsRef = useRef(null);

  // device-local daily progress counter (cards passed today)
  useEffect(() => {
    statsRef.current = createDailyStats(selectBackend());
    statsRef.current.load().then(setPassedToday);
  }, []);

  const onPass = useCallback(() => {
    if (statsRef.current) statsRef.current.bump().then(setPassedToday);
    else setPassedToday((n) => n + 1);
  }, []);

  // preload speech voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  // track auth state (cloud mode only)
  useEffect(() => {
    if (!cloudEnabled) return;
    let unsub = () => {};
    currentUser().then(setUser);
    onAuthChange(setUser).then((fn) => {
      unsub = fn;
    });
    return () => unsub();
  }, []);

  // resolve the right store on auth change (remote when signed in, else local)
  useEffect(() => {
    let alive = true;
    (async () => {
      setReady(false);
      let store;
      if (cloudEnabled && user) {
        const sb = await getSupabase();
        store = createRemoteWordStore(sb, user.id);
      } else {
        store = createWordStore(await resolveBackend());
      }
      storeRef.current = store;
      const w = await store.load().catch(() => []);
      if (alive) {
        setWords(w);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const commit = useCallback((updater) => {
    setWords((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (storeRef.current) storeRef.current.save(next);
      return next;
    });
  }, []);

  const dueByLang = LANG_KEYS.reduce((acc, l) => {
    acc[l] = words.filter((w) => w.srcLang === l && isDue(w)).length;
    return acc;
  }, {});
  const dueTotal = Object.values(dueByLang).reduce((a, b) => a + b, 0);

  return (
    <div className="vc-root">
      <AuroraBg />

      <header className="vc-header">
        <div className="vc-wordmark">되새김</div>
        <div className="vc-sub">flashcards</div>
        {cloudEnabled && <AccountBar user={user} />}
      </header>

      <main className="vc-main">
        {!ready ? (
          <div className="vc-empty">불러오는 중…</div>
        ) : session ? (
          <Review
            session={session}
            words={words}
            commit={commit}
            onPass={onPass}
            onExit={() => setSession(null)}
          />
        ) : tab === "today" ? (
          <Today
            words={words}
            dueByLang={dueByLang}
            dueTotal={dueTotal}
            passedToday={passedToday}
            onStart={(lang) => setSession({ lang, dir: "forward" })}
            onAdd={() => setTab("add")}
          />
        ) : tab === "add" ? (
          <AddWord onSave={(w) => commit((prev) => [w, ...prev])} />
        ) : (
          <WordList words={words} commit={commit} />
        )}
      </main>

      {!session && ready && (
        <nav className="vc-tabbar">
          {[
            ["today", "오늘", IconHome],
            ["add", "추가", IconPlus],
            ["list", "단어", IconStack],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              className={`vc-tab ${tab === key ? "on" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon />
              <span>{label}</span>
              {key === "today" && dueTotal > 0 && (
                <i className="vc-badge">{dueTotal}</i>
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ───────────────────────── today ───────────────────────── */

function Today({
  words,
  dueByLang,
  dueTotal,
  passedToday = 0,
  onStart,
  onAdd,
}) {
  if (words.length === 0) {
    return (
      <div className="vc-empty-state">
        <div className="vc-empty-mark">A → 가</div>
        <h2>첫 단어를 담아보세요</h2>
        <p>단어와 뜻을 저장하면 카드로 복습할 수 있어요.</p>
        <button className="vc-cta" onClick={onAdd}>
          단어 추가하기
        </button>
      </div>
    );
  }

  const goal = passedToday + dueTotal;
  const pct = goal > 0 ? Math.round((passedToday / goal) * 100) : 100;

  return (
    <div className="vc-view">
      <div className="vc-glass vc-hero">
        <div className="vc-hero-ring" style={{ "--pct": pct }}>
          <div className="vc-hero-ring-in">{pct}%</div>
        </div>
        <div className="vc-hero-lbl">오늘 복습</div>
        <div className="vc-hero-num">{dueTotal}</div>
        <div className="vc-hero-sub">
          {dueTotal > 0
            ? `${passedToday}장 완료 · ${dueTotal}장 남음`
            : goal > 0
              ? "오늘 복습 끝났어요 🎉"
              : "복습할 카드가 없어요"}
        </div>
      </div>

      <div className="vc-section-label">언어별 복습</div>
      <div className="vc-lang-grid">
        {LANG_KEYS.map((l) => {
          const total = words.filter((w) => w.srcLang === l).length;
          const due = dueByLang[l];
          return (
            <button
              key={l}
              className="vc-glass vc-langcard"
              disabled={due === 0}
              onClick={() => onStart(l)}
            >
              <span className="vc-langtag" style={{ color: LANGS[l].tint }}>
                {LANGS[l].tag}
              </span>
              <span className="vc-langname">{LANGS[l].label}</span>
              <span className="vc-langmeta">
                {total === 0 ? "단어 없음" : `${total}개 저장`}
              </span>
              <span className={`vc-duepill ${due ? "" : "ghost"}`}>
                {due ? `${due} 복습` : "완료"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── review ───────────────────────── */

function Review({ session, words, commit, onExit, onPass }) {
  const { lang } = session;
  const [dir, setDir] = useState(session.dir);
  const [queue, setQueue] = useState(() =>
    words.filter((w) => w.srcLang === lang && isDue(w)).map((w) => w.id),
  );
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const card = words.find((w) => w.id === queue[0]);

  const grade = (remembered) => {
    if (!card) return;
    commit((prev) =>
      prev.map((w) => (w.id === card.id ? schedule(w, remembered) : w)),
    );
    if (remembered) onPass?.();
    setQueue((q) => {
      const [, ...rest] = q;
      return remembered ? rest : [...rest, card.id];
    });
    setFlipped(false);
    setDone((d) => d + 1);
  };

  if (!card) {
    return (
      <div className="vc-view">
        <ReviewBar
          lang={lang}
          dir={dir}
          setDir={setDir}
          onExit={onExit}
          progress={1}
        />
        <div className="vc-empty-state slim">
          <div className="vc-empty-mark done">✓</div>
          <h2>복습 완료</h2>
          <p>{LANGS[lang].label} 카드를 모두 다뤘어요.</p>
          <button className="vc-cta" onClick={onExit}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const front = dir === "forward" ? card.word : card.meaning;
  const frontLang = dir === "forward" ? card.srcLang : card.tgtLang;
  const back = dir === "forward" ? card.meaning : card.word;
  const backLang = dir === "forward" ? card.tgtLang : card.srcLang;
  const progress = done + queue.length ? done / (done + queue.length) : 1;

  return (
    <div className="vc-view review">
      <ReviewBar
        lang={lang}
        dir={dir}
        setDir={setDir}
        onExit={onExit}
        progress={progress}
      />
      <div className="vc-remaining">{queue.length}장 남음</div>

      <div className="vc-cardwrap" onClick={() => setFlipped((f) => !f)}>
        <div className={`vc-card ${flipped ? "flipped" : ""}`}>
          <Face
            side="front"
            text={front}
            lang={frontLang}
            hint={flipped ? "" : "탭하면 뒤집혀요"}
          />
          <Face side="back" text={back} lang={backLang} accent />
        </div>
      </div>

      {!flipped ? (
        <div className="vc-review-actions">
          <button className="vc-revbtn full" onClick={() => setFlipped(true)}>
            뜻 확인
          </button>
        </div>
      ) : (
        <div className="vc-review-actions two">
          <button className="vc-revbtn forgot" onClick={() => grade(false)}>
            못 외웠어요<small>오늘 다시</small>
          </button>
          <button className="vc-revbtn got" onClick={() => grade(true)}>
            기억했어요<small>{nextIntervalDays(card.box + 1)}일 후</small>
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewBar({ dir, setDir, onExit, progress }) {
  return (
    <div className="vc-revbar">
      <button className="vc-iconbtn" onClick={onExit} aria-label="닫기">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <div className="vc-progress">
        <i style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <button
        className="vc-dirbtn"
        onClick={() => setDir((d) => (d === "forward" ? "reverse" : "forward"))}
        title="방향 전환"
      >
        {dir === "forward" ? "단어 → 뜻" : "뜻 → 단어"}
      </button>
    </div>
  );
}

function Face({ side, text, lang, hint, accent }) {
  return (
    <div className={`vc-face ${side} ${accent ? "accent" : ""}`}>
      <span className="vc-face-tag" style={{ color: LANGS[lang].tint }}>
        {LANGS[lang].label}
      </span>
      <div className="vc-face-text">{text}</div>
      <button
        className="vc-speak"
        onClick={(e) => {
          e.stopPropagation();
          speak(text, LANGS[lang].code);
        }}
        aria-label="발음 듣기"
      >
        <Speaker s={22} />
      </button>
      {hint ? <span className="vc-face-hint">{hint}</span> : null}
    </div>
  );
}

/* ───────────────────────── add word ───────────────────────── */

function AddWord({ onSave }) {
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("ko");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [saved, setSaved] = useState(false);

  const setSrc = (l) => {
    setSrcLang(l);
    if (l === tgtLang) setTgtLang(otherLang(l));
  };
  const setTgt = (l) => {
    setTgtLang(l);
    if (l === srcLang) setSrcLang(otherLang(l));
  };

  const openLookup = (url) => window.open(url, "_blank", "noopener,noreferrer");

  const save = () => {
    if (!word.trim() || !meaning.trim()) return;
    onSave(createWord({ srcLang, tgtLang, word, meaning }));
    setWord("");
    setMeaning("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="vc-view">
      <div className="vc-formrow">
        <LangPicker label="단어 언어" value={srcLang} onChange={setSrc} />
        <div className="vc-arrow">→</div>
        <LangPicker label="뜻 언어" value={tgtLang} onChange={setTgt} />
      </div>

      <div className="vc-field">
        <label>단어</label>
        <div className="vc-inputrow">
          <input
            className="vc-input"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={`${LANGS[srcLang].label} 단어 입력`}
            autoComplete="off"
          />
          <button
            className="vc-mini"
            disabled={!word.trim()}
            onClick={() => speak(word, LANGS[srcLang].code)}
            aria-label="발음"
          >
            <Speaker s={18} />
          </button>
        </div>
      </div>

      <div className="vc-lookup">
        <button
          className="vc-lookupbtn papago"
          disabled={!word.trim()}
          onClick={() => openLookup(papagoUrl(word, srcLang, tgtLang))}
        >
          Papago 번역 <span aria-hidden="true">↗</span>
        </button>
        <button
          className="vc-lookupbtn naver"
          disabled={!word.trim()}
          onClick={() => openLookup(naverDictUrl(word, srcLang))}
        >
          Naver 사전 <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div className="vc-field">
        <label>뜻</label>
        <div className="vc-inputrow">
          <input
            className="vc-input"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder={`${LANGS[tgtLang].label} 뜻 (직접 입력 가능)`}
            autoComplete="off"
          />
          <button
            className="vc-mini"
            disabled={!meaning.trim()}
            onClick={() => speak(meaning, LANGS[tgtLang].code)}
            aria-label="발음"
          >
            <Speaker s={18} />
          </button>
        </div>
      </div>

      <button
        className="vc-cta wide"
        disabled={!word.trim() || !meaning.trim()}
        onClick={save}
      >
        {saved ? "저장됐어요 ✓" : "카드 저장"}
      </button>
    </div>
  );
}

function LangPicker({ label, value, onChange }) {
  return (
    <div className="vc-lp">
      <span className="vc-lp-label">{label}</span>
      <div className="vc-lp-opts">
        {LANG_KEYS.map((l) => (
          <button
            key={l}
            className={`vc-lp-opt ${value === l ? "on" : ""}`}
            onClick={() => onChange(l)}
            style={value === l ? { borderColor: LANGS[l].tint } : undefined}
          >
            {LANGS[l].tag}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── word list ───────────────────────── */

function WordList({ words, commit }) {
  const [filter, setFilter] = useState("all");
  const list = words.filter((w) => filter === "all" || w.srcLang === filter);

  if (words.length === 0) {
    return (
      <div className="vc-view">
        <BackupBar words={words} commit={commit} />
        <div className="vc-empty-state slim">
          <p>아직 저장된 단어가 없어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vc-view">
      <BackupBar words={words} commit={commit} />
      <div className="vc-chips">
        {["all", ...LANG_KEYS].map((f) => (
          <button
            key={f}
            className={`vc-chip ${filter === f ? "on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "전체" : LANGS[f].label}
          </button>
        ))}
      </div>

      <div className="vc-list">
        {list.map((w) => (
          <div key={w.id} className="vc-glass vc-listitem">
            <div className="vc-li-tags">
              <span style={{ color: LANGS[w.srcLang].tint }}>
                {LANGS[w.srcLang].tag}
              </span>
              <span className="vc-li-arrow">→</span>
              <span style={{ color: LANGS[w.tgtLang].tint }}>
                {LANGS[w.tgtLang].tag}
              </span>
            </div>
            <div className="vc-li-body">
              <div className="vc-li-word">{w.word}</div>
              <div className="vc-li-meaning">{w.meaning}</div>
            </div>
            <div className="vc-li-side">
              <span className="vc-li-due">{dueLabel(w.due)}</span>
              <div className="vc-li-acts">
                <button
                  className="vc-mini ghost"
                  onClick={() => speak(w.word, LANGS[w.srcLang].code)}
                  aria-label="발음"
                >
                  <Speaker s={16} />
                </button>
                <button
                  className="vc-mini ghost del"
                  onClick={() =>
                    commit((prev) => prev.filter((x) => x.id !== w.id))
                  }
                  aria-label="삭제"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── account (cloud sync) ───────────────────── */

function AccountBar({ user }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (user) {
    return (
      <div className="vc-account">
        <span className="vc-account-email">{user.email}</span>
        <button className="vc-mini ghost" onClick={() => signOut()}>
          로그아웃
        </button>
      </div>
    );
  }
  return (
    <div className="vc-account">
      <input
        className="vc-account-input"
        type="email"
        placeholder="이메일로 로그인·동기화"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="vc-mini"
        disabled={!email.trim() || sent}
        onClick={async () => {
          const { error } = await signInWithEmail(email.trim());
          if (!error) setSent(true);
        }}
      >
        {sent ? "메일 확인" : "링크 받기"}
      </button>
    </div>
  );
}

/* ───────────────────── backup (export / import) ───────────────────── */

function BackupBar({ words, commit }) {
  const [open, setOpen] = useState(false);
  const download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = wordsFromJSON(String(reader.result));
        commit((prev) => mergeWords(prev, imported));
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={`vc-bk ${open ? "open" : ""}`}>
      <button
        className="vc-bk-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="vc-bk-ic">💾</span>
        <span className="vc-bk-title">백업 · 복원</span>
        <span className="vc-bk-chev">›</span>
      </button>

      {open && (
        <div className="vc-bk-body">
          <p className="vc-bk-desc">
            기기를 바꾸거나 브라우저를 정리해도 단어를 잃지 않도록 파일로 저장해요.
          </p>
          <div className="vc-bk-btns">
            <button
              className="vc-bk-btn primary"
              onClick={() =>
                download("doesaegim.json", wordsToJSON(words), "application/json")
              }
            >
              ⬇ 내 단어 백업
            </button>
            <label className="vc-bk-btn">
              ⬆ 불러오기
              <input
                type="file"
                accept=".json,application/json"
                onChange={onImport}
                hidden
              />
            </label>
          </div>
          <button
            className="vc-bk-more"
            onClick={() =>
              download("doesaegim.csv", wordsToCSV(words), "text/csv")
            }
          >
            엑셀용 CSV로 내보내기
          </button>
        </div>
      )}
    </div>
  );
}
