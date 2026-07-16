import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Plus, Trash2, Ruler, Scale, ChevronDown } from 'lucide-react'

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
  // Сравнение произвольных дат: id выбранных замеров («было» / «стало»)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [compareOpen, setCompareOpen] = useState(false)

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

  // Замеры для сравнения: по умолчанию первый и последний
  const mA =
    measurements.find((m) => m.id === compareA) || first
  const mB =
    measurements.find((m) => m.id === compareB) || last
  const compareRows = FIELDS.map((f) => {
    const a = mA?.[f.key]
    const b = mB?.[f.key]
    if (a == null || b == null) return null
    return { ...f, a, b, d: Math.round((b - a) * 10) / 10 }
  }).filter(Boolean) as { key: string; label: string; unit: string; a: number; b: number; d: number }[]

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

      {/* Сравнение любых двух дат — свёрнуто, раскрывается по тапу */}
      {measurements.length >= 2 && (
        <Card className="!p-0 overflow-hidden">
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <span className="flex items-center gap-2 font-bold text-text-primary text-sm">
              <Scale className="w-5 h-5 text-primary" />
              Сравнить периоды
            </span>
            <ChevronDown
              className={`w-5 h-5 text-text-secondary transition-transform ${
                compareOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {compareOpen && (
          <div className="px-4 pb-4">
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
                    {r.a} → <b>{r.b}</b> {r.unit}
                    {r.d !== 0 && (
                      <b className={`ml-2 ${r.d < 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {r.d > 0 ? `+${r.d}` : r.d}
                      </b>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
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
            const filled = FIELDS.filter((f) => m[f.key] != null)
            return (
              <Card key={m.id} className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text-secondary mb-1">
                      {fmtDate(m.date)}
                      {m.byTrainer && ' · тренер'}
                    </p>
                    <p className="text-sm text-text-primary leading-relaxed">
                      {filled.map((f, idx) => {
                        const v = m[f.key]
                        const pv = prev?.[f.key]
                        const d = pv != null ? Math.round((v - pv) * 10) / 10 : null
                        return (
                          <span key={f.key} className="whitespace-nowrap">
                            {idx > 0 && <span className="text-gray-300"> · </span>}
                            <span className="text-text-secondary">{f.label}</span>{' '}
                            <b>{v}</b>
                            {d !== null && d !== 0 && (
                              <span
                                className={`text-xs ${d < 0 ? 'text-green-600' : 'text-red-500'}`}
                              >
                                {' '}
                                {d > 0 ? `+${d}` : d}
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </p>
                    {m.note && <p className="text-xs text-text-secondary mt-1">{m.note}</p>}
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
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
