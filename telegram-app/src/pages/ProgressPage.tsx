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
  { key: 'FRONT', label: 'Перед' },
  { key: 'SIDE', label: 'Бок' },
  { key: 'BACK', label: 'Зад' },
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
      const day = new Date(p.date).toISOString().slice(0, 10)
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
              return (
                <div key={a.key}>
                  <p className="text-[11px] text-text-secondary mb-1">{a.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {pa ? (
                      <AuthImage
                        src={clientsApi.photoFileUrl(pa.id)}
                        className="aspect-[3/4] w-full object-cover rounded-xl"
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
    </div>
  )
}
