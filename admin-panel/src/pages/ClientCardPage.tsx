import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminClientsApi } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Users, Save } from 'lucide-react'

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
  arm: '',
  note: '',
})

export const ClientCardPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [notesDraft, setNotesDraft] = useState<string | null>(null)

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

      {/* Замеры */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">
            Замеры <span className="text-gray-400 font-normal">({measurements.length})</span>
          </h2>
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
      </div>
    </div>
  )
}
