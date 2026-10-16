import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight,
  Check, ChevronDown, ChevronLeft, ChevronRight, Clock3,
  Download, Eye, Filter, LayoutDashboard, LoaderCircle, LogOut, Moon,
  MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck,
  Sun, Thermometer, Trash2, X,
} from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_PATH = `${API_BASE}/api/temperaturas`
const SENSOR_STATUS_PATH = `${API_BASE}/api/sensores/esp32/status`
const SENSOR_STATUS_EVENTS_PATH = `${SENSOR_STATUS_PATH}/events`
const REFRESH_MS = 15_000

function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...options }).format(new Date(value))
}

function parseApiUtc(value) {
  if (!value) return null
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  return new Date(hasTimezone ? value : `${value}Z`)
}

function startOfDay(daysAgo = 0) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(0, 0, 0, 0)
  return date
}

function temperatureColor(value) {
  if (value < 18) return 'cold'
  if (value > 28) return 'hot'
  return 'normal'
}

async function request(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) {
    let message = `A API respondeu com ${response.status}.`
    try {
      const body = await response.json()
      message = body.detail || body.title || Object.values(body.errors || {}).flat().join(' ') || message
    } catch { /* respostas 204 e corpos não JSON */ }
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}

function IconButton({ label, children, onClick, className = '', disabled = false }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function Sidebar({ active, onSelect }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span><span>Monitor de Temperatura</span><span className="brand-dot" /></div>
    <div className="nav-label">MENU</div>
    <nav className="nav-list">
      <button className={`nav-item ${active === 'overview' ? 'selected' : ''}`} onClick={() => onSelect('overview')}><LayoutDashboard size={18} /> Visão geral</button>
      <button className={`nav-item ${active === 'history' ? 'selected' : ''}`} onClick={() => onSelect('history')}><Activity size={18} /> Histórico <span className="nav-count">{active === 'history' ? '↗' : ''}</span></button>
      <button className="nav-item" onClick={() => document.getElementById('sensors')?.scrollIntoView({ behavior: 'smooth' })}><Thermometer size={18} /> Sensores <span className="status-dot" /></button>
    </nav>
    <div className="sidebar-bottom"><div className="profile"><div className="avatar">IO</div><div className="profile-name"><b>Operador</b><small>Administrador</small></div><MoreHorizontal size={19} className="muted" /></div></div>
  </aside>
}

function MetricCard({ label, value, unit, note, icon: Icon, tone = 'blue', trend }) {
  return <article className="metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone}`}><Icon size={18} /></span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-note">{trend && <span className={`trend ${trend.positive ? 'positive' : ''}`}>{trend.positive ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{trend.text}</span>}{note}</div></article>
}

function TemperatureChart({ readings, range, onRange }) {
  const points = useMemo(() => {
    const sorted = [...readings].sort((a, b) => new Date(a.registradaEmUtc) - new Date(b.registradaEmUtc))
    const filtered = sorted.filter((item) => new Date(item.registradaEmUtc) >= startOfDay(range === 'Hoje' ? 0 : range === '7 dias' ? 6 : 29))
    return filtered.slice(-48)
  }, [readings, range])
  const values = points.map((item) => item.valorCelsius)
  const min = values.length ? Math.min(...values) - 3 : 10
  const max = values.length ? Math.max(...values) + 3 : 40
  const x = (index) => 18 + (index / Math.max(points.length - 1, 1)) * 704
  const y = (value) => 190 - ((value - min) / Math.max(max - min, 1)) * 158
  const path = points.map((item, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(item.valorCelsius)}`).join(' ')
  const area = points.length ? `${path} L ${x(points.length - 1)} 194 L ${x(0)} 194 Z` : ''
  const labels = points.length > 1 ? [points[0], points[Math.floor((points.length - 1) / 2)], points.at(-1)] : []

  return <article className="panel chart-panel">
    <div className="panel-heading"><div><div className="panel-title">Variação de temperatura <span className="info-dot">i</span></div><p>Acompanhe as leituras do seu ambiente</p></div><div className="segmented">{['Hoje', '7 dias', '30 dias'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => onRange(item)}>{item}</button>)}</div></div>
    <div className="chart-legend"><span><i className="legend-dot" /> Temperatura <b>{values.length ? `${values.at(-1).toFixed(1)}°C` : '—'}</b></span><span className="chart-updated"><Clock3 size={13} /> Atualização a cada 15s</span></div>
    <div className="chart-wrap"><div className="chart-y-labels"><span>{Math.ceil(max)}°</span><span>{Math.round(min + (max - min) * .66)}°</span><span>{Math.round(min + (max - min) * .33)}°</span><span>{Math.floor(min)}°</span></div><svg className="chart-svg" viewBox="0 0 740 205" preserveAspectRatio="none" role="img" aria-label="Gráfico de leituras de temperatura"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5c71ef" stopOpacity=".19"/><stop offset="100%" stopColor="#5c71ef" stopOpacity="0"/></linearGradient></defs>{[32, 85, 138, 190].map((line) => <line key={line} x1="0" x2="740" y1={line} y2={line} className="grid-line" />)}{points.length > 1 && <><path d={area} fill="url(#chartFill)"/><path d={path} className="chart-line"/>{points.map((item, index) => <circle key={`${item.id}-${index}`} cx={x(index)} cy={y(item.valorCelsius)} r={index === points.length - 1 ? 4.5 : 2.5} className={index === points.length - 1 ? 'chart-point current' : 'chart-point'} />)}</>}{points.length === 1 && <circle cx="18" cy={y(points[0].valorCelsius)} r="5" className="chart-point current"/>}{points.length === 0 && <text x="370" y="112" textAnchor="middle" className="empty-chart">Nenhuma leitura neste período</text>}</svg></div><div className="chart-x-labels">{labels.length ? labels.map((item, i) => <span key={`${item.id}-${i}`}>{formatDate(item.registradaEmUtc, { hour: '2-digit', minute: '2-digit' })}</span>) : <><span>00:00</span><span>12:00</span><span>23:59</span></>}</div>
  </article>
}

function SensorCard({ sensorId, readings, onAdd }) {
  const latest = readings[0]
  const active = latest && Date.now() - new Date(latest.registradaEmUtc).getTime() < 120_000
  return <article className="panel sensor-card" id="sensors"><div className="sensor-head"><div className="sensor-symbol"><Thermometer size={19} /></div><span className={`sensor-status ${active ? 'online' : ''}`}><i />{active ? 'Online' : 'Sem sinal'}</span><button className="plain-icon" aria-label="Opções do sensor"><MoreHorizontal size={19}/></button></div><div className="sensor-name">{sensorId === 'esp32-01' ? 'ESP32 · DHT22' : sensorId}</div><div className="sensor-id">ID do sensor: {sensorId}</div><div className="sensor-reading"><span>{latest ? latest.valorCelsius.toFixed(1) : '—'}<small>°C</small></span><span className="sensor-wave"><Activity size={41}/></span></div><div className="sensor-footer"><span><Clock3 size={13}/>{latest ? `Atualizado ${formatDate(latest.registradaEmUtc, { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando leitura'}</span><button onClick={onAdd}>Detalhes <ArrowUpRight size={13}/></button></div></article>
}

function ReadingDetailsModal({ reading, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reading-details-title"><div className="modal-header"><div><span className="modal-icon"><Thermometer size={18}/></span><h2 id="reading-details-title">Leitura #{reading.id}</h2><p>Detalhes consultados na API.</p></div><IconButton label="Fechar" onClick={onClose}><X size={18}/></IconButton></div><label>Sensor<input value={reading.sensorId} readOnly/></label><label>Temperatura<input value={`${reading.valorCelsius.toFixed(1)} °C`} readOnly/></label><label>Registrada em<input value={formatDate(reading.registradaEmUtc, { dateStyle: 'short', timeStyle: 'medium' })} readOnly/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Fechar</button></div></section></div>
}

function ReadingTable({ readings, onView, onEdit, onDelete, onPage, page, totalPages, isAdmin }) {
  return <article className="panel readings-panel"><div className="panel-heading table-heading"><div><div className="panel-title">Leituras recentes <span className="row-count">{readings.length}</span></div><p>Últimos registros recebidos dos sensores</p></div><button className="text-button" onClick={() => onPage('all')}>Ver histórico completo <ArrowUpRight size={15}/></button></div><div className="table-scroll"><table><thead><tr><th>LEITURA</th><th>SENSOR</th><th>TEMPERATURA</th><th>DATA E HORA</th><th>STATUS</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{readings.length === 0 ? <tr><td colSpan="6" className="empty-row">Nenhuma leitura encontrada para os filtros selecionados.</td></tr> : readings.slice((page - 1) * 6, page * 6).map((item, index) => <tr key={item.id}><td><span className="reading-index">{String((page - 1) * 6 + index + 1).padStart(2, '0')}</span><b>Leitura #{item.id}</b></td><td><span className="sensor-cell"><i className="sensor-mini"/><span><b>{item.sensorId === 'esp32-01' ? 'ESP32 · DHT22' : item.sensorId}</b><small>ID: {item.sensorId}</small></span></span></td><td><span className={`temperature-pill ${temperatureColor(item.valorCelsius)}`}><Thermometer size={14}/>{item.valorCelsius.toFixed(1)} °C</span></td><td>{formatDate(item.registradaEmUtc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td><span className="ok-status"><Check size={12}/>Normal</span></td><td className="actions-cell"><IconButton label="Consultar leitura" onClick={() => onView(item.id)}><Eye size={15}/></IconButton>{isAdmin && <><IconButton label="Editar leitura" onClick={() => onEdit(item)}><Pencil size={15}/></IconButton><IconButton label="Excluir leitura" className="danger-hover" onClick={() => onDelete(item)}><Trash2 size={15}/></IconButton></>}</td></tr>)}</tbody></table></div><div className="table-footer"><span>Exibindo <b>{readings.length ? (page - 1) * 6 + 1 : 0}–{Math.min(page * 6, readings.length)}</b> de <b>{readings.length}</b> registros carregados</span><div className="pagination"><button disabled={page <= 1} aria-label="Página anterior" onClick={() => onPage(page - 1)}><ChevronLeft size={16}/></button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} aria-label="Próxima página" onClick={() => onPage(page + 1)}><ChevronRight size={16}/></button></div></div></article>
}

function ReadingModal({ reading, sensorId: initialSensorId, onClose, onSave, busy }) {
  const [value, setValue] = useState(reading?.valorCelsius ?? '')
  const [sensorId, setSensorId] = useState(reading?.sensorId ?? initialSensorId ?? 'esp32-01')
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); setError(''); try { await onSave({ valorCelsius: Number(value), sensorId: sensorId.trim() }) } catch (e) { setError(e.message) } }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="modal-header"><div><span className="modal-icon"><Thermometer size={18}/></span><h2>{reading ? `Editar leitura #${reading.id}` : 'Nova leitura'}</h2><p>{reading ? 'Ajuste o valor registrado.' : 'Registre manualmente uma temperatura.'}</p></div><IconButton label="Fechar" onClick={onClose}><X size={18}/></IconButton></div><label>Temperatura <span>(°C)</span><input type="number" step="0.1" min="-40" max="80" required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex.: 25.5"/></label><label>Identificador do sensor<input type="text" maxLength="60" required disabled={Boolean(reading)} value={sensorId} onChange={(e) => setSensorId(e.target.value)} placeholder="esp32-01"/></label><div className="form-hint">Faixa aceita pela API: -40 °C a 80 °C.</div>{error && <div className="form-error"><AlertCircle size={16}/>{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>} Salvar leitura</button></div></form></div>
}

function KeyModal({ onClose, onSave }) {
  const [key, setKey] = useState(sessionStorage.getItem('apiKey') || '')
  const [show, setShow] = useState(false)
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal key-modal" onSubmit={(e) => { e.preventDefault(); onSave(key.trim()) }}><div className="modal-header"><div><span className="modal-icon green"><ShieldCheck size={18}/></span><h2>Acesso administrativo</h2><p>A chave autoriza criação, edição e exclusão na API.</p></div><IconButton label="Fechar" onClick={onClose}><X size={18}/></IconButton></div><label>Chave da API<input type={show ? 'text' : 'password'} autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Informe sua X-Api-Key" required/></label><label className="check-label"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)}/> Exibir chave</label><div className="form-hint">A chave fica apenas nesta sessão do navegador.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button"><ShieldCheck size={16}/> Ativar acesso</button></div></form></div>
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('monitor-theme') || 'light')
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [esp32Signal, setEsp32Signal] = useState({ sensorId: 'esp32-01', connected: false, lastSeen: null, checked: false, error: false })
  const [sensorFilter, setSensorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [range, setRange] = useState('Hoje')
  const [page, setPage] = useState(1)
  const [nav, setNav] = useState('overview')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const apiKey = sessionStorage.getItem('apiKey') || ''

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('monitor-theme', theme)
  }, [theme])

  const loadReadings = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (sensorFilter) params.set('sensorId', sensorFilter)
      if (dateFrom) params.set('de', new Date(`${dateFrom}T00:00:00`).toISOString())
      if (dateTo) params.set('ate', new Date(`${dateTo}T23:59:59.999`).toISOString())
      const result = await request(`${API_PATH}?${params.toString()}`)
      setReadings(Array.isArray(result) ? result : [])
      setLastSync(new Date())
      setError('')
    } catch (e) { setError(e.message || 'Não foi possível conectar à API.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [sensorFilter, dateFrom, dateTo])

  useEffect(() => { loadReadings() }, [loadReadings])
  useEffect(() => { const timer = window.setInterval(() => loadReadings(true), REFRESH_MS); return () => window.clearInterval(timer) }, [loadReadings])
  useEffect(() => {
    let disposed = false
    const events = new EventSource(SENSOR_STATUS_EVENTS_PATH)
    request(SENSOR_STATUS_PATH).then((status) => {
      if (!disposed) setEsp32Signal({ sensorId: status.sensorId, connected: status.connected, lastSeen: status.lastSignalAtUtc, checked: true, error: false })
    }).catch(() => {
      if (!disposed) setEsp32Signal((previous) => ({ ...previous, checked: true, error: true }))
    })
    events.onopen = () => setEsp32Signal((previous) => ({ ...previous, error: false }))
    events.onmessage = (event) => {
      try {
        const status = JSON.parse(event.data)
        setEsp32Signal({ sensorId: status.sensorId, connected: status.connected, lastSeen: status.lastSignalAtUtc, checked: true, error: false })
      } catch {
        setEsp32Signal((previous) => ({ ...previous, checked: true, error: true }))
      }
    }
    events.onerror = () => setEsp32Signal((previous) => ({ ...previous, checked: true, error: true }))
    return () => { disposed = true; events.close() }
  }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])

  const loadReadingDetails = async (id) => {
    try {
      const reading = await request(`${API_PATH}/${id}`)
      setModal({ type: 'detail', reading })
    } catch (e) {
      setToast(e.message || `Não foi possível consultar a leitura #${id}.`)
    }
  }

  const filtered = useMemo(() => readings.filter((item) => `${item.id} ${item.sensorId}`.toLowerCase().includes(search.toLowerCase())), [readings, search])
  const latest = readings[0]
  const previous = readings[1]
  const average = readings.length ? readings.reduce((sum, item) => sum + item.valorCelsius, 0) / readings.length : null
  const sensors = [...new Set(readings.map((item) => item.sensorId))]
  const lastSignalDate = parseApiUtc(esp32Signal.lastSeen)
  const esp32Connected = esp32Signal.connected
  const esp32StatusText = !esp32Signal.checked ? 'Verificando ESP32…' : esp32Signal.error ? 'Status da ESP32 não confirmado' : esp32Connected ? 'Sensor conectado' : 'Sensor desconectado'
  const lastSignalText = lastSignalDate ? `Último sinal: ${formatDate(lastSignalDate, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : esp32Signal.checked && !esp32Signal.error ? 'Nenhum sinal recebido' : 'Aguardando confirmação do sensor'
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6))
  const openReadingModal = (sensorId) => setModal(apiKey
    ? { type: 'reading', sensorId }
    : { type: 'key', next: { type: 'reading', sensorId } })

  const authorizedFetch = (url, method, body) => {
    const key = sessionStorage.getItem('apiKey') || ''
    if (!key) { setModal({ type: 'key' }); throw new Error('Informe a chave da API para continuar.') }
    return request(url, { method, headers: { 'Content-Type': 'application/json', 'X-Api-Key': key }, ...(body ? { body: JSON.stringify(body) } : {}) })
  }

  const saveReading = async (data) => {
    setBusy(true)
    try {
      const reading = modal.reading
      await authorizedFetch(reading ? `${API_PATH}/${reading.id}` : `${API_PATH}/`, reading ? 'PUT' : 'POST', reading ? { valorCelsius: data.valorCelsius } : data)
      setModal(null); setToast(reading ? 'Leitura atualizada com sucesso.' : 'Leitura registrada com sucesso.'); await loadReadings(true)
    } finally { setBusy(false) }
  }

  const deleteReading = async (reading) => {
    if (!sessionStorage.getItem('apiKey')) { setModal({ type: 'key' }); return }
    if (!window.confirm(`Excluir a leitura #${reading.id} de ${reading.valorCelsius.toFixed(1)} °C? Esta ação não pode ser desfeita.`)) return
    try { await authorizedFetch(`${API_PATH}/${reading.id}`, 'DELETE'); setToast('Leitura excluída.'); await loadReadings(true) }
    catch (e) { setToast(e.message) }
  }

  const setTablePage = (next) => { if (next === 'all') { setNav('history'); setPage(1); window.scrollTo({ top: 720, behavior: 'smooth' }); return } setPage(next) }
  const exportCsv = () => {
    const rows = [['Id', 'Sensor', 'Temperatura (°C)', 'Registrada em (UTC)'], ...filtered.map((item) => [item.id, item.sensorId, item.valorCelsius, item.registradaEmUtc])]
    const csv = '\ufeff' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\r\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `leituras-temperatura-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }

  return <div className="app-shell"><Sidebar active={nav} onSelect={(value) => { setNav(value); if (value === 'history') document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'smooth' }) }}/><main className="main-content"><header className="topbar"><div className="breadcrumbs"><span>Painel</span><ChevronRight size={14}/><b>{nav === 'history' ? 'Histórico' : 'Visão geral'}</b></div><div className="topbar-actions"><span className={`live-indicator ${!esp32Signal.checked || esp32Signal.error ? 'unknown' : esp32Connected ? 'connected' : 'disconnected'}`} title={lastSignalText} aria-live="polite"><i/><span>{esp32StatusText}</span><small>{lastSignalText}</small></span><span className="top-separator"/><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === 'dark' ? 'Tela clara' : 'Tela escura'}</span></button><button className={`admin-button ${apiKey ? 'authorized' : ''}`} onClick={() => apiKey ? (sessionStorage.removeItem('apiKey'), setToast('Acesso administrativo encerrado.'), window.location.reload()) : setModal({ type: 'key' })}>{apiKey ? <><ShieldCheck size={15}/> Admin ativo <LogOut size={14}/></> : <><ShieldCheck size={15}/> Acesso admin</>}</button><span className="avatar top-avatar">IO</span></div></header>
    {error && <div className="error-banner"><AlertCircle size={17}/><span>{error} <small>Confirme se a API está em execução em {API_BASE || 'https://localhost:7136'}.</small></span><button onClick={() => loadReadings()}><RefreshCw size={14}/> Tentar novamente</button></div>}
    {esp32Signal.checked && !esp32Signal.error && !esp32Connected && <div className="error-banner"><AlertCircle size={17}/><span>ESP32 desconectado. {lastSignalDate ? lastSignalText : `Nenhuma leitura recebida do sensor ${esp32Signal.sensorId}.`}</span></div>}
    <section className="metrics-grid"><MetricCard label="Temperatura atual" value={latest ? latest.valorCelsius.toFixed(1) : '—'} unit="°C" icon={Thermometer} tone="blue" note={latest ? `Sensor ${latest.sensorId}` : 'Aguardando leituras'} trend={latest && previous ? { positive: latest.valorCelsius < previous.valorCelsius, text: `${Math.abs(latest.valorCelsius - previous.valorCelsius).toFixed(1)}°` } : null}/><MetricCard label="Média registrada" value={average !== null ? average.toFixed(1) : '—'} unit="°C" icon={Activity} tone="purple" note="Leituras carregadas"/><MetricCard label="Sensores" value={sensors.length} unit="" icon={Thermometer} tone="teal" note="Com registros no histórico"/></section>
    <section className="content-grid"><TemperatureChart readings={readings} range={range} onRange={setRange}/><div className="side-column"><div className="side-heading"><div><h2>Sensores conectados</h2><p>Dispositivos registrados na API</p></div><span className="sensor-total">{sensors.length} {sensors.length === 1 ? 'ativo' : 'ativos'}</span></div>{sensors.length ? sensors.slice(0, 2).map((id) => <SensorCard key={id} sensorId={id} readings={readings.filter((item) => item.sensorId === id)} onAdd={() => openReadingModal(id)}/>) : <article className="panel no-sensors"><span className="sensor-symbol"><Thermometer size={19}/></span><b>Nenhum sensor encontrado</b><p>Assim que um dispositivo enviar uma leitura, ele aparecerá aqui.</p><button className="secondary-button" onClick={() => openReadingModal()}><Plus size={15}/> Registrar leitura</button></article>}</div></section>
    <section className="history-section" id="history"><div className="section-toolbar"><div><h2>{nav === 'history' ? 'Histórico de leituras' : 'Últimas leituras'}</h2><p>Consulte e gerencie os dados recebidos</p></div><div className="toolbar-actions"><button className="secondary-button" onClick={exportCsv} disabled={!filtered.length}><Download size={15}/> Exportar</button><button className="secondary-button" onClick={() => loadReadings()} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''}/> Atualizar</button><button className="primary-button compact" onClick={() => openReadingModal()}><Plus size={16}/> Nova leitura</button></div></div>
    <div className="filter-bar"><div className="search-box"><Search size={16}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por leitura ou sensor..."/></div><div className="filter-control"><Filter size={15}/><select value={sensorFilter} onChange={(e) => { setSensorFilter(e.target.value); setPage(1) }}><option value="">Todos os sensores</option>{sensors.map((id) => <option key={id} value={id}>{id}</option>)}</select><ChevronDown size={14}/></div><label className="date-filter"><span>De</span><input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}/></label><label className="date-filter"><span>Até</span><input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}/></label><IconButton label="Limpar filtros" onClick={() => { setSensorFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }}><X size={16}/></IconButton></div>
    {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22}/> Carregando leituras...</div> : <ReadingTable readings={filtered} onView={loadReadingDetails} onEdit={(reading) => setModal({ type: 'reading', reading })} onDelete={deleteReading} onPage={setTablePage} page={page} totalPages={totalPages} isAdmin={Boolean(apiKey)}/>}</section>
    <footer className="page-footer"><span>© 2026 Monitor de Temperatura · Monitoramento IoT</span><span>{lastSync ? <>Última sincronização às {formatDate(lastSync, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</> : 'Conectando à API...'} <i className={error ? 'offline-dot' : ''}/></span></footer>
    </main>{modal?.type === 'detail' && <ReadingDetailsModal reading={modal.reading} onClose={() => setModal(null)}/ >}{modal?.type === 'reading' && <ReadingModal reading={modal.reading} sensorId={modal.sensorId} onClose={() => setModal(null)} onSave={saveReading} busy={busy}/ >}{modal?.type === 'key' && <KeyModal onClose={() => setModal(null)} onSave={(key) => { sessionStorage.setItem('apiKey', key); setModal(modal.next || null); setToast('Acesso administrativo ativado nesta sessão.') }}/ >}{toast && <div className="toast"><Check size={16}/>{toast}</div>}</div>
}
