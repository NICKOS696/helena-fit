import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { MOCK_GROUPS } from '@/data/exerciseGuideMock'
import { isPreviewUser } from '@/lib/preview'
import { haptic } from '@/lib/telegram'

export const ExerciseGuidePage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  // Закрытое превью — только для владельца
  if (!isPreviewUser()) return <Navigate to="/" replace />

  const groups = MOCK_GROUPS.filter((g) =>
    g.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-text-primary">Упражнения</h1>
        <span className="text-[10px] font-bold uppercase tracking-wide bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
          Превью
        </span>
      </div>
      <p className="text-sm text-text-secondary -mt-2">
        Справочник по группам мышц — техника, разбор и короткие видео.
      </p>

      {/* Поиск */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск группы мышц"
          className="w-full bg-background-card rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none border border-transparent focus:border-primary/40"
        />
      </div>

      {/* Группы мышц */}
      <div className="space-y-3">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              haptic.selection()
              navigate(`/guide/${g.id}`)
            }}
            className="w-full text-left rounded-card overflow-hidden shadow-card active:scale-[0.98] transition-transform relative"
            style={{
              background: `linear-gradient(110deg, ${g.gradient[0]}, ${g.gradient[1]})`,
            }}
          >
            {g.image ? (
              // Стиль референса: тело с подсветкой справа, название слева
              <div className="relative h-40">
                <img
                  src={g.image}
                  alt={g.name}
                  className="absolute right-0 top-0 h-full w-1/2 object-cover object-top"
                  style={{
                    maskImage:
                      'linear-gradient(to right, transparent, #000 22%)',
                    WebkitMaskImage:
                      'linear-gradient(to right, transparent, #000 22%)',
                  }}
                />
                <div className="relative h-full flex flex-col justify-center px-5">
                  <div className="text-white text-2xl font-bold drop-shadow">
                    {g.name}
                  </div>
                  <div className="text-white/70 text-xs mt-1">
                    {g.exercises.length}{' '}
                    {g.exercises.length === 1 ? 'упражнение' : 'упражнения'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            ) : (
              <div className="flex items-center justify-between px-5 py-6">
                <div>
                  <div className="text-white text-xl font-bold">{g.name}</div>
                  <div className="text-white/80 text-xs mt-1">
                    {g.exercises.length}{' '}
                    {g.exercises.length === 1 ? 'упражнение' : 'упражнения'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-4xl drop-shadow-sm">{g.emoji}</span>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>
              </div>
            )}
          </button>
        ))}
        {groups.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">
            Ничего не найдено
          </p>
        )}
      </div>

      <p className="text-[11px] text-text-secondary text-center pt-2">
        Это макет для наглядности. Видео и упражнения — тестовые.
      </p>
    </div>
  )
}
