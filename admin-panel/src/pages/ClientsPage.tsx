import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminClientsApi } from '@/lib/api'
import { HeartHandshake, ChevronRight, Users } from 'lucide-react'

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('ru-RU') : '—'

// Статус отчётности клиента: следующий замер ждём через месяц после последнего
const reportStatus = (c: any): { text: string; cls: string } => {
  if (!c.lastMeasurement) return { text: 'замеров нет', cls: 'bg-amber-50 text-amber-700' }
  const last = new Date(c.lastMeasurement.date)
  const due = new Date(last)
  due.setMonth(due.getMonth() + 1)
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return { text: `пора замеры · был ${fmtDate(c.lastMeasurement.date)}`, cls: 'bg-red-50 text-red-600' }
  if (daysLeft <= 3) return { text: `замеры ${fmtDate(due.toISOString())}`, cls: 'bg-primary/10 text-primary-dark' }
  return { text: `замер ${fmtDate(c.lastMeasurement.date)}`, cls: 'bg-gray-100 text-gray-500' }
}

export const ClientsPage = () => {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => adminClientsApi.list(),
  })
  const clients: any[] = data?.data || []
  const active = clients.filter((c) => c.status === 'ACTIVE')
  const archived = clients.filter((c) => c.status !== 'ACTIVE')

  const renderRow = (c: any) => (
    <button
      key={c.id}
      onClick={() => navigate(`/clients/${c.id}`)}
      className="w-full flex items-center gap-3 sm:gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:bg-gray-50 text-left"
    >
      {c.user?.photoUrl ? (
        <img src={c.user.photoUrl} alt="" className="w-12 h-12 rounded-full" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">
          {c.user?.firstName} {c.user?.lastName}
          {c.status !== 'ACTIVE' && (
            <span className="ml-2 text-xs font-medium text-gray-400">(архив)</span>
          )}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {c.user?.username ? `@${c.user.username} · ` : ''}ID {c.user?.telegramId}
        </p>
        {/* На мобильных даты под именем */}
        <p className="text-xs text-gray-400 sm:hidden mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>с {fmtDate(c.startedAt)}</span>
          {c.status === 'ACTIVE' && (
            <span className={`px-2 py-0.5 rounded-full font-medium ${reportStatus(c).cls}`}>
              {reportStatus(c).text}
            </span>
          )}
        </p>
      </div>
      <div className="text-right text-sm text-gray-500 flex-shrink-0 hidden sm:block">
        <p>клиент с {fmtDate(c.startedAt)}</p>
        {c.status === 'ACTIVE' ? (
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${reportStatus(c).cls}`}
          >
            {reportStatus(c).text}
          </span>
        ) : (
          <p>
            {c.lastMeasurement ? `замер: ${fmtDate(c.lastMeasurement.date)}` : 'замеров нет'}
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
    </button>
  )

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <HeartHandshake className="w-8 h-8 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Мои клиенты {active.length > 0 && <span className="text-gray-400 font-normal">({active.length})</span>}
        </h1>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-sm text-gray-600 mb-6">
        Чтобы добавить клиента — найдите человека на странице{' '}
        <b>Пользователи</b> и нажмите значок 🤝 «Сделать клиентом». У него в боте
        откроется раздел «Мой прогресс».
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-12">Загрузка…</p>
      ) : clients.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          Пока нет клиентов — отметьте первого на странице «Пользователи»
        </p>
      ) : (
        <div className="space-y-3">
          {active.map(renderRow)}
          {archived.length > 0 && (
            <>
              <p className="text-sm text-gray-400 pt-4">Архив ({archived.length})</p>
              {archived.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
