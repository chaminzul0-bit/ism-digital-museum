import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase, configured, uploadImage } from './supabase'
import { useAuth } from './auth'
import Crud from './Crud'
import ImportManager from './ImportManager'

const fmt = d => new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })
function useQuery(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, done: false })
  useEffect(() => { fn().then(({ data, error }) => setState({ data, error: error?.message ?? null, done: true })) }, deps)
  return state
}
const Loading = ({ s }) => s.error ? <p className="note">Алдаа: {s.error}</p> : !s.data ? <p className="empty">Ачаалж байна…</p> : null

function Layout({ children }) {
  const { user, isAdmin } = useAuth()
  const nav = useNavigate()
  const home = useLocation().pathname === '/'
  return (
    <div className="room">
      <header className="top">
        <Link to="/" className="brand">ISM <span>Digital Museum</span></Link>
        <nav>
          <NavLink to="/exhibits">Үзмэр</NavLink><NavLink to="/creators">ISM Creators</NavLink><NavLink to="/history">Түүх</NavLink><NavLink to="/timeline">Time Machine</NavLink>
          <NavLink to="/teachers">Багш нар</NavLink><NavLink to="/events">Арга хэмжээ</NavLink>
          {user && <NavLink to="/my">Миний бүтээл</NavLink>}
          {isAdmin && <NavLink to="/admin">Админ</NavLink>}
          {user ? <button className="btn ghost sm" onClick={async () => { await supabase.auth.signOut(); nav('/') }}>Гарах</button>
                : <NavLink to="/login" className="btn sm">Нэвтрэх</NavLink>}
        </nav>
      </header>
      <main className={home ? 'stage' : 'page'}>{!configured && <p className="note">Supabase холбогдоогүй байна. <code>.env</code> файлд VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY-г тохируулна уу.</p>}{children}</main>
      <footer className="foot">Мэдээллийн Системийн Менежментийн Тэнхим · Internet Programming</footer>
    </div>
  )
}

const Ico = ({ d }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
const I = { link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', prev: 'M15 18l-6-6 6-6', next: 'M9 18l6-6-6-6', expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7' }

// Нүүр: виртуал галерей — 3D карусель, голд нь сонгосон үзмэр
function Home() {
  const s = useQuery(() => supabase.from('exhibits').select('*, exhibition_categories(name), profiles(display_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(12))
  const [i, setI] = useState(0)
  const [fav, setFav] = useState(() => { try { return JSON.parse(localStorage.getItem('fav') || '[]') } catch { return [] } })
  const nav = useNavigate()
  const list = s.data || []
  const go = d => setI(v => Math.min(list.length - 1, Math.max(0, v + d)))
  useEffect(() => {
    const k = e => e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [list.length])
  if (!s.data) return <Loading s={s} />
  if (list.length === 0) return <div className="glass empty-stage"><h1>ISM Digital Museum</h1><p>Үзмэр хараахан нэмэгдээгүй байна. Нэвтэрч өөрийн бүтээлийг нэмээрэй.</p><Link className="btn" to="/login">Нэвтрэх</Link></div>
  const cur = list[i]
  const toggleFav = () => { const n = fav.includes(cur.id) ? fav.filter(x => x !== cur.id) : [...fav, cur.id]; setFav(n); try { localStorage.setItem('fav', JSON.stringify(n)) } catch {} }
  return (
    <>
      <section className="hero">
        <span className="eyebrow">Information Systems Management · Digital Archive</span>
        <h1>Мэдлэг, бүтээл, түүхийг нэг дороос.</h1>
        <p>ISM тэнхимийн оюутнуудын бүтээл, багш нар, арга хэмжээ болон түүхэн дурсамжийг интерактив дижитал музейгээр нээн үзээрэй.</p>
        <div className="row"><Link className="btn" to="/exhibits">Үзэсгэлэн үзэх</Link><Link className="btn ghost" to="/timeline">Time Machine рүү</Link></div>
      </section>
      <div className="carousel" aria-roledescription="carousel">
        {list.map((e, idx) => {
          const d = idx - i
          if (Math.abs(d) > 2) return null
          return (
            <article key={e.id} className={'slide glass ' + (d === 0 ? 'cur' : '')} style={{ '--d': d }} onClick={() => d !== 0 && setI(idx)} aria-hidden={d !== 0}>
              <Img src={e.image_url} alt={e.title} />
              {d === 0 && <>
                <Link className="expand glass-sm" to={`/exhibits/${e.id}`}><Ico d={I.expand} /> Дэлгэрэнгүй</Link>
                <div className="cap glass-sm">
                  <div className="capline"><h2>{e.title}</h2><time>{e.year_created}</time></div>
                  <blockquote>{e.description}</blockquote>
                  <small>Ангилал: {e.exhibition_categories?.name || '—'}<br />Технологи: {(e.technology_stack || []).join(', ') || '—'}</small>
                </div>
              </>}
            </article>)
        })}
      </div>
      <div className="side glass-sm" role="toolbar" aria-label="Үзмэрийн үйлдэл">
        <a href={cur.demo_url || cur.github_url || '#'} target="_blank" rel="noreferrer" title="Demo / GitHub" aria-label="Demo эсвэл GitHub нээх"><Ico d={I.link} /></a>
        <button onClick={toggleFav} title="Дуртай" aria-label="Дуртай болгох" aria-pressed={fav.includes(cur.id)} className={fav.includes(cur.id) ? 'on' : ''}><Ico d={I.heart} /></button>
        <button onClick={() => nav('/my')} title="Миний бүтээл" aria-label="Миний бүтээл"><Ico d={I.user} /></button>
      </div>
      <div className="artist glass-sm">
        <button onClick={() => go(-1)} disabled={i === 0} aria-label="Өмнөх"><Ico d={I.prev} /></button>
        <span className="avatar">{(cur.profiles?.display_name || '?')[0].toUpperCase()}</span>
        <div className="who"><b>{cur.profiles?.display_name || 'Бүтээгч'}</b><small>{cur.year_created} он · {i + 1} / {list.length}</small></div>
        <Link to="/exhibits" aria-label="Хайх"><Ico d={I.search} /></Link>
        <button onClick={() => go(1)} disabled={i === list.length - 1} aria-label="Дараах"><Ico d={I.next} /></button>
      </div>
    </>
  )
}

const Img = ({ src, alt }) => src ? <img src={src} alt={alt} loading="lazy" /> : <div className="ph" aria-hidden>ISM</div>
const ExhibitCard = ({ e }) => (
  <Link to={`/exhibits/${e.id}`} className="card">
    <Img src={e.image_url} alt={e.title} />
    <div><small>{e.exhibition_categories?.name || 'Ангилалгүй'}{e.year_created && ` · ${e.year_created}`}</small><h3>{e.title}</h3></div>
  </Link>
)
const EventCard = ({ e }) => (
  <Link to={`/events/${e.id}`} className="card">
    <Img src={e.cover_image_url} alt={e.title} />
    <div><small>{fmt(e.event_date)}</small><h3>{e.title}</h3></div>
  </Link>
)

function Exhibits() {
  const s = useQuery(() => supabase.from('exhibits').select('*, exhibition_categories(name), profiles(display_name)').eq('status', 'published').order('year_created', { ascending: false }))
  const cats = useQuery(() => supabase.from('exhibition_categories').select('*').order('name'))
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [year, setYear] = useState(''), [tech, setTech] = useState('')
  const techs = useMemo(() => [...new Set((s.data || []).flatMap(e => e.technology_stack || []))].sort(), [s.data])
  const years = useMemo(() => [...new Set((s.data || []).map(e => e.year_created).filter(Boolean))].sort((a, b) => b - a), [s.data])
  const list = (s.data || []).filter(e => {
    const t = q.trim().toLowerCase()
    const hit = !t || [e.title, e.description, e.profiles?.display_name, ...(e.technology_stack || [])].join(' ').toLowerCase().includes(t)
    return hit && (!cat || e.category_id === cat) && (!year || String(e.year_created) === year) && (!tech || (e.technology_stack || []).includes(tech))
  })
  return (
    <>
      <h1>Дижитал үзэсгэлэн</h1>
      <div className="filters">
        <input type="search" placeholder="Нэр, бүтээгч, тайлбар эсвэл технологиор хайх" value={q} onChange={e => setQ(e.target.value)} aria-label="Хайлт" />
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Ангилал"><option value="">Бүх ангилал</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={year} onChange={e => setYear(e.target.value)} aria-label="Он"><option value="">Бүх он</option>{years.map(y => <option key={y}>{y}</option>)}</select>
      </div>
      {techs.length > 0 && <div className="row" aria-label="Технологиор шүүх">{techs.map(t => <button key={t} className={'chip ' + (tech === t ? 'on' : '')} aria-pressed={tech === t} onClick={() => setTech(tech === t ? '' : t)}>{t}</button>)}</div>}
      {(q || cat || year || tech) && <button className="btn ghost sm" onClick={() => { setQ(''); setCat(''); setYear(''); setTech('') }}>Шүүлтүүр цэвэрлэх</button>}
      {s.data && <p className="meta">{list.length} үзмэр олдлоо</p>}
      <Loading s={s} />
      {s.data && list.length === 0 && <p className="empty">“{q || 'сонгосон шүүлтүүр'}”-д тохирох үзмэр олдсонгүй. Хайлтаа өөрчилж эсвэл шүүлтүүрийг цэвэрлээд үзнэ үү.</p>}
      <div className="grid">{list.map(e => <ExhibitCard key={e.id} e={e} />)}</div>
    </>
  )
}

function ExhibitDetail() {
  const { id } = useParams()
  const s = useQuery(() => supabase.from('exhibits').select('*, exhibition_categories(name), profiles(display_name)').eq('id', id).maybeSingle(), [id])
  if (s.done && !s.data && !s.error) return <p className="empty">Үзмэр олдсонгүй. <Link to="/exhibits">Жагсаалт руу буцах</Link></p>
  if (!s.data) return <Loading s={s} />
  const e = s.data
  return (
    <article className="detail">
      <Link to="/exhibits">← Бүх үзмэр</Link>
      <h1>{e.title}</h1>
      <p className="meta">{e.exhibition_categories?.name} · {e.year_created} · Бүтээгч: <Link to={`/creators/${e.creator_id}`}>{e.profiles?.display_name}</Link></p>
      <Img src={e.image_url} alt={e.title} />
      <p className="prose">{e.description}</p>
      <div className="row">{(e.technology_stack || []).map(t => <span className="tag" key={t}>{t}</span>)}</div>
      <div className="row">{e.demo_url && <a className="btn" href={e.demo_url} target="_blank" rel="noreferrer">Demo үзэх</a>}{e.github_url && <a className="btn ghost" href={e.github_url} target="_blank" rel="noreferrer">GitHub</a>}</div>
    </article>
  )
}

function Teachers() {
  const s = useQuery(() => supabase.from('teachers').select('*').order('name'))
  return (<><h1>Тэнхимийн багш нар</h1><Loading s={s} />
    {s.data?.length === 0 && <p className="empty">Багшийн мэдээлэл хараахан нэмэгдээгүй байна.</p>}
    <div className="grid">{s.data?.map(t => (
      <div className="card static" key={t.id}><Img src={t.photo_url} alt={t.name} />
        <div><small>{t.position}</small><h3>{t.name}</h3><p><b>Хичээл:</b> {t.courses}</p><p>{t.bio}</p></div></div>))}</div></>)
}

function Events() {
  const s = useQuery(() => supabase.from('events').select('*').order('event_date', { ascending: false }))
  return (<><h1>Өдөрлөг ба арга хэмжээ</h1><Loading s={s} />
    {s.data?.length === 0 && <p className="empty">Арга хэмжээ хараахан нэмэгдээгүй байна.</p>}
    <div className="grid">{s.data?.map(e => <EventCard key={e.id} e={e} />)}</div></>)
}
function EventDetail() {
  const { id } = useParams()
  const ev = useQuery(() => supabase.from('events').select('*').eq('id', id).maybeSingle(), [id])
  const ph = useQuery(() => supabase.from('event_photos').select('*').eq('event_id', id).order('created_at'), [id])
  const [open, setOpen] = useState(null)
  if (ev.done && !ev.data && !ev.error) return <p className="empty">Арга хэмжээ олдсонгүй. <Link to="/events">Жагсаалт руу буцах</Link></p>
  if (!ev.data) return <Loading s={ev} />
  return (<article className="detail"><Link to="/events">← Бүх арга хэмжээ</Link>
    <h1>{ev.data.title}</h1><p className="meta">{fmt(ev.data.event_date)}</p><p className="prose">{ev.data.description}</p>
    <h2>Зурагт цомог</h2>
    {ph.data?.length === 0 && <p className="empty">Энэ арга хэмжээний зураг нэмэгдээгүй байна.</p>}
    <div className="gallery">{ph.data?.map(p => <button key={p.id} onClick={() => setOpen(p)}><img src={p.image_url} alt={p.caption || ev.data.title} loading="lazy" /></button>)}</div>
    {open && <div className="lightbox" onClick={() => setOpen(null)} role="dialog"><img src={open.image_url} alt={open.caption || ''} /><p>{open.caption}</p></div>}
  </article>)
}

// Бүтээлч шийдэл: ISM Time Machine — түүх, арга хэмжээ, үзмэрийг он цагийн дарааллаар нэг шугаманд
function Timeline() {
  const h = useQuery(() => supabase.from('history_entries').select('*'))
  const e = useQuery(() => supabase.from('events').select('*'))
  const x = useQuery(() => supabase.from('exhibits').select('*').eq('status', 'published'))
  const [kinds, setKinds] = useState({ history: true, event: true, exhibit: true })
  const [from, setFrom] = useState(null)
  const items = useMemo(() => {
    if (!h.data || !e.data || !x.data) return null
    return [
      ...h.data.map(i => ({ id: 'h' + i.id, kind: 'history', year: i.year, title: i.title, desc: i.description })),
      ...e.data.map(i => ({ id: 'e' + i.id, kind: 'event', year: new Date(i.event_date).getFullYear(), title: i.title, desc: i.description, img: i.cover_image_url, to: `/events/${i.id}` })),
      ...x.data.filter(i => i.year_created).map(i => ({ id: 'x' + i.id, kind: 'exhibit', year: i.year_created, title: i.title, desc: i.description, img: i.image_url, to: `/exhibits/${i.id}` })),
    ].sort((a, b) => a.year - b.year)
  }, [h.data, e.data, x.data])
  const err = h.error || e.error || x.error
  if (err) return <p className="note">Алдаа: {err}</p>
  if (!items) return <p className="empty">Ачаалж байна…</p>
  const min = items[0]?.year ?? 2010, max = items.at(-1)?.year ?? new Date().getFullYear()
  const start = from ?? min
  const shown = items.filter(i => kinds[i.kind] && i.year >= start)
  const label = { history: 'Түүх', event: 'Арга хэмжээ', exhibit: 'Үзмэр' }
  return (
    <>
      <h1>ISM Time Machine</h1>
      <p className="prose">Гулсуураар он сонгож, тэнхимийн замналыг дагана уу.</p>
      <div className="panel scrub">
        <label>{start} оноос хойш<input type="range" min={min} max={max} value={start} onChange={ev => setFrom(+ev.target.value)} disabled={min === max} /></label>
        <div className="row">{Object.keys(label).map(k => <button key={k} className={'chip ' + (kinds[k] ? 'on' : '')} aria-pressed={kinds[k]} onClick={() => setKinds(s => ({ ...s, [k]: !s[k] }))}>{label[k]}</button>)}</div>
      </div>
      <TechEvolution exhibits={x.data.filter(i => i.year_created >= start)} />
      {shown.length === 0 && <p className="empty">Энэ хугацаанд тохирох үйл явдал олдсонгүй. Гулсуурыг зүүн тийш татаж үзнэ үү.</p>}
      <ol className="tl">
        {shown.map(i => (
          <li key={i.id} className={'k-' + i.kind}>
            <span className="yr">{i.year}</span>
            <div className="tlc"><small>{label[i.kind]}</small>
              <h3>{i.to ? <Link to={i.to}>{i.title}</Link> : i.title}</h3>
              {i.img && <img src={i.img} alt={i.title} loading="lazy" />}
              <p>{i.desc}</p></div>
          </li>))}
      </ol>
    </>
  )
}

// Нэмэлт бүтээлч шийдэл: Technology Evolution — он бүрийн бүтээлд ашигласан технологийн өөрчлөлт
function TechEvolution({ exhibits }) {
  const [open, setOpen] = useState(true)
  const data = useMemo(() => {
    const total = {}, byYear = {}
    exhibits.forEach(e => (e.technology_stack || []).forEach(t => { total[t] = (total[t] || 0) + 1; ((byYear[e.year_created] ||= {})[t] = (byYear[e.year_created][t] || 0) + 1) }))
    const top = Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const years = Object.keys(byYear).sort()
    return { top, years, byYear, max: top[0]?.[1] || 1 }
  }, [exhibits])
  if (data.top.length === 0) return null
  return (
    <section className="panel tech">
      <button className="chip on" onClick={() => setOpen(!open)} aria-expanded={open}>Technology Evolution {open ? '−' : '+'}</button>
      {open && <div className="tech-grid">
        <div><h3>Хамгийн их ашигласан</h3>
          {data.top.map(([t, n]) => <div className="bar" key={t}><span>{t}</span><i style={{ width: (n / data.max * 100) + '%' }} /><b>{n}</b></div>)}</div>
        <div><h3>Он бүрээр</h3>
          <table className="heat"><thead><tr><th></th>{data.years.map(y => <th key={y}>{y}</th>)}</tr></thead>
            <tbody>{data.top.map(([t]) => <tr key={t}><th>{t}</th>{data.years.map(y => { const n = data.byYear[y][t] || 0; return <td key={y} style={{ '--a': n / data.max }} title={`${y}: ${t} — ${n} бүтээл`}>{n || ''}</td> })}</tr>)}</tbody></table></div>
      </div>}
    </section>)
}

function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ email: '', password: '', name: '' })
  const [msg, setMsg] = useState('')
  async function submit(e) {
    e.preventDefault(); setMsg('')
    if (f.password.length < 6) return setMsg('Нууц үг дор хаяж 6 тэмдэгт байна.')
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { display_name: f.name || f.email.split('@')[0] } } })
    if (error) return setMsg(error.message)
    if (mode === 'signup') { const { data } = await supabase.auth.getSession(); if (!data.session) return setMsg('Бүртгэл үүслээ. Имэйлээ баталгаажуулаад нэвтэрнэ үү.') }
    nav('/my')
  }
  return (
    <form className="panel form narrow" onSubmit={submit}>
      <h1>{mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h1>
      {mode === 'signup' && <label>Нэр<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>}
      <label>Имэйл<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>Нууц үг<input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      {msg && <p className="note" role="alert">{msg}</p>}
      <button className="btn">{mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}</button>
      <button type="button" className="btn ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Шинэ бүртгэл үүсгэх' : 'Бүртгэлтэй юу? Нэвтрэх'}</button>
    </form>
  )
}

const Guard = ({ admin, children }) => {
  const { user, ready, isAdmin, profile } = useAuth()
  if (!ready) return <p className="empty">Ачаалж байна…</p>
  if (!user) return <Navigate to="/login" replace />
  if (admin && profile && !isAdmin) return <p className="note">Энэ хуудас зөвхөн администраторт нээлттэй.</p>
  return children
}

const exhibitFields = [
  { key: 'title', label: 'Бүтээлийн нэр', required: true },
  { key: 'description', label: 'Тайлбар', type: 'textarea', required: true },
  { key: 'image_url', label: 'Зураг', type: 'image' },
  { key: 'category_id', label: 'Ангилал', ref: ['exhibition_categories', 'name'] },
  { key: 'technology_stack', label: 'Ашигласан технологи (таслалаар)', type: 'tags' },
  { key: 'year_created', label: 'Бүтээсэн он', type: 'number', required: true },
  { key: 'demo_url', label: 'Demo холбоос', type: 'url' },
  { key: 'github_url', label: 'GitHub холбоос', type: 'url' },
  { key: 'status', label: 'Төлөв', options: [{ value: 'published', label: 'Нийтлэх' }, { value: 'draft', label: 'Ноорог' }] },
]
const MyWorks = () => <Guard><h1>Миний бүтээл</h1><ProfileEditor /><h2>Бүтээлүүд</h2><p className="prose">Зөвхөн өөрийн бүтээлийг нэмэх, засах, устгах боломжтой (RLS-ээр хамгаалагдсан).</p><Crud table="exhibits" fields={exhibitFields} owner /></Guard>

// ISM Creators: оюутан өөрийн танилцуулгыг засна (profiles — RLS: зөвхөн өөрийн мөр)
function ProfileEditor() {
  const { user, profile, refreshProfile } = useAuth()
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (profile) setF({ display_name: profile.display_name || '', major: profile.major || '', bio: profile.bio || '', github_url: profile.github_url || '', avatar_url: profile.avatar_url || '' }) }, [profile])
  if (!f) return null
  async function onFile(file) {
    if (!file) return
    setBusy(true); setMsg('')
    try { setF(v => ({ ...v, avatar_url: '' })); const url = await uploadImage(file, user.id); setF(v => ({ ...v, avatar_url: url })) } catch (e) { setMsg('Зураг оруулахад алдаа: ' + e.message) }
    setBusy(false)
  }
  async function save(e) {
    e.preventDefault(); setMsg('')
    if (!f.display_name.trim()) return setMsg('Нэрээ оруулна уу.')
    if (f.github_url && !/^https?:\/\//.test(f.github_url)) return setMsg('GitHub холбоос http(s):// -ээр эхэлнэ.')
    setBusy(true)
    // migration_v2 ажиллаагүй (bio/major/github_url багана байхгүй) үед зөвхөн байгаа баганыг илгээнэ
    const payload = Object.fromEntries(Object.entries(f).filter(([k]) => k in profile).map(([k, v]) => [k, v.trim() || null]))
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setBusy(false)
    if (error) return setMsg('Хадгалж чадсангүй: ' + error.message)
    setMsg('Профайл хадгалагдлаа.'); refreshProfile()
  }
  return (
    <details className="panel" open={!profile.bio}>
      <summary><b>Миний Creator профайл</b> <small>— ISM Creators хуудсанд харагдана · <Link to={`/creators/${user.id}`}>Нийтийн профайл харах</Link></small></summary>
      <form className="form" onSubmit={save}>
        {!('bio' in profile) && <p className="note">Танилцуулга, хөтөлбөр, GitHub талбарыг хадгалахын тулд админ Supabase дээр <code>supabase/migration_v2.sql</code>-г ажиллуулна уу.</p>}
        <label>Нэр *<input value={f.display_name} onChange={e => setF({ ...f, display_name: e.target.value })} /></label>
        <label>Хөтөлбөр / курс<input value={f.major} placeholder="МСМ, 3-р курс" onChange={e => setF({ ...f, major: e.target.value })} /></label>
        <label>Товч танилцуулга<textarea rows="3" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></label>
        <label>GitHub<input type="url" value={f.github_url} placeholder="https://github.com/..." onChange={e => setF({ ...f, github_url: e.target.value })} /></label>
        <label>Профайл зураг<input type="file" accept="image/*" onChange={e => onFile(e.target.files[0])} />{f.avatar_url && <img className="thumb" src={f.avatar_url} alt="Профайл зураг" />}</label>
        {msg && <p className="note" role="status">{msg}</p>}
        <div className="row"><button className="btn" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Профайл хадгалах'}</button></div>
      </form>
    </details>)
}

// ISM Creators — оюутан ба бүтээлийг холбох
const Avatar = ({ p, big }) => p?.avatar_url ? <img className={'avatar' + (big ? ' big' : '')} src={p.avatar_url} alt={p.display_name} /> : <span className={'avatar' + (big ? ' big' : '')}>{(p?.display_name || '?')[0].toUpperCase()}</span>
function Creators() {
  const s = useQuery(() => supabase.from('profiles').select('*, exhibits(id, status, technology_stack)').order('display_name'))
  const [q, setQ] = useState('')
  const list = (s.data || []).map(p => ({ ...p, works: (p.exhibits || []).filter(x => x.status === 'published') })).filter(p => p.works.length > 0 || p.bio)
    .filter(p => !q.trim() || [p.display_name, p.major, p.bio, ...p.works.flatMap(w => w.technology_stack || [])].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
  return (<>
    <h1>ISM Creators</h1>
    <p className="prose">Тэнхимийн оюутнууд болон тэдний бүтээлүүд. Бүтээгч дээр дарж бүх бүтээлийг нь үзнэ үү.</p>
    <div className="filters one"><input type="search" placeholder="Нэр, хөтөлбөр эсвэл технологиор хайх" value={q} onChange={e => setQ(e.target.value)} aria-label="Бүтээгч хайх" /></div>
    <Loading s={s} />
    {s.data && list.length === 0 && <p className="empty">{q ? `“${q}”-д тохирох бүтээгч олдсонгүй.` : 'Бүтээгч хараахан алга. Бүртгүүлээд эхний бүтээлээ нэмээрэй.'}</p>}
    <div className="grid">{list.map(p => (
      <Link to={`/creators/${p.id}`} className="card creator" key={p.id}>
        <div><Avatar p={p} /><h3>{p.display_name}</h3><small>{p.major || 'ISM Creator'} · {p.works.length} бүтээл</small>{p.bio && <p>{p.bio}</p>}</div>
      </Link>))}</div>
  </>)
}
function CreatorDetail() {
  const { id } = useParams()
  const p = useQuery(() => supabase.from('profiles').select('*').eq('id', id).maybeSingle(), [id])
  const w = useQuery(() => supabase.from('exhibits').select('*, exhibition_categories(name)').eq('creator_id', id).eq('status', 'published').order('year_created', { ascending: false }), [id])
  if (p.done && !p.data && !p.error) return <p className="empty">Бүтээгч олдсонгүй. <Link to="/creators">Жагсаалт руу буцах</Link></p>
  if (!p.data) return <Loading s={p} />
  const techs = [...new Set((w.data || []).flatMap(e => e.technology_stack || []))]
  return (<article className="detail">
    <Link to="/creators">← Бүх бүтээгч</Link>
    <div className="creator-head"><Avatar p={p.data} big /><div><h1>{p.data.display_name}</h1><p className="meta">{p.data.major || 'ISM Creator'} · {w.data?.length ?? 0} бүтээл</p></div></div>
    {p.data.bio && <p className="prose">{p.data.bio}</p>}
    <div className="row">{techs.map(t => <span className="tag" key={t}>{t}</span>)}</div>
    {p.data.github_url && <a className="btn ghost" href={p.data.github_url} target="_blank" rel="noreferrer">GitHub</a>}
    <h2>Бүтээлүүд</h2><Loading s={w} />
    {w.data?.length === 0 && <p className="empty">Нийтлэгдсэн бүтээл алга.</p>}
    <div className="grid">{w.data?.map(e => <ExhibitCard key={e.id} e={e} />)}</div>
  </article>)
}

// Тэнхимийн түүх — хөгжлийн үе шатууд (history_entries-ээс арван жилээр бүлэглэнэ)
function History() {
  const s = useQuery(() => supabase.from('history_entries').select('*').order('year'))
  const groups = useMemo(() => {
    const g = {}
    ;(s.data || []).forEach(h => { const k = Math.floor(h.year / 10) * 10; (g[k] ||= []).push(h) })
    return Object.entries(g)
  }, [s.data])
  return (<>
    <h1>Тэнхимийн түүх</h1>
    <p className="prose">Мэдээллийн Системийн Менежментийн тэнхимийн үүсэл, онцлох үйл явдал, хөгжлийн үе шатууд. Бүх үйл явдлыг арга хэмжээ, бүтээлтэй хамт <Link to="/timeline">ISM Time Machine</Link>-ээс үзнэ үү.</p>
    <Loading s={s} />
    {s.data?.length === 0 && <p className="empty">Түүхэн мэдээлэл хараахан нэмэгдээгүй байна.</p>}
    {groups.map(([dec, items], n) => (
      <section key={dec} className="era">
        <p className="era-no">Үе шат {String(n + 1).padStart(2, '0')}</p><h2>{dec}-аад он</h2>
        <ol className="tl">{items.map(h => <li key={h.id} className="k-history"><span className="yr">{h.year}</span><div className="tlc"><h3>{h.title}</h3><p>{h.description}</p></div></li>)}</ol>
      </section>))}
  </>)
}

const adminTabs = {
  'Үзмэр хянах': ['exhibits', exhibitFields, 'created_at'],
  'Багш нар': ['teachers', [{ key: 'name', label: 'Нэр', required: true }, { key: 'position', label: 'Албан тушаал' }, { key: 'courses', label: 'Заадаг хичээл' }, { key: 'bio', label: 'Танилцуулга', type: 'textarea' }, { key: 'photo_url', label: 'Зураг', type: 'image' }], 'name'],
  'Арга хэмжээ': ['events', [{ key: 'title', label: 'Нэр', required: true }, { key: 'event_date', label: 'Огноо', type: 'date', required: true }, { key: 'description', label: 'Тайлбар', type: 'textarea' }, { key: 'cover_image_url', label: 'Нүүр зураг', type: 'image' }], 'event_date'],
  'Зурагт цомог': ['event_photos', [{ key: 'caption', label: 'Тайлбар' }, { key: 'event_id', label: 'Арга хэмжээ', ref: ['events', 'title'], required: true }, { key: 'image_url', label: 'Зураг', type: 'image', required: true }]],
  'Түүх': ['history_entries', [{ key: 'title', label: 'Гарчиг', required: true }, { key: 'year', label: 'Он', type: 'number', required: true }, { key: 'description', label: 'Тайлбар', type: 'textarea' }], 'year'],
  'Ангилал': ['exhibition_categories', [{ key: 'name', label: 'Нэр', required: true }, { key: 'description', label: 'Тайлбар' }]],
}
function Admin() {
  const [tab, setTab] = useState('Үзмэр хянах')
  const [t, fields, order] = adminTabs[tab] || []
  return (<Guard admin><h1>Админ самбар</h1>
    <div className="row">{[...Object.keys(adminTabs), 'UFE импорт'].map(k => <button key={k} className={'chip ' + (k === tab ? 'on' : '')} onClick={() => setTab(k)}>{k}</button>)}</div>
    {tab === 'UFE импорт' ? <ImportManager /> : <Crud key={t} table={t} fields={fields} order={order} />}</Guard>)
}

export default function App() {
  return (
    <Layout><Routes>
      <Route path="/" element={<Home />} /><Route path="/exhibits" element={<Exhibits />} /><Route path="/exhibits/:id" element={<ExhibitDetail />} />
      <Route path="/timeline" element={<Timeline />} /><Route path="/history" element={<History />} />
      <Route path="/creators" element={<Creators />} /><Route path="/creators/:id" element={<CreatorDetail />} /><Route path="/teachers" element={<Teachers />} />
      <Route path="/events" element={<Events />} /><Route path="/events/:id" element={<EventDetail />} />
      <Route path="/login" element={<Login />} /><Route path="/my" element={<MyWorks />} /><Route path="/admin" element={<Admin />} />
      <Route path="*" element={<p className="empty">Хуудас олдсонгүй. <Link to="/">Нүүр хуудас руу буцах</Link></p>} />
    </Routes></Layout>
  )
}
