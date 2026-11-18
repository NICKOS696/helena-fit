import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { hasNativeBack } from '@/components/HeaderBack'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { AuthImage } from '@/components/AuthImage'
import { haptic, tg } from '@/lib/telegram'
import { pluralize } from '@/utils/plural'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Ruler,
  Check,
  ChevronDown,
  Camera,
  CalendarDays,
  MessageCircleHeart,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'

// Поля замера: ключ, короткая подпись (история/сравнение), подпись в форме, единица
const FIELDS: { key: string; label: string; form: string; unit: string }[] = [
  { key: 'weight', label: 'Вес', form: 'Вес', unit: 'кг' },
  { key: 'chest', label: 'Грудь', form: 'Объём груди', unit: 'см' },
  { key: 'waist', label: 'Талия', form: 'Объём талии', unit: 'см' },
  { key: 'belly', label: 'Живот', form: 'Объём живота (по самой выпуклой части)', unit: 'см' },
  { key: 'hips', label: 'Бёдра', form: 'Объём бёдер (по самой выпуклой части)', unit: 'см' },
  { key: 'thigh', label: 'Под ягодицами', form: 'Объём ног под ягодицами', unit: 'см' },
]

type Angle = 'FRONT' | 'SIDE_LEFT' | 'SIDE_RIGHT' | 'BACK'

const ANGLES: { key: Angle; label: string }[] = [
  { key: 'FRONT', label: 'Вид спереди' },
  { key: 'SIDE_LEFT', label: 'Сбоку слева' },
  { key: 'SIDE_RIGHT', label: 'Сбоку справа' },
  { key: 'BACK', label: 'Вид сзади' },
]

const emptyForm = () => ({
  weight: '',
  chest: '',
  waist: '',
  belly: '',
  hips: '',
  thigh: '',
})

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Сворачиваемая секция в стиле профиля
// Переключатель «Сравнение / История» внутри раздела
const Seg = ({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) => (
  <div className="flex bg-gray-100 rounded-xl p-1 mb-3 text-sm font-medium">
    {options.map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`flex-1 py-1.5 rounded-lg transition-colors ${
          value === key ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
)

const Fold = ({
  icon,
  title,
  count,
  subtitle,
  children,
}: {
  icon: ReactNode
  title: string
  count?: number
  subtitle?: ReactNode
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <span className="flex items-center gap-2 min-w-0 text-left">
          <span className="shrink-0">{icon}</span>
          <span className="min-w-0">
            <span className="block text-text-primary text-base">
              {title}
              {typeof count === 'number' && count > 0 && (
                <span className="text-text-secondary text-sm"> ({count})</span>
              )}
            </span>
            {subtitle && (
              <span className="block text-xs text-text-secondary mt-0.5">{subtitle}</span>
            )}
          </span>
        </span>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform shrink-0 ${
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
    const el = e.currentTarget as Element
    el.setPointerCapture?.(e.pointerId)
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

// Первичная анкета — заполняется один раз перед доступом к прогрессу
const QuestionnaireForm = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [health, setHealth] = useState('')

  const mut = useMutation({
    mutationFn: () => clientsApi.submitQuestionnaire({ fullName, birthDate, health }),
    onSuccess: () => {
      haptic.notify('success')
      onDone()
    },
    onError: () => alert('Не удалось сохранить анкету. Проверьте поля и попробуйте ещё раз.'),
  })

  const canSubmit = fullName.trim().length > 2 && birthDate && health.trim().length > 0

  return (
    <div className="p-4 space-y-3 pb-8">
      {!hasNativeBack() && (
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1 text-sm text-text-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          Профиль
        </button>
      )}
      <h1 className="text-2xl font-bold text-text-primary">Анкета</h1>
      <Card>
        <p className="text-sm text-text-secondary mb-4">
          Заполняется один раз — чтобы тренер знал, с чем работает. Данные видит только
          тренер 💚
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Фамилия Имя Отчество
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванова Мария Сергеевна"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Дата рождения</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Состояние здоровья
            </label>
            <textarea
              value={health}
              onChange={(e) => setHealth(e.target.value)}
              rows={5}
              placeholder="Хронические заболевания, травмы, ограничения по нагрузке, беременность, аллергии, принимаемые препараты — всё, что важно знать тренеру"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <button
          onClick={() => mut.mutate()}
          disabled={!canSubmit || mut.isPending}
          className="w-full mt-4 bg-primary text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {mut.isPending ? 'Сохраняю…' : 'Сохранить и продолжить'}
        </button>
      </Card>
    </div>
  )
}

export const ProgressPage = () => {
  useTelegramBackButton()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  // Какой фотоотчёт открыт в форме: null — сегодняшний, иначе день прошлого отчёта
  const [photoDay, setPhotoDay] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  // Сравнение замеров
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  // Сравнение фото
  const [photoCmpA, setPhotoCmpA] = useState('')
  const [photoCmpB, setPhotoCmpB] = useState('')
  // Выбранные (ещё не загруженные) фото по ракурсам — грузим по кнопке «Сохранить»
  const [pendingPhotos, setPendingPhotos] = useState<
    Partial<Record<Angle, { file: File; url: string }>>
  >({})
  // Впечатления от тренировок
  const [showFbForm, setShowFbForm] = useState(false)
  const [fbText, setFbText] = useState('')
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
  const measurements: any[] = useMemo(() => data?.data || [], [data])


  const { data: photosData } = useQuery({
    queryKey: ['client-photos'],
    queryFn: () => clientsApi.getPhotos(),
    enabled: !!isClient,
  })
  const photos: any[] = useMemo(() => photosData?.data || [], [photosData])

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

  // ===== Отчёт за месяц: что сдано, что осталось =====
  const [measTab, setMeasTab] = useState('compare')
  const [photoTab, setPhotoTab] = useState('compare')
  const report = useMemo(() => {
    const DAY = 86400000
    const dayKey = (t: number) => new Date(t + 5 * 3600 * 1000).toISOString().slice(0, 10)
    const fmtLong = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    const sorted = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const now = Date.now()
    const due = last ? new Date(last.date) : null
    if (due) due.setMonth(due.getMonth() + 1)
    const measDone = !!last && !!due && now < due.getTime()
    const daysLeft = due ? Math.ceil((due.getTime() - now) / DAY) : 0

    // Фотоотчёт текущего цикла: снят не раньше, чем за 2 дня до последних замеров
    // (или до срока, если замеры уже пора делать)
    const cycleFrom = !last
      ? ''
      : dayKey((measDone ? new Date(last.date).getTime() : due!.getTime()) - 2 * DAY)
    const current = photoDays.find((d) => d.day >= cycleFrom)
    const photoCount = current ? ANGLES.filter((a) => current.byAngle[a.key]).length : 0
    const photoDone = photoCount === ANGLES.length

    // Результат с первого замера — коротко, для подзаголовка раздела
    const diff = (key: string) => {
      const vals = sorted.map((m) => m[key]).filter((v) => v != null)
      if (vals.length < 2) return null
      return Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10
    }
    const fmtDiff = (v: number, unit: string) =>
      `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} ${unit}`
    const resultParts = [
      { v: diff('weight'), unit: 'кг', label: 'вес' },
      { v: diff('waist'), unit: 'см', label: 'талия' },
      { v: diff('hips'), unit: 'см', label: 'бёдра' },
    ]
      .filter((r) => r.v !== null)
      .map((r) => ({ text: fmtDiff(r.v as number, r.unit), label: r.label }))

    const nextText = due ? fmtLong(due) : ''
    const monthOf = (d: Date) => d.toLocaleDateString('ru-RU', { month: 'long' })
    let title = 'Всё сдано 🌿'
    let sub = `следующий отчёт — ${nextText}, через ${daysLeft} ${pluralize(daysLeft, 'день', 'дня', 'дней')}`
    if (!last) {
      title = 'Начнём с точки «до»'
      sub = 'Внеси первые замеры и сделай фото'
    } else if (!measDone) {
      title = 'Пора сдать отчёт'
      sub = daysLeft < 0 ? `срок был ${nextText}` : 'срок — сегодня'
    } else if (!photoDone) {
      title = 'Осталось сдать фото'
      sub = `следующий отчёт — ${nextText}`
    }
    return {
      label: !last
        ? 'Первый отчёт'
        : `Отчёт за ${monthOf(measDone ? new Date(last.date) : new Date())}`,
      title,
      sub,
      measDone,
      measText: measDone
        ? `сданы ${fmtLong(new Date(last.date))}`
        : last
          ? 'пора сделать — 6 значений'
          : '6 значений, пара минут',
      photoDone,
      photoCount,
      photoText: photoDone
        ? `сдан ${fmtLong(new Date(current!.date))}`
        : photoCount > 0
          ? `загружено ${photoCount} из 4`
          : '4 фото: спереди, с боков, сзади',
      // куда догружать: в уже начатый отчёт этого цикла или в сегодняшний
      photoDay: current && photoCount > 0 ? (current.day as string) : null,
      sinceText: first ? fmtLong(new Date(first.date)) : '',
      resultParts,
    }
  }, [measurements, photoDays])

  // Сегодняшний фотоотчёт (день по Ташкенту): его можно дополнять и заменять
  const todayKey = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10)
  const todayPhotos: Record<string, any> =
    photoDays.find((d) => d.day === todayKey)?.byAngle || {}
  // Фотоотчёт, открытый в форме (сегодняшний или выбранный прошлый)
  const formDay = photoDay ? photoDays.find((d) => d.day === photoDay) : undefined
  const formPhotos: Record<string, any> = photoDay ? formDay?.byAngle || {} : todayPhotos
  const hasFormPhotos = Object.keys(formPhotos).length > 0
  // Каких ракурсов не хватает с учётом уже загруженных и только что выбранных
  const missingAngles = ANGLES.filter((a) => !pendingPhotos[a.key] && !formPhotos[a.key])
  // Открыть форму фотоотчёта: без аргумента — сегодняшний, с днём — прошлый
  const openPhotoForm = (day: string | null) => {
    haptic.selection()
    clearPending()
    setPhotoDay(day && day !== todayKey ? day : null)
    setShowPhotoForm(true)
    window.scrollTo(0, 0)
  }
  const missingText = missingAngles.map((a) => `«${a.label}»`).join(', ')

  // Вопрос «да/нет»: внутри Telegram — его окно, в браузере — обычное
  const askConfirm = (text: string, onYes: () => void) => {
    const w = tg as any
    if (w?.initData && typeof w.showConfirm === 'function' && w.isVersionAtLeast?.('6.2')) {
      w.showConfirm(text, (ok: boolean) => ok && onYes())
    } else if (window.confirm(text)) {
      onYes()
    }
  }

  const clearPending = () => {
    Object.values(pendingPhotos).forEach((p) => p && URL.revokeObjectURL(p.url))
    setPendingPhotos({})
  }

  // Загрузка всех выбранных фото по кнопке «Сохранить»
  const photoSaveMut = useMutation({
    mutationFn: async () => {
      for (const a of ANGLES) {
        const p = pendingPhotos[a.key]
        // Для прошлого отчёта передаём его дату — фото попадёт в тот же день
        if (p) await clientsApi.addPhoto(p.file, a.key, photoDay ? formDay?.date : undefined)
      }
    },
    onSuccess: () => {
      haptic.notify('success')
      qc.invalidateQueries({ queryKey: ['client-photos'] })
      clearPending()
      setShowPhotoForm(false)
      setPhotoDay(null)
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['client-photos'] })
      alert(
        e?.response?.data?.message ||
          'Не удалось загрузить фото. Проверьте соединение и попробуйте ещё раз.',
      )
    },
  })

  const photoDelMut = useMutation({
    mutationFn: (id: string) => clientsApi.deletePhoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-photos'] }),
  })

  // ===== Впечатления от тренировок =====
  const { data: fbData } = useQuery({
    queryKey: ['client-feedback'],
    queryFn: () => clientsApi.getFeedback(),
    enabled: !!isClient,
  })
  const feedback: any[] = fbData?.data || []

  const fbAddMut = useMutation({
    mutationFn: () => clientsApi.addFeedback(fbText),
    onSuccess: () => {
      haptic.notify('success')
      qc.invalidateQueries({ queryKey: ['client-feedback'] })
      setFbText('')
      setShowFbForm(false)
    },
    onError: () => alert('Не удалось отправить. Попробуйте ещё раз.'),
  })

  const fbDelMut = useMutation({
    mutationFn: (id: string) => clientsApi.deleteFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-feedback'] }),
  })

  // Выбор файла для конкретного ракурса (у каждого слота свой input)
  const onPickAngle = (angle: Angle, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingPhotos((prev) => {
      const old = prev[angle]
      if (old) URL.revokeObjectURL(old.url)
      return { ...prev, [angle]: { file, url: URL.createObjectURL(file) } }
    })
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

  // Анкета не заполнена — показываем её первой (обязательный шаг)
  if (!meData?.data?.hasQuestionnaire) {
    return <QuestionnaireForm onDone={() => qc.invalidateQueries({ queryKey: ['client-me'] })} />
  }

  // Замер сохраняется только целиком: нужны все шесть значений
  const allFilled = FIELDS.every((f) => String((form as any)[f.key] ?? '').trim() !== '')

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
      {!hasNativeBack() && (
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1 text-sm text-text-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          Профиль
        </button>
      )}

      {/* ===== Отчёт за месяц: что сдано и что осталось ===== */}
      {!showForm && !showPhotoForm && !showFbForm && (
        <>
          <div className="rounded-card bg-primary text-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/70">{report.label}</p>
                <p className="text-[19px] font-semibold leading-snug mt-0.5">
                  {report.title}
                </p>
                <p className="text-xs text-white/70 mt-0.5">{report.sub}</p>
              </div>
              <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </span>
            </div>

            <div className="mt-3 divide-y divide-white/20 border-t border-white/20">
              {/* Замеры */}
              <div className="flex items-center gap-3 py-3">
                <span
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${
                    report.measDone ? 'bg-white text-primary-dark' : 'border-2 border-white/70'
                  }`}
                >
                  {report.measDone && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">Замеры</p>
                  <p className="text-xs text-white/70">{report.measText}</p>
                </div>
                {!report.measDone && (
                  <button
                    onClick={() => {
                      haptic.selection()
                      setShowForm(true)
                    }}
                    className="shrink-0 bg-white text-primary-dark text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition-transform"
                  >
                    Внести
                  </button>
                )}
              </div>
              {/* Фотоотчёт */}
              <div className="flex items-center gap-3 pt-3">
                <span
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${
                    report.photoDone ? 'bg-white text-primary-dark' : 'border-2 border-white/70'
                  }`}
                >
                  {report.photoDone && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">Фотоотчёт</p>
                  <p className="text-xs text-white/70">{report.photoText}</p>
                </div>
                {!report.photoDone && (
                  <button
                    onClick={() => openPhotoForm(report.photoDay)}
                    className="shrink-0 bg-white text-primary-dark text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition-transform"
                  >
                    {report.photoCount > 0 ? 'Догрузить' : 'Сдать'}
                  </button>
                )}
              </div>
            </div>
            {/* Результат с первого замера */}
            {report.resultParts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-white/70 mb-2">Результат с {report.sinceText}</p>
                <div className="flex gap-2">
                  {report.resultParts.map((r) => (
                    <div
                      key={r.label}
                      className="flex-1 rounded-xl bg-white/10 px-2 py-2 text-center"
                    >
                      <p className="text-[15px] font-semibold leading-tight">{r.text}</p>
                      <p className="text-[11px] text-white/70 mt-0.5">{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Впечатление от тренировок — с пояснением */}
          <button
            onClick={() => {
              haptic.selection()
              setShowFbForm(true)
            }}
            className="w-full flex items-center gap-3 bg-white rounded-card shadow-card px-4 py-3 text-left active:scale-[0.98] transition-transform"
          >
            <MessageCircleHeart className="w-5 h-5 text-primary shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-text-primary">Впечатление от тренировок</span>
              <span className="block text-xs text-text-secondary">
                Напиши тренеру, как прошли тренировки
              </span>
            </span>
            <ChevronDown className="w-5 h-5 text-text-secondary -rotate-90 shrink-0" />
          </button>
        </>
      )}

      {/* Форма впечатления */}
      {showFbForm && (
        <Card>
          <p className="text-text-primary mb-2">Впечатление от тренировок</p>
          <p className="text-xs text-text-secondary mb-3">
            Как прошли тренировки? Что было тяжело, что понравилось, как самочувствие —
            это увидит тренер.
          </p>
          <textarea
            value={fbText}
            onChange={(e) => setFbText(e.target.value)}
            rows={4}
            placeholder="Например: спина хорошо зашла, но приседы тяжеловато — колено побаливает"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none focus:border-primary/50 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fbAddMut.mutate()}
              disabled={fbAddMut.isPending || !fbText.trim()}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {fbAddMut.isPending ? 'Отправляю…' : 'Отправить тренеру'}
            </button>
            <button
              onClick={() => {
                setFbText('')
                setShowFbForm(false)
              }}
              className="px-5 bg-gray-100 text-text-secondary rounded-xl"
            >
              Отмена
            </button>
          </div>
        </Card>
      )}

      {/* Форма замера */}
      {showForm && (
        <Card>
          <p className="text-text-primary mb-3">
            Новый замер — {new Date().toLocaleDateString('ru-RU')}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-3">
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
            Нужны все шесть замеров. Живот и бёдра измеряй по самой выпуклой части.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !allFilled}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {addMut.isPending ? 'Сохраняю…' : allFilled ? 'Сохранить' : 'Заполни все поля'}
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

      {/* Форма фотоотчёта */}
      {showPhotoForm && (
        <Card>
          <p className="text-text-primary mb-2">
            Фотоотчёт — {photoDay && formDay ? fmtDate(formDay.date) : new Date().toLocaleDateString('ru-RU')}
          </p>
          <p className="text-xs text-text-secondary mb-3">
            Сделай фото в четырёх ракурсах и нажми «Сохранить». Фото приватные — увидите
            только ты и тренер.
            {hasFormPhotos &&
              (photoDay
                ? ' Это прошлый фотоотчёт: можно добавить недостающие фото, заменить уже загруженные нельзя.'
                : ' Загруженные фото уже здесь: нажми на любое, чтобы заменить, или добавь недостающие.')}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {ANGLES.map((a) => {
              const pending = pendingPhotos[a.key]
              const existing = formPhotos[a.key]
              // В прошлом отчёте уже загруженное фото заменить нельзя — только дополнить
              const locked = !!photoDay && !!existing
              return (
                // Свой input на каждый ракурс — исключает подстановку файла
                // от соседнего слота (общий input путал левый/правый бок)
                <label
                  key={a.key}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 border ${
                    locked ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    pending || existing
                      ? 'border-primary/40'
                      : 'bg-gray-100 border-dashed border-gray-300'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={locked}
                    onChange={(e) => onPickAngle(a.key, e)}
                  />
                  {pending ? (
                    <img
                      src={pending.url}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt={a.label}
                    />
                  ) : existing ? (
                    <AuthImage
                      src={clientsApi.photoFileUrl(existing.id)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-text-secondary">Сделать фото</span>
                    </>
                  )}
                  {/* Пометка состояния слота */}
                  {pending ? (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold text-white bg-primary px-1.5 py-0.5 rounded-full">
                      новое
                    </span>
                  ) : existing ? (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold text-primary-dark bg-white/90 px-1.5 py-0.5 rounded-full">
                      загружено
                    </span>
                  ) : null}
                  <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-white bg-black/40 py-0.5 truncate px-1">
                    {a.label}
                    {locked ? '' : pending || existing ? ' · заменить' : ''}
                  </span>
                </label>
              )
            })}
          </div>
          {/* Предупреждение: загружены не все ракурсы */}
          {missingAngles.length > 0 && (Object.keys(pendingPhotos).length > 0 || hasFormPhotos) && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
              Не хватает {missingAngles.length} из 4 фото: {missingText}. Можно сохранить и
              догрузить позже.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (missingAngles.length > 0) {
                  askConfirm(
                    `Загружены не все фото. Не хватает: ${missingText}. Сохранить как есть?`,
                    () => photoSaveMut.mutate(),
                  )
                } else {
                  photoSaveMut.mutate()
                }
              }}
              disabled={
                photoSaveMut.isPending || Object.keys(pendingPhotos).length === 0
              }
              className="flex-1 bg-primary text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {photoSaveMut.isPending ? 'Сохраняю…' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                clearPending()
                setShowPhotoForm(false)
                setPhotoDay(null)
              }}
              className="px-5 bg-gray-100 text-text-secondary rounded-xl"
            >
              Отмена
            </button>
          </div>
        </Card>
      )}

      {/* ===== Замеры: сравнение и история в одном разделе ===== */}
      {isLoading ? (
        <div className="animate-pulse bg-white rounded-card h-14" />
      ) : (
        measurements.length > 0 && (
          <Fold
            icon={<Ruler className="w-5 h-5 text-primary" />}
            title="Замеры"
          >
            <Seg
              value={measTab}
              onChange={setMeasTab}
              options={[
                ['compare', 'Сравнение'],
                ['history', `История (${measurements.length})`],
              ]}
            />
            {measTab === 'compare' ? (
              measurements.length >= 2 ? (
                <>
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
                </>
              ) : (
                <p className="text-sm text-text-secondary py-3">
                  Сравнение «было — стало» появится здесь после следующих замеров — будет
                  видно, что изменилось.
                </p>
              )
            ) : (
              <>
            <div className="space-y-3">
              {measurements.map((m, i) => {
                const prev = measurements[i + 1]
                const filled = FIELDS.filter((f) => m[f.key] != null)
                return (
                  <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                    {/* Дата и удаление */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="text-sm font-semibold text-text-primary">
                        {fmtDate(m.date)}
                        {m.byTrainer && (
                          <span className="font-normal text-text-secondary"> · внёс тренер</span>
                        )}
                      </p>
                      <button
                        onClick={() => {
                          if (confirm('Удалить этот замер?')) delMut.mutate(m.id)
                        }}
                        aria-label="Удалить замер"
                        className="text-gray-300 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Ровная сетка: подпись, значение, изменение к прошлому замеру */}
                    <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                      {filled.map((f) => {
                        const v = m[f.key]
                        const pv = prev?.[f.key]
                        const d = pv != null ? Math.round((v - pv) * 10) / 10 : null
                        return (
                          <div key={f.key} className="min-w-0">
                            <p className="text-[11px] text-text-secondary leading-tight truncate">
                              {f.label}
                            </p>
                            <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
                              {v}
                              <span className="text-xs font-normal text-text-secondary">
                                {' '}
                                {f.unit}
                              </span>
                              {d !== null && d !== 0 && (
                                <span
                                  className={`text-[11px] font-medium ml-1 ${
                                    d < 0 ? 'text-green-600' : 'text-red-500'
                                  }`}
                                >
                                  {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
                                </span>
                              )}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    {m.note && <p className="text-xs text-text-secondary mt-2">{m.note}</p>}
                  </div>
                )
              })}
            </div>
              </>
            )}
            <button
              onClick={() => {
                haptic.selection()
                setShowForm(true)
                window.scrollTo(0, 0)
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-gray-100 text-text-primary py-2.5 rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Добавить замеры
            </button>
          </Fold>
        )
      )}

      {/* ===== Фотоотчёты: сравнение и история в одном разделе ===== */}
      {photoDays.length > 0 && (
        <Fold icon={<Camera className="w-5 h-5 text-primary" />} title="Фотоотчёты">
          <Seg
            value={photoTab}
            onChange={setPhotoTab}
            options={[
              ['compare', 'Сравнение'],
              ['history', `История (${photoDays.length})`],
            ]}
          />
          {photoTab === 'compare' ? (
            photoDays.length >= 2 ? (
              <>
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
                    <span className="text-gray-400">· нажми, чтобы развернуть</span>
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
              </>
            ) : (
              <p className="text-sm text-text-secondary py-3">
                Сравнение фото «было — стало» появится здесь после следующего фотоотчёта.
              </p>
            )
          ) : (
            <>
          <div className="space-y-3">
            {photoDays.map((d) => (
              <div key={d.day}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-text-primary">{fmtDate(d.date)}</p>
                  {(d.day === todayKey || ANGLES.some((a) => !d.byAngle[a.key])) && (
                    <button
                      onClick={() => openPhotoForm(d.day)}
                      className="text-xs font-medium text-primary"
                    >
                      {ANGLES.some((a) => !d.byAngle[a.key]) ? 'Догрузить фото' : 'Заменить фото'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ANGLES.map((a) => {
                    const p = d.byAngle[a.key]
                    if (!p)
                      return (
                        <button
                          key={a.key}
                          onClick={() => openPhotoForm(d.day)}
                          className="aspect-[3/4] rounded-xl bg-amber-50 border border-dashed border-amber-300 flex flex-col items-center justify-center gap-1 text-amber-700"
                        >
                          <Camera className="w-5 h-5" />
                          <span className="text-xs font-medium">Догрузить</span>
                          <span className="text-[10px]">{a.label}</span>
                        </button>
                      )
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
                        {/* Удалять (и тем самым заменять) можно только сегодняшние фото */}
                        {d.day === todayKey && (
                        <button
                          onClick={() => {
                            if (confirm('Удалить это фото?')) photoDelMut.mutate(p.id)
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
            </>
          )}
          <button
            onClick={() => openPhotoForm(null)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-gray-100 text-text-primary py-2.5 rounded-xl text-sm font-medium"
          >
            <Camera className="w-4 h-4" />
            Новый фотоотчёт
          </button>
        </Fold>
      )}

      {/* ===== История впечатлений ===== */}
      {feedback.length > 0 && (
        <Fold
          icon={<MessageCircleHeart className="w-5 h-5 text-primary" />}
          title="Мои впечатления"
          count={feedback.length}
        >
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary mb-1">{fmtDate(f.createdAt)}</p>
                    <p className="text-sm text-text-primary whitespace-pre-line">{f.text}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Удалить это впечатление?')) fbDelMut.mutate(f.id)
                    }}
                    className="text-gray-300 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Fold>
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
