import { useEffect, useState } from 'react'
import { supabase, uploadImage } from './supabase'
import { useAuth } from './auth'

// Нэг дахин ашиглагдах CRUD компонент: оюутны "Миний бүтээл" болон админ самбар хоёулаа ашиглана.
export default function Crud({ table, fields, owner = false, select = '*', order = 'created_at' }) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [refs, setRefs] = useState({})
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    let q = supabase.from(table).select(select).order(order, { ascending: false })
    if (owner) q = q.eq('creator_id', user.id)
    const { data, error } = await q
    if (error) setMsg('Алдаа: ' + error.message); else setRows(data)
  }
  useEffect(() => {
    load()
    fields.filter(f => f.ref).forEach(async f => {
      const [t, label] = f.ref
      const { data } = await supabase.from(t).select(`id, ${label}`).order(label)
      setRefs(r => ({ ...r, [f.key]: (data || []).map(d => ({ value: d.id, label: d[label] })) }))
    })
  }, [table])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function onFile(k, file) {
    if (!file) return
    setBusy(true); setMsg('')
    try { set(k, await uploadImage(file, user.id)) } catch (e) { setMsg('Зураг оруулахад алдаа: ' + e.message) }
    setBusy(false)
  }

  async function save(e) {
    e.preventDefault(); setMsg('')
    const missing = fields.find(f => f.required && !String(form[f.key] ?? '').trim())
    if (missing) return setMsg(`"${missing.label}" талбарыг бөглөнө үү.`)
    const payload = {}
    fields.forEach(f => {
      let v = form[f.key]
      if (f.type === 'tags') v = Array.isArray(v) ? v : String(v || '').split(',').map(s => s.trim()).filter(Boolean)
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v)
      if (v === '') v = null
      payload[f.key] = v
    })
    if (owner) payload.creator_id = user.id
    setBusy(true)
    const { error } = form.id
      ? await supabase.from(table).update(payload).eq('id', form.id)
      : await supabase.from(table).insert(payload)
    setBusy(false)
    if (error) return setMsg('Хадгалж чадсангүй: ' + error.message)
    setForm(null); setMsg('Хадгалагдлаа.'); load()
  }

  async function remove(r) {
    if (!confirm('Энэ бичлэгийг устгах уу?')) return
    const { error } = await supabase.from(table).delete().eq('id', r.id)
    if (error) setMsg('Устгаж чадсангүй: ' + error.message); else { setMsg('Устгагдлаа.'); load() }
  }

  const title = r => r[fields[0].key] || r.caption || r.id
  return (
    <div>
      <button className="btn" onClick={() => { setForm({}); setMsg('') }}>Шинээр нэмэх</button>
      {msg && <p className="note" role="status">{msg}</p>}
      {form && (
        <form className="panel form" onSubmit={save}>
          {fields.map(f => (
            <label key={f.key}>{f.label}{f.required && ' *'}
              {f.type === 'textarea' ? <textarea rows="4" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
              : f.type === 'image' ? (<>
                  <input type="file" accept="image/*" onChange={e => onFile(f.key, e.target.files[0])} />
                  {form[f.key] && <img className="thumb" src={form[f.key]} alt="Оруулсан зураг" />}</>)
              : f.options || f.ref ? (
                  <select value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}>
                    <option value="">— сонгох —</option>
                    {(f.options || refs[f.key] || []).map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>)
              : <input type={f.type === 'tags' || !f.type ? 'text' : f.type}
                  value={f.type === 'tags' && Array.isArray(form[f.key]) ? form[f.key].join(', ') : form[f.key] ?? ''}
                  placeholder={f.type === 'tags' ? 'React, Supabase' : ''} onChange={e => set(f.key, e.target.value)} />}
            </label>
          ))}
          <div className="row">
            <button className="btn" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Болих</button>
          </div>
        </form>
      )}
      {rows.length === 0 && !form && <p className="empty">Одоогоор бичлэг алга. “Шинээр нэмэх” товчоор эхлүүлнэ үү.</p>}
      <ul className="list">
        {rows.map(r => (
          <li key={r.id}>
            <span>{title(r)}{r.status === 'draft' && <em className="tag"> ноорог</em>}</span>
            <span className="row">
              <button className="btn ghost sm" onClick={() => { setForm({ ...r }); setMsg('') }}>Засах</button>
              <button className="btn danger sm" onClick={() => remove(r)}>Устгах</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
