import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase, configured } from './supabase'
import { useAuth } from './auth'
import Crud from './Crud'

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
          <NavLink to="/exhibits">Үзмэр</NavLink><NavLink to="/timeline">Time Machine</NavLink>
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
  const s = useQuery(() => supabase.from('exhibits').select('*, exhibition_categories(name)').eq('status', 'published').order('year_created', { ascending: false }))
  const cats = useQuery(() => supabase.from('exhibition_categories').select('*').order('name'))
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [year, setYear] = useState('')
  const years = useMemo(() => [...new Set((s.data || []).map(e => e.year_created).filter(Boolean))].sort((a, b) => b - a), [s.data])
  const list = (s.data || []).filter(e => {
    const t = q.trim().toLowerCase()
    const hit = !t || [e.title, e.description, ...(e.technology_stack || [])].join(' ').toLowerCase().includes(t)
    return hit && (!cat || e.category_id === cat) && (!year || String(e.year_created) === year)
  })
  return (
    <>
      <h1>Дижитал үзэсгэлэн</h1>
      <div className="filters">
        <input type="search" placeholder="Нэр, тайлбар эсвэл технологиор хайх" value={q} onChange={e => setQ(e.target.value)} aria-label="Хайлт" />
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Ангилал"><option value="">Бүх ангилал</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={year} onChange={e => setYear(e.target.value)} aria-label="Он"><option value="">Бүх он</option>{years.map(y => <option key={y}>{y}</option>)}</select>
      </div>
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
      <p className="meta">{e.exhibition_categories?.name} · {e.year_created} · Бүтээгч: {e.profiles?.display_name}</p>
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
const MyWorks = () => <Guard><h1>Миний бүтээл</h1><p className="prose">Зөвхөн өөрийн бүтээлийг нэмэх, засах, устгах боломжтой (RLS-ээр хамгаалагдсан).</p><Crud table="exhibits" fields={exhibitFields} owner /></Guard>

const adminTabs = {
  'Багш нар': ['teachers', [{ key: 'name', label: 'Нэр', required: true }, { key: 'position', label: 'Албан тушаал' }, { key: 'courses', label: 'Заадаг хичээл' }, { key: 'bio', label: 'Танилцуулга', type: 'textarea' }, { key: 'photo_url', label: 'Зураг', type: 'image' }], 'name'],
  'Арга хэмжээ': ['events', [{ key: 'title', label: 'Нэр', required: true }, { key: 'event_date', label: 'Огноо', type: 'date', required: true }, { key: 'description', label: 'Тайлбар', type: 'textarea' }, { key: 'cover_image_url', label: 'Нүүр зураг', type: 'image' }], 'event_date'],
  'Зурагт цомог': ['event_photos', [{ key: 'caption', label: 'Тайлбар' }, { key: 'event_id', label: 'Арга хэмжээ', ref: ['events', 'title'], required: true }, { key: 'image_url', label: 'Зураг', type: 'image', required: true }]],
  'Түүх': ['history_entries', [{ key: 'title', label: 'Гарчиг', required: true }, { key: 'year', label: 'Он', type: 'number', required: true }, { key: 'description', label: 'Тайлбар', type: 'textarea' }], 'year'],
  'Ангилал': ['exhibition_categories', [{ key: 'name', label: 'Нэр', required: true }, { key: 'description', label: 'Тайлбар' }]],
}
function Admin() {
  const [tab, setTab] = useState('Багш нар')
  const [t, fields, order] = adminTabs[tab]
  return (<Guard admin><h1>Админ самбар</h1>
    <div className="row">{Object.keys(adminTabs).map(k => <button key={k} className={'chip ' + (k === tab ? 'on' : '')} onClick={() => setTab(k)}>{k}</button>)}</div>
    <Crud key={t} table={t} fields={fields} order={order} /></Guard>)
}

export default function App() {
  return (
    <Layout><Routes>
      <Route path="/" element={<Home />} /><Route path="/exhibits" element={<Exhibits />} /><Route path="/exhibits/:id" element={<ExhibitDetail />} />
      <Route path="/timeline" element={<Timeline />} /><Route path="/teachers" element={<Teachers />} />
      <Route path="/events" element={<Events />} /><Route path="/events/:id" element={<EventDetail />} />
      <Route path="/login" element={<Login />} /><Route path="/my" element={<MyWorks />} /><Route path="/admin" element={<Admin />} />
      <Route path="*" element={<p className="empty">Хуудас олдсонгүй. <Link to="/">Нүүр хуудас руу буцах</Link></p>} />
    </Routes></Layout>
  )
}
