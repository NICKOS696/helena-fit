import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Search, ChevronRight, ArrowLeft } from 'lucide-react'
import { getMockGroup } from '@/data/exerciseGuideMock'
import { isPreviewUser } from '@/lib/preview'
import { haptic } from '@/lib/telegram'

export const ExerciseGroupPage = () => {
  const navigate = useNavigate()
  const { groupId } = useParams()
  const [query, setQuery] = useState('')

  if (!isPreviewUser()) return <Navigate to="/" replace />

  const group = getMockGroup(groupId)
  if (!group) return <Navigate to="/guide" replace />

  const exercises = group.exercises.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => navigate('/guide')}
        className="flex items-center gap-1 text-sm text-text-secondary"
      >
        <ArrowLeft className="w-4 h-4" />
        Все группы
      </button>

      <div className="flex items-center gap-3">
        <span className="text-3xl">{group.emoji}</span>
        <h1 className="text-2xl font-bold text-text-primary">{group.name}</h1>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения"
          className="w-full bg-background-card rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none border border-transparent focus:border-primary/40"
        />
      </div>

      {/* Список упражнений */}
      <div className="space-y-2">
        {exercises.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              haptic.selection()
              navigate(`/guide/${group.id}/${e.id}`)
            }}
            className="w-full text-left bg-background-card rounded-card shadow-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            {/* Превью-кадр */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-3xl"
              style={{
                background: `linear-gradient(135deg, ${group.gradient[0]}, ${group.gradient[1]})`,
              }}
            >
              {e.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text-primary leading-tight">
                {e.name}
              </div>
              <div className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                {e.subtitle}
              </div>
              <div className="text-[11px] text-primary mt-1">{e.level}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          </button>
        ))}
        {exercises.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">
            Ничего не найдено
          </p>
        )}
      </div>
    </div>
  )
}
