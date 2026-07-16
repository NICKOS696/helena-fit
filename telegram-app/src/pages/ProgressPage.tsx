import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { AuthImage } from '@/components/AuthImage'
import { haptic } from '@/lib/telegram'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Ruler,
  ArrowLeftRight,
  ChevronDown,
  Camera,
  Image,
  History,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'

// Поля замера: ключ, подпись, единица
const FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Вес', unit: 'кг' },
  { key: 'chest', label: 'Грудь', unit: 'см' },
  { key: 'waist', label: 'Талия', unit: 'см' },
  { key: 'belly', label: 'Живот', unit: 'см' },
  { key: 'hips', label: 'Бёдра', unit: 'см' },
  { key: 'thigh', label: 'Бедро', unit: 'см' },
  { key: 'arm', label: 'Рука', unit: 'см' },
]

const ANGLES: { key: 'FRONT' | 'SIDE' | 'BACK'; label: string }[] = [
  { key: 'FRONT', label: 'Вид спереди' },
  { key: 'SIDE', label: 'Вид сбоку' },
  { key: 'BACK', label: 'Вид сзади' },
]

const emptyForm = () => ({
  weight: '',
  chest: '',
  waist: '',
  belly: '',
  hips: '',
  thigh: '',
  arm: '',
})

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Сворачиваемая секция в стиле профиля
const Fold = ({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode
  title: string
  count?: number
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-text-primary text-base">
          {icon}
          {title}
          {typeof count === 'number' && count > 0 && (
            <span className="text-text-secondary text-sm">({count})</span>
          )}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}

// Фото с щипком-зумом: pinch (масштаб), перетаскивание при увеличении,
// двойной тап — приблизить/сбросить.
const ZoomableImage = ({ src, caption }: { src: string; caption?: string }) => {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{
    dist: number
    s: number
    x: number
    y: number
    mx: number
    my: number
  } | null>(null)
  const lastTap = useRef(0)

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      start.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        s: t.s,
        x: t.x,
        y: t.y,
        mx: (pts[0].x + pts[1].x) / 2,
        my: (pts[0].y + pts[1].y) / 2,
      }
    } else if (pts.length === 1) {
      start.current = { dist: 0, s: t.s, x: t.x, y: t.y, mx: e.clientX, my: e.clientY }
      const now = Date.now()
      if (now - lastTap.current < 300) {
        setT(t.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })
        start.current = null
      }
      lastTap.current = now
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const st = start.current
    if (!st) return
    const pts = [...pointers.current.values()]
    if (pts.length === 2 && st.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const s = Math.min(5, Math.max(1, (st.s * dist) / st.dist))
      const mx = (pts[0].x + pts[1].x) / 2
      const my = (pts[0].y + pts[1].y) / 2
      setT({ s, x: st.x + (mx - st.mx), y: st.y + (my - st.my) })
    } else if (pts.length === 1 && t.s > 1) {
      setT((cur) => ({ s: cur.s, x: st.x + (e.clientX - st.mx), y: st.y + (e.clientY - st.my) }))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      start.current = { dist: 0, s: t.s, x: t.x, y: t.y, mx: pts[0].x, my: pts[0].y }
    } else {
      start.current = null
    }
    setT((cur) => (cur.s <= 1.02 ? { s: 1, x: 0, y: 0 } : cur))
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`,
            transition: start.current ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <AuthImage
            src={src}
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
      </div>
      {caption && <p className="text-center text-white/80 text-xs py-1.5">{caption}</p>}
    </div>
  )
}

export const ProgressPage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  // Сравнение замеров
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  // Сравнение фото
  const [photoCmpA, setPhotoCmpA] = useState('')
  const [photoCmpB, setPhotoCmpB] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingAngle = useRef<'FRONT' | 'SIDE' | 'BACK'>('FRONT')
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null)
  // Ракурсы, снятые в текущей сессии формы (для галочки «Готово»)
  const [doneAngles, setDoneAngles] = useState<string[]>([])
  // Полноэкранный просмотр: пара фото (сравнение) или одно фото (история)
  const [fullscreen, setFullscreen] = useState<{
    label: string
    a?: { id: string; caption: string } | null
    b?: { id: string; caption: string } | null
  } | null>(null)

  // Гейт: страница только для клиентов тренера
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['client-me'],
    queryFn: () => clientsApi.getMe(),
  })
  const isClient = meData?.data?.isClient

  const { data, isLoading } = useQuery({
    queryKey: ['client-measurements'],
    queryFn: () => clientsApi.getMeasurements(),
    enabled: !!isClient,
  })
  const measurements: any[] = data?.data || []

  const { data: photosData } = useQuery({
    queryKey: ['client-photos'],
    queryFn: () => clientsApi.getPhotos(),
    enabled: !!isClient,
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

  // ===== Мутации =====
  const addMut = useMutation({
    mutationFn: () => {
      const payload: any = {}
      for (const f of FIELDS) {
        const v = (form as any)[f.key]
        if (v !== '' && !isNaN(Number(v))) payload[f.key] = Number(v)
      }
      return clientsApi.addMeasurement(payload)
    },
    onSuccess: () => {
      haptic.notify('success')
      qc.invalidateQueries({ queryKey: ['client-measurements'] })
      setForm(emptyForm())
      setShowForm(false)
    },
    onError: () => alert('Не удалось сохранить. Заполните хотя бы одно поле и попробуйте ещё раз.'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => clientsApi.deleteMeasurement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-measurements'] }),
  })

  const photoUploadMut = useMutation({
    mutationFn: ({ file, angle }: { file: File; angle: 'FRONT' | 'SIDE' | 'BACK' }) =>
      clientsApi.addPhoto(file, angle),
    onSuccess: (_res, vars) => {
      haptic.notify('success')
      qc.invalidateQueries({ queryKey: ['client-photos'] })
      setUploadingAngle(null)
      setDoneAngles((prev) => [...prev, vars.angle])
    },
    onError: () => {
      setUploadingAngle(null)
      alert('Не удалось загрузить фото. Попробуйте ещё раз.')
    },
  })

  const photoDelMut = useMutation({
    mutationFn: (id: string) => clientsApi.deletePhoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-photos'] }),
  })

  const pickPhoto = (angle: 'FRONT' | 'SIDE' | 'BACK') => {
    pendingAngle.current = angle
    fileInputRef.current?.click()
  }

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAngle(pendingAngle.current)
    photoUploadMut.mutate({ file, angle: pendingAngle.current })
  }

  if (meLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse bg-white rounded-card h-40" />
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-10 px-4">
            <Ruler className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-bold text-text-primary mb-1">Раздел для клиентов тренера</p>
            <p className="text-sm text-text-secondary">
              Здесь клиенты Елены ведут замеры и следят за прогрессом. Хочешь так же —
              напиши нам 💚
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const hasAnyValue = FIELDS.some((f) => (form as any)[f.key] !== '')

  // Сравнение замеров: по умолчанию первый ↔ последний
  const first = measurements[measurements.length - 1]
  const last = measurements[0]
  const mA = measurements.find((m) => m.id === compareA) || first
  const mB = measurements.find((m) => m.id === compareB) || last
  const compareRows = FIELDS.map((f) => {
    const a = mA?.[f.key]
    const b = mB?.[f.key]
    if (a == null || b == null) return null
    return { ...f, a, b, d: Math.round((b - a) * 10) / 10 }
  }).filter(Boolean) as { key: string; label: string; unit: string; a: number; b: number; d: number }[]

  // Сравнение фото: по умолчанию самая старая ↔ самая свежая дата
  const cmpDayA = photoDays.find((d) => d.day === photoCmpA) || photoDays[photoDays.length - 1]
  const cmpDayB = photoDays.find((d) => d.day === photoCmpB) || photoDays[0]

  return (
    <div className="p-4 space-y-3 pb-8">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1 text-sm text-text-secondary"
      >
        <ArrowLeft className="w-4 h-4" />
        Профиль
      </button>

      <h1 className="text-2xl font-bold text-text-primary mb-1">Мой прогресс</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />

      {/* ===== 1–2. Кнопки добавления в одну строку ===== */}
      {!showForm && !showPhotoForm && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              haptic.selection()
              setShowForm(true)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-light to-primary text-white py-3.5 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Добавить замеры
          </button>
          <button
            onClick={() => {
              haptic.selection()
              setDoneAngles([])
              setShowPhotoForm(true)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-light to-primary text-white py-3.5 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
          >
            <Camera className="w-4 h-4 shrink-0" />
            Фото отчёт
          </button>
        </div>
      )}

      {/* Форма замера */}
      {showForm && (
        <Card>
          <p className="text-text-primary mb-3">
            Новый замер — {new Date().toLocaleDateString('ru-RU')}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-text-secondary mb-1">
                  {f.label}, {f.unit}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none focus:border-primary/50"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Заполни то, что измерила — остальное можно пропустить.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !hasAnyValue}
              className="flex-1 bg-gradient-to-r from-primary-light to-primary text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {addMut.isPending ? 'Сохраняю…' : 'Сохранить'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 bg-gray-100 text-text-secondary rounded-xl"
            >
              Отмена
            </button>
          </div>
        </Card>
      )}

      {/* Форма фото отчёта */}
      {showPhotoForm && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-primary">
              Фото отчёт — {new Date().toLocaleDateString('ru-RU')}
            </p>
            <button
              onClick={() => setShowPhotoForm(false)}
              className="text-text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Сделай фото в трёх ракурсах. Они сохранятся приватно — увидите только ты и
            тренер. Новое фото за сегодня заменит прежнее.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ANGLES.map((a) => {
              const done = doneAngles.includes(a.key)
              return (
                <button
                  key={a.key}
                  onClick={() => pickPhoto(a.key)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 border ${
                    done
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-gray-100 border-dashed border-gray-300'
                  }`}
                >
                  {uploadingAngle === a.key ? (
                    <span className="text-xs text-text-secondary animate-pulse">
                      Загрузка…
                    </span>
                  ) : done ? (
                    <>
                      <span className="text-2xl">✅</span>
                      <span className="text-xs text-primary font-medium">Готово</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-text-secondary">Сделать фото</span>
                    </>
                  )}
                  <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-white bg-black/40 py-0.5">
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* ===== 3. Сравнить замеры ===== */}
      {measurements.length >= 2 && (
        <Fold
          icon={<ArrowLeftRight className="w-5 h-5 text-primary" />}
          title="Сравнить замеры"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Было</label>
              <select
                value={mA?.id || ''}
                onChange={(e) => setCompareA(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {[...measurements].reverse().map((m) => (
                  <option key={m.id} value={m.id}>
                    {fmtDate(m.date)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Стало</label>
              <select
                value={mB?.id || ''}
                onChange={(e) => setCompareB(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {[...measurements].reverse().map((m) => (
                  <option key={m.id} value={m.id}>
                    {fmtDate(m.date)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {compareRows.length === 0 ? (
            <p className="text-xs text-text-secondary">
              В выбранных датах нет совпадающих измерений
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {compareRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-text-secondary">{r.label}</span>
                  <span className="text-text-primary">
                    {r.a} → {r.b} {r.unit}
                    {r.d !== 0 && (
                      <span className={`ml-2 ${r.d < 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {r.d > 0 ? `+${r.d}` : r.d}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Fold>
      )}

      {/* ===== 4. Сравнить фото отчёт ===== */}
      {photoDays.length >= 2 && (
        <Fold
          icon={<Image className="w-5 h-5 text-primary" />}
          title="Сравнить фото отчёт"
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Было</label>
              <select
                value={cmpDayA?.day || ''}
                onChange={(e) => setPhotoCmpA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {[...photoDays].reverse().map((d) => (
                  <option key={d.day} value={d.day}>
                    {fmtDate(d.date)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Стало</label>
              <select
                value={cmpDayB?.day || ''}
                onChange={(e) => setPhotoCmpB(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {[...photoDays].reverse().map((d) => (
                  <option key={d.day} value={d.day}>
                    {fmtDate(d.date)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
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
                  <p className="text-[11px] text-text-secondary mb-1">
                    {a.label}{' '}
                    <span className="text-gray-300">· нажми, чтобы развернуть</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {pa ? (
                      <AuthImage
                        src={clientsApi.photoFileUrl(pa.id)}
                        className="aspect-[3/4] w-full object-cover rounded-xl"
                        onClick={openPair}
                      />
                    ) : (
                      <div className="aspect-[3/4] rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-300">
                        нет фото
                      </div>
                    )}
                    {pb ? (
                      <AuthImage
                        src={clientsApi.photoFileUrl(pb.id)}
                        className="aspect-[3/4] w-full object-cover rounded-xl"
                        onClick={openPair}
                      />
                    ) : (
                      <div className="aspect-[3/4] rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-300">
                        нет фото
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Fold>
      )}

      {/* ===== 5. История замеров ===== */}
      {isLoading ? (
        <div className="animate-pulse bg-white rounded-card h-14" />
      ) : (
        measurements.length > 0 && (
          <Fold
            icon={<History className="w-5 h-5 text-primary" />}
            title="История замеров"
            count={measurements.length}
          >
            <div className="space-y-3">
              {measurements.map((m, i) => {
                const prev = measurements[i + 1]
                const filled = FIELDS.filter((f) => m[f.key] != null)
                return (
                  <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-primary mb-1">
                          {fmtDate(m.date)}
                          {m.byTrainer && (
                            <span className="text-text-secondary"> · тренер</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-primary">
                          {filled.map((f) => {
                            const v = m[f.key]
                            const pv = prev?.[f.key]
                            const d = pv != null ? Math.round((v - pv) * 10) / 10 : null
                            return (
                              <span key={f.key} className="whitespace-nowrap">
                                <span className="text-text-secondary">{f.label}</span>{' '}
                                {v}
                                <span className="text-text-secondary text-xs"> {f.unit}</span>
                                {d !== null && d !== 0 && (
                                  <span
                                    className={`text-xs ${
                                      d < 0 ? 'text-green-600' : 'text-red-500'
                                    }`}
                                  >
                                    {' '}
                                    {d > 0 ? `+${d}` : d}
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                        {m.note && (
                          <p className="text-xs text-text-secondary mt-1">{m.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Удалить этот замер?')) delMut.mutate(m.id)
                        }}
                        className="text-gray-300 shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Fold>
        )
      )}

      {/* ===== 6. История фото отчётов ===== */}
      {photoDays.length > 0 && (
        <Fold
          icon={<Camera className="w-5 h-5 text-primary" />}
          title="История фото отчётов"
          count={photoDays.length}
        >
          <div className="space-y-3">
            {photoDays.map((d) => (
              <div key={d.day}>
                <p className="text-xs text-text-primary mb-1">{fmtDate(d.date)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANGLES.map((a) => {
                    const p = d.byAngle[a.key]
                    if (!p)
                      return <div key={a.key} className="aspect-[3/4] rounded-xl bg-gray-50" />
                    return (
                      <div key={a.key} className="relative">
                        <AuthImage
                          src={clientsApi.photoFileUrl(p.id)}
                          className="aspect-[3/4] w-full object-cover rounded-xl"
                          onClick={() =>
                            setFullscreen({
                              label: `${a.label} · ${fmtDate(d.date)}`,
                              a: { id: p.id, caption: '' },
                              b: null,
                            })
                          }
                        />
                        <button
                          onClick={() => {
                            if (confirm('Удалить это фото?')) photoDelMut.mutate(p.id)
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center"
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
        </Fold>
      )}

      {/* Пустое состояние */}
      {!isLoading && measurements.length === 0 && photoDays.length === 0 && (
        <Card>
          <p className="text-center text-text-secondary py-6 text-sm">
            Пока нет ни замеров, ни фото. Начни с первого замера — с него начнётся твоя
            история 💪
          </p>
        </Card>
      )}

      {/* Полноэкранный просмотр фото / пары «было-стало» (щипок — зум) */}
      {fullscreen && (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col">
          <div
            className="flex items-center justify-between px-4 pb-2"
            style={{ paddingTop: 'calc(0.75rem + var(--app-safe-top, 0px))' }}
          >
            <div>
              <span className="text-white text-sm font-medium">{fullscreen.label}</span>
              <p className="text-white/50 text-[11px]">
                щипок — приблизить · двойной тап — увеличить
              </p>
            </div>
            <button
              onClick={() => setFullscreen(null)}
              className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className={`flex-1 min-h-0 grid gap-1 p-1 ${
              fullscreen.b ? 'grid-cols-2' : 'grid-cols-1'
            }`}
            style={{ paddingBottom: 'calc(0.5rem + var(--app-safe-bottom, 0px))' }}
          >
            {fullscreen.a && (
              <ZoomableImage
                src={clientsApi.photoFileUrl(fullscreen.a.id)}
                caption={fullscreen.a.caption}
              />
            )}
            {fullscreen.b && (
              <ZoomableImage
                src={clientsApi.photoFileUrl(fullscreen.b.id)}
                caption={fullscreen.b.caption}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
