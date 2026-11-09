import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Админ: UFE сайтаас /api/import-ufe-ээр татсан мэдээллийг хянаж нийтлэх эсвэл татгалзах
export default function ImportManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase.from('import_items').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (error) setMsg('Алдаа: ' + error.message); else setItems(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setMsg('')
    const { error } = await supabase.from('import_items').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    if (error) return setMsg('Алдаа: ' + error.message)
    setMsg(status === 'approved' ? 'Нийтлэгдлээ.' : 'Татгалзлаа.')
    loadItems()
  }

  useEffect(() => { loadItems() }, [])

  return (
    <div>
      <p className="prose">UFE-ийн сайтаас импортолсон, хянагдаагүй мэдээлэл.</p>
      {msg && <p className="note" role="status">{msg}</p>}
      {loading ? <p className="empty">Ачаалж байна…</p>
        : items.length === 0 ? <p className="empty">Хянах шаардлагатай мэдээлэл алга.</p>
        : items.map(item => (
          <div className="panel import-item" key={item.id}>
            <small>{item.category}</small>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <a href={item.source_url} target="_blank" rel="noreferrer">Эх сурвалж үзэх</a>
            <div className="row">
              <button className="btn sm" onClick={() => updateStatus(item.id, 'approved')}>Нийтлэх</button>
              <button className="btn danger sm" onClick={() => updateStatus(item.id, 'rejected')}>Татгалзах</button>
            </div>
          </div>))}
    </div>
  )
}
