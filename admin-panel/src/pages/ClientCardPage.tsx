import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminClientsApi } from '@/lib/api'
import { AuthImage } from '@/components/AuthImage'
import { ArrowLeft, Plus, Trash2, Users, Save, X, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

const ANGLES: { key: string; label: string }[] = [
  { key: 'FRONT', label: 'Вид спереди' },
  { key: 'SIDE_LEFT', label: 'Сбоку слева' },
  { key: 'SIDE_RIGHT', label: 'Сбоку справа' },
  { key: 'BACK', label: 'Вид сзади' },
]

// Поля замера: ключ, подпись, единица
const FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Вес', unit: 'кг' },
  { key: 'chest', label: 'Грудь', unit: 'см' },
  { key: 'waist', label: 'Талия', unit: 'см' },
  { key: 'belly', label: 'Живот', unit: 'см' },
  { key: 'hips', label: 'Бёдра', unit: 'см' },
  { key: 'thigh', label: 'Под ягодицами', unit: 'см' },
]

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('ru-RU') : '—'

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  weight: '',
  chest: '',
  waist: '',
  belly: '',
  hips: '',
  thigh: '',
  note: '',
})

// Сворачиваемая секция карточки клиента (управляется родителем —
// содержимое и запросы грузятся только после раскрытия)
const Fold = ({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: ReactNode
  count?: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) => (
  <div className="bg-white rounded-lg shadow mb-6">
    <button
      onClick={onToggle}
      className={`w-full p-5 flex items-center justify-between hover:bg-gray-50 ${
        open ? 'border-b' : ''
      }`}
    >
      <h2 className="font-bold text-lg flex items-center gap-2">
        {title}
        {typeof count === 'number' && count > 0 && (
          <span className="text-gray-400 font-normal text-sm">({count})</span>
        )}
      </h2>
      <ChevronDown
        className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
    {open && <div className="p-5 pt-4">{children}</div>}
  </div>
)

export const ClientCardPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  // Фото
  const [photoAngle, setPhotoAngle] = useState('FRONT')
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10))
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  // Свёртки секций: фото и сравнения грузятся только после раскрытия
  const [measOpen, setMeasOpen] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [cmpMeasOpen, setCmpMeasOpen] = useState(false)
  const [cmpPhotoOpen, setCmpPhotoOpen] = useState(false)
  // Сравнение фото по датам
  const [photoCmpA, setPhotoCmpA] = useState('')
  const [photoCmpB, setPhotoCmpB] = useState('')
  // Полноэкранный просмотр пары «было/стало»
  const [fullscreen, setFullscreen] = useState<{
    label: string
    a?: { id: string; caption: string } | null
    b?: { id: string; caption: string } | null
  } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => adminClientsApi.card(id!),
    enabled: !!id,
  })
  const client = data?.data
  const measurements: any[] = client?.measurements || []

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-client', id] })
    qc.invalidateQueries({ queryKey: ['admin-clients'] })
  }

  const addMut = useMutation({
    mutationFn: () => {
      const payload: any = { date: form.date, note: form.note.trim() || undefined }
      for (const f of FIELDS) {
        const v = (form as any)[f.key]
        if (v !== '' && !isNaN(Number(v))) payload[f.key] = Number(v)
      }
      return adminClientsApi.addMeasurement(id!, payload)
    },
    onSuccess: () => {
      invalidate()
      setForm(emptyForm())
      setShowForm(false)
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || 'Не удалось сохранить замер'),
  })

  const delMut = useMutation({
    mutationFn: (mid: string) => adminClientsApi.deleteMeasurement(id!, mid),
    onSuccess: invalidate,
    onError: () => alert('Не удалось удалить замер'),
  })

  const notesMut = useMutation({
    mutationFn: (notes: string) => adminClientsApi.updateNotes(id!, notes),
    onSuccess: () => {
      invalidate()
      setNotesDraft(null)
    },
    onError: () => alert('Не удалось сохранить заметку'),
  })

  // ===== Фото =====
  const { data: photosData } = useQuery({
    queryKey: ['admin-client-photos', id],
    queryFn: () => adminClientsApi.photos(id!),
    // грузим фото только когда раскрыта фото-секция или сравнение фото
    enabled: !!id && (photosOpen || cmpPhotoOpen),
  })
  const photos: any[] = photosData?.data || []
  const photoDays = useMemo(() => {
    const map = new Map<string, any>()
    for (const p of photos) {
      const day = new Date(new Date(p.date).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10)
      const g = map.get(day) || { day, date: p.date, byAngle: {} as Record<string, any> }
      if (!g.byAngle[p.angle]) g.byAngle[p.angle] = p
      map.set(day, g)
    }
    return [...map.values()].sort((a, b) => b.day.localeCompare(a.day))
  }, [photos])

  const photoUploadMut = useMutation({
    mutationFn: (file: File) =>
      adminClientsApi.addPhoto(id!, file, photoAngle, photoDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-photos', id] })
      setPhotoUploading(false)
    },
    onError: () => {
      setPhotoUploading(false)
      alert('Не удалось загрузить фото')
    },
  })

  const photoDelMut = useMutation({
    mutationFn: (photoId: string) => adminClientsApi.deletePhoto(id!, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-client-photos', id] }),
    onError: () => alert('Не удалось удалить фото'),
  })

  const archiveMut = useMutation({
    mutationFn: () => adminClientsApi.archive(id!),
    onSuccess: () => {
      invalidate()
      navigate('/clients')
    },
    onError: () => alert('Не удалось изменить статус'),
  })

  if (isLoading || !client) {
    return <div className="p-8 text-gray-500">Загрузка…</div>
  }

  const hasAnyValue = FIELDS.some((f) => (form as any)[f.key] !== '')

  // Сравнение произвольных дат: по умолчанию первый ↔ последний замер
  const oldest = measurements[measurements.length - 1]
  const newest = measurements[0]
  const mA = measurements.find((m) => m.id === compareA) || oldest
  const mB = measurements.find((m) => m.id === compareB) || newest
  const compareRows = FIELDS.map((f) => {
    const a = mA?.[f.key]
    const b = mB?.[f.key]
    if (a == null || b == null) return null
    return { ...f, a, b, d: Math.round((b - a) * 10) / 10 }
  }).filter(Boolean) as any[]

  // Сравнение фото: по умолчанию самая старая ↔ самая свежая дата
  const cmpDayA = photoDays.find((d) => d.day === photoCmpA) || photoDays[photoDays.length - 1]
  const cmpDayB = photoDays.find((d) => d.day === photoCmpB) || photoDays[0]

  return (
    <div className="p-4 md:p-8">
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Все клиенты
      </button>

      {/* Шапка клиента */}
      <div className="bg-white rounded-lg shadow p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        {client.user?.photoUrl ? (
          <img src={client.user.photoUrl} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">
            {client.user?.firstName} {client.user?.lastName}
            {client.status !== 'ACTIVE' && (
              <span className="ml-2 text-sm font-medium text-gray-400">(архив)</span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            {client.user?.username ? `@${client.user.username} · ` : ''}
            ID {client.user?.telegramId} · клиент с {fmtDate(client.startedAt)}
          </p>
        </div>
        {client.status === 'ACTIVE' && (
          <button
            onClick={() => {
              if (confirm('Убрать из клиентов? История замеров сохранится (архив).'))
                archiveMut.mutate()
            }}
            className="text-sm text-red-600 hover:text-red-700 flex-shrink-0"
          >
            Убрать из клиентов
          </button>
        )}
      </div>

      {/* Анкета клиента */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="font-bold mb-3">Анкета</h2>
        {!client.questionnaire ? (
          <p className="text-sm text-gray-500">
            Клиент ещё не заполнил анкету — она появится, когда он откроет «Мой прогресс» в боте.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">ФИО</p>
              <p className="font-medium">{client.questionnaire.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Дата рождения / возраст</p>
              <p className="font-medium">
                {fmtDate(client.questionnaire.birthDate)}
                {(() => {
                  const b = new Date(client.questionnaire.birthDate)
                  if (isNaN(b.getTime())) return null
                  const t = new Date()
                  let age = t.getFullYear() - b.getFullYear()
                  const m = t.getMonth() - b.getMonth()
                  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--
                  return <span className="text-primary"> · {age} лет</span>
                })()}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-xs text-gray-500">Состояние здоровья</p>
              <p className="whitespace-pre-line">{client.questionnaire.health}</p>
            </div>
          </div>
        )}
      </div>

      {/* Впечатления от тренировок */}
      {(client.feedback?.length || 0) > 0 && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="font-bold mb-3">
            Впечатления от тренировок{' '}
            <span className="text-gray-400 font-normal text-sm">
              ({client.feedback.length})
            </span>
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {client.feedback.map((f: any) => (
              <div key={f.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{fmtDate(f.createdAt)}</p>
                <p className="text-sm whitespace-pre-line">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Заметки тренера */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">Заметки тренера</h2>
          {notesDraft !== null && (
            <button
              onClick={() => notesMut.mutate(notesDraft)}
              disabled={notesMut.isPending}
              className="flex items-center gap-1 text-sm text-primary font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Сохранить
            </button>
          )}
        </div>
        <textarea
          value={notesDraft ?? client.notes ?? ''}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={2}
          placeholder="Цели, ограничения, важное о клиенте (клиент этого не видит)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {/* ===== 1. Замеры (свернуто) ===== */}
      <Fold
        title="Замеры"
        count={measurements.length}
        open={measOpen}
        onToggle={() => setMeasOpen((v) => !v)}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Добавить замер
          </button>
        </div>

        {showForm && (
          <div className="border border-gray-200 rounded-lg p-4 mb-5 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Дата</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {f.label}, {f.unit}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Заметка к замеру (необязательно)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !hasAnyValue}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {addMut.isPending ? 'Сохраняю…' : 'Сохранить замер'}
            </button>
          </div>
        )}

        {measurements.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Замеров пока нет — добавьте первый или попросите клиента заполнить в боте
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b">
                  <th className="text-left py-2 pr-3">Дата</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="text-right py-2 px-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, i) => {
                  const prev = measurements[i + 1]
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {fmtDate(m.date)}
                        {m.byTrainer && (
                          <span className="ml-1 text-[10px] text-gray-400" title="внёс тренер">Т</span>
                        )}
                        {m.note && (
                          <p className="text-xs text-gray-400 max-w-[160px] truncate">{m.note}</p>
                        )}
                      </td>
                      {FIELDS.map((f) => {
                        const v = m[f.key]
                        const pv = prev?.[f.key]
                        const delta =
                          v != null && pv != null ? Math.round((v - pv) * 10) / 10 : null
                        return (
                          <td key={f.key} className="text-right py-2.5 px-2 whitespace-nowrap">
                            {v != null ? (
                              <>
                                <span className="font-medium">{v}</span>
                                {delta !== null && delta !== 0 && (
                                  <span
                                    className={`ml-1 text-xs ${
                                      delta < 0 ? 'text-green-600' : 'text-red-500'
                                    }`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-2.5 pl-2 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Удалить этот замер?')) delMut.mutate(m.id)
                          }}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">
              Цифра рядом со значением — изменение к предыдущему замеру: <span className="text-green-600">зелёное — снижение</span>, <span className="text-red-500">красное — рост</span>.
            </p>
          </div>
        )}
      </Fold>

      {/* ===== 2. Фото прогресса (свернуто) ===== */}
      <Fold
        title="Фото прогресса"
        count={photos.length}
        open={photosOpen}
        onToggle={() => setPhotosOpen((v) => !v)}
      >
        {/* Загрузка от тренера */}
        <div className="flex flex-wrap items-end gap-3 mb-5 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ракурс</label>
            <select
              value={photoAngle}
              onChange={(e) => setPhotoAngle(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {ANGLES.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Дата</label>
            <input
              type="date"
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setPhotoUploading(true)
              photoUploadMut.mutate(f)
            }}
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {photoUploading ? 'Загрузка…' : 'Загрузить фото'}
          </button>
          <p className="text-xs text-gray-400 w-full">
            Фото хранятся приватно — видите только вы и клиент.
          </p>
        </div>

        {photoDays.length === 0 ? (
          <p className="text-center text-gray-500 py-6">
            Фото пока нет — клиент может загрузить их в боте, или добавьте сами
          </p>
        ) : (
          <div className="space-y-4">
            {photoDays.map((d: any) => (
              <div key={d.day}>
                <p className="text-sm font-medium text-gray-700 mb-2">{fmtDate(d.date)}</p>
                <div className="grid grid-cols-3 gap-3 max-w-lg">
                  {ANGLES.map((a) => {
                    const p = d.byAngle[a.key]
                    if (!p)
                      return (
                        <div
                          key={a.key}
                          className="aspect-[3/4] rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-300"
                        >
                          {a.label}
                        </div>
                      )
                    return (
                      <div key={a.key} className="relative group">
                        <AuthImage
                          src={adminClientsApi.photoFileUrl(id!, p.id)}
                          className="aspect-[3/4] w-full object-cover rounded-lg"
                        />
                        <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          {a.label}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Удалить фото?')) photoDelMut.mutate(p.id)
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white hidden group-hover:flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Fold>

      {/* ===== 3. Сравнить замеры (свернуто) ===== */}
      <Fold
        title="Сравнить замеры"
        open={cmpMeasOpen}
        onToggle={() => setCmpMeasOpen((v) => !v)}
      >
        {measurements.length < 2 ? (
          <p className="text-sm text-gray-500">Нужно минимум два замера</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={mA?.id || ''}
                onChange={(e) => setCompareA(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[...measurements].reverse().map((m) => (
                  <option key={m.id} value={m.id}>{fmtDate(m.date)}</option>
                ))}
              </select>
              <span className="text-gray-400">→</span>
              <select
                value={mB?.id || ''}
                onChange={(e) => setCompareB(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[...measurements].reverse().map((m) => (
                  <option key={m.id} value={m.id}>{fmtDate(m.date)}</option>
                ))}
              </select>
            </div>
            {compareRows.length === 0 ? (
              <p className="text-sm text-gray-500">В выбранных датах нет совпадающих измерений</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {compareRows.map((r: any) => (
                  <div key={r.key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{r.label}, {r.unit}</p>
                    <p className="text-sm mt-1">
                      {r.a} → <b>{r.b}</b>
                      {r.d !== 0 && (
                        <b className={`ml-2 ${r.d < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {r.d > 0 ? `+${r.d}` : r.d}
                        </b>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Fold>

      {/* ===== 4. Сравнить фото (свернуто) ===== */}
      <Fold
        title="Сравнить фото"
        open={cmpPhotoOpen}
        onToggle={() => setCmpPhotoOpen((v) => !v)}
      >
        {photoDays.length < 2 ? (
          <p className="text-sm text-gray-500">
            Нужны фото минимум за две разные даты
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={cmpDayA?.day || ''}
                onChange={(e) => setPhotoCmpA(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[...photoDays].reverse().map((d: any) => (
                  <option key={d.day} value={d.day}>{fmtDate(d.date)}</option>
                ))}
              </select>
              <span className="text-gray-400">→</span>
              <select
                value={cmpDayB?.day || ''}
                onChange={(e) => setPhotoCmpB(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[...photoDays].reverse().map((d: any) => (
                  <option key={d.day} value={d.day}>{fmtDate(d.date)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ANGLES.map((a) => {
                const pa = cmpDayA?.byAngle[a.key]
                const pb = cmpDayB?.byAngle[a.key]
                if (!pa && !pb) return null
                const openPair = () =>
                  setFullscreen({
                    label: a.label,
                    a: pa
                      ? { id: pa.id, caption: `Было · ${fmtDate(cmpDayA.date)}` }
                      : null,
                    b: pb
                      ? { id: pb.id, caption: `Стало · ${fmtDate(cmpDayB.date)}` }
                      : null,
                  })
                return (
                  <div key={a.key}>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {a.label}{' '}
                      <span className="text-gray-300 font-normal text-xs">
                        · клик — на весь экран
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {pa ? (
                        <div className="cursor-pointer" onClick={openPair}>
                          <AuthImage
                            src={adminClientsApi.photoFileUrl(id!, pa.id)}
                            className="aspect-[3/4] w-full object-cover rounded-lg"
                          />
                          <p className="text-center text-xs text-gray-500 mt-1">
                            {fmtDate(cmpDayA.date)}
                          </p>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-300">
                          нет фото
                        </div>
                      )}
                      {pb ? (
                        <div className="cursor-pointer" onClick={openPair}>
                          <AuthImage
                            src={adminClientsApi.photoFileUrl(id!, pb.id)}
                            className="aspect-[3/4] w-full object-cover rounded-lg"
                          />
                          <p className="text-center text-xs text-gray-500 mt-1">
                            {fmtDate(cmpDayB.date)}
                          </p>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-300">
                          нет фото
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Fold>

      {/* Полноэкранное сравнение пары фото */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setFullscreen(null)}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white text-sm font-medium">{fullscreen.label}</span>
            <button className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className={`flex-1 min-h-0 grid gap-1 p-1 ${
              fullscreen.b && fullscreen.a ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {fullscreen.a && (
              <div className="h-full min-h-0 flex flex-col">
                <AuthImage
                  src={adminClientsApi.photoFileUrl(id!, fullscreen.a.id)}
                  className="flex-1 min-h-0 w-full object-contain"
                />
                <p className="text-center text-white/80 text-xs py-1.5">
                  {fullscreen.a.caption}
                </p>
              </div>
            )}
            {fullscreen.b && (
              <div className="h-full min-h-0 flex flex-col">
                <AuthImage
                  src={adminClientsApi.photoFileUrl(id!, fullscreen.b.id)}
                  className="flex-1 min-h-0 w-full object-contain"
                />
                <p className="text-center text-white/80 text-xs py-1.5">
                  {fullscreen.b.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
