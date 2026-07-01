import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Repeat, Dumbbell, Target } from 'lucide-react'
import { getMockExercise } from '@/data/exerciseGuideMock'
import { isPreviewUser } from '@/lib/preview'
import { haptic } from '@/lib/telegram'
import clsx from 'clsx'

type Tab = 'description' | 'technique' | 'muscles'

export const ExerciseDetailPage = () => {
  const navigate = useNavigate()
  const { groupId, exerciseId } = useParams()
  const [tab, setTab] = useState<Tab>('description')

  if (!isPreviewUser()) return <Navigate to="/" replace />

  const { group, exercise } = getMockExercise(groupId, exerciseId)
  if (!group || !exercise) return <Navigate to="/guide" replace />

  const tabs: { key: Tab; label: string }[] = [
    { key: 'description', label: 'Описание' },
    { key: 'technique', label: 'Техника' },
    { key: 'muscles', label: 'Мышцы' },
  ]

  return (
    <div className="pb-8">
      {/* Видео (макет зацикленной петли) */}
      <div
        className="relative aspect-square w-full flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${group.gradient[0]}, ${group.gradient[1]})`,
        }}
      >
        <button
          onClick={() => navigate(`/guide/${group.id}`)}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-[110px] drop-shadow-lg animate-pulse">
          {exercise.emoji}
        </span>

        {/* Бейдж «зацикленное видео» */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/30 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full">
          <Repeat className="w-3.5 h-3.5" />
          Видео зациклено · 5–15 сек
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary leading-tight">
            {exercise.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">{exercise.subtitle}</p>
        </div>

        {/* Чипы: сложность / инвентарь */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            <Target className="w-3.5 h-3.5" />
            {exercise.level}
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-text-secondary px-2.5 py-1 rounded-full font-medium">
            <Dumbbell className="w-3.5 h-3.5" />
            {exercise.equipment}
          </span>
        </div>

        {/* Вкладки */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                haptic.selection()
                setTab(t.key)
              }}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key
                  ? 'bg-primary text-white'
                  : 'bg-background-card text-text-secondary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Контент вкладки */}
        {tab === 'description' && (
          <p className="text-text-primary leading-relaxed text-[15px]">
            {exercise.description}
          </p>
        )}

        {tab === 'technique' && (
          <div className="space-y-3">
            {exercise.technique.map((step, i) => (
              <div
                key={i}
                className="flex gap-3 bg-background-card rounded-card shadow-card p-3"
              >
                <div className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <p className="text-[15px] text-text-primary leading-snug pt-0.5">
                  {step}
                </p>
              </div>
            ))}

            {/* Внимание */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold text-red-500">ВНИМАНИЕ!</span>
              </div>
              <ul className="space-y-2">
                {exercise.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-[15px] text-text-primary">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span className="leading-snug">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'muscles' && (
          <div className="space-y-3">
            {exercise.anatomyImage ? (
              <div
                className="rounded-card overflow-hidden"
                style={{ background: 'radial-gradient(circle at 50% 35%, #3a3f46, #16181c)' }}
              >
                <img
                  src={exercise.anatomyImage}
                  alt="Анатомия — работающие мышцы"
                  className="w-full h-auto object-contain max-h-[70vh] mx-auto"
                />
              </div>
            ) : (
              /* Заглушка под будущую фотореалистичную анатомию (генерируем картинки) */
              <div className="rounded-card bg-background-card border border-dashed border-gray-300 p-6 text-center">
                <div className="text-3xl mb-1">🫀</div>
                <p className="text-sm text-text-secondary">
                  Здесь появится анатомическая карта с подсветкой работающих мышц
                </p>
              </div>
            )}
            <p className="text-sm text-text-secondary">Работающие мышцы:</p>
            <div className="flex flex-wrap gap-2">
              {exercise.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
