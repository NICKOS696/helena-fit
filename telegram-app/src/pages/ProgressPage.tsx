import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Plus, TrendingDown, Trash2, Ruler } from 'lucide-react'

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

export const ProgressPage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())

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
  const first = measurements[measurements.length - 1]
  const last = measurements[0]

  return (
    <div className="p-4 space-y-4 pb-8">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1 text-sm text-text-secondary"
      >
        <ArrowLeft className="w-4 h-4" />
        Профиль
      </button>

      <h1 className="text-2xl font-bold text-text-primary">Мой прогресс</h1>

      {/* Итог с первого замера */}
      {measurements.length >= 2 && (
        <Card className="bg-gradient-to-r from-primary-light/15 to-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            <p className="font-bold text-text-primary text-sm">
              С первого замера ({fmtDate(first.date)})
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {FIELDS.map((f) => {
              const a = first?.[f.key]
              const b = last?.[f.key]
              if (a == null || b == null) return null
              const d = Math.round((b - a) * 10) / 10
              if (d === 0) return null
              return (
                <span key={f.key} className="text-text-primary">
                  {f.label}:{' '}
                  <b className={d < 0 ? 'text-green-600' : 'text-red-500'}>
                    {d > 0 ? `+${d}` : d} {f.unit}
                  </b>
                </span>
              )
            })}
          </div>
        </Card>
      )}

      {/* Новый замер */}
      {showForm ? (
        <Card>
          <p className="font-bold text-text-primary mb-3">Новый замер — {new Date().toLocaleDateString('ru-RU')}</p>
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
      ) : (
        <button
          onClick={() => {
            haptic.selection()
            setShowForm(true)
          }}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary text-white py-3.5 rounded-xl font-medium active:scale-[0.98] transition-transform"
        >
          <Plus className="w-5 h-5" />
          Добавить замер
        </button>
      )}

      {/* История */}
      {isLoading ? (
        <div className="animate-pulse bg-white rounded-card h-24" />
      ) : measurements.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-6 text-sm">
            Пока нет замеров. Добавь первый — с него начнётся твоя история 💪
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {measurements.map((m, i) => {
            const prev = measurements[i + 1]
            return (
              <Card key={m.id} className="!p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-text-primary text-sm">
                    {fmtDate(m.date)}
                    {m.byTrainer && (
                      <span className="ml-2 text-[10px] font-medium text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                        тренер
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Удалить этот замер?')) delMut.mutate(m.id)
                    }}
                    className="text-gray-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                  {FIELDS.map((f) => {
                    const v = m[f.key]
                    if (v == null) return null
                    const pv = prev?.[f.key]
                    const d = pv != null ? Math.round((v - pv) * 10) / 10 : null
                    return (
                      <div key={f.key} className="text-sm">
                        <span className="text-text-secondary text-xs">{f.label}</span>
                        <p className="text-text-primary font-medium">
                          {v}
                          {d !== null && d !== 0 && (
                            <span
                              className={`ml-1 text-xs ${d < 0 ? 'text-green-600' : 'text-red-500'}`}
                            >
                              {d > 0 ? `+${d}` : d}
                            </span>
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {m.note && <p className="text-xs text-text-secondary mt-2">{m.note}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
