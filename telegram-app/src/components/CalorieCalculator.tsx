import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Calculator, ChevronDown } from 'lucide-react'

type Gender = 'male' | 'female'
type Activity = 1.2 | 1.375 | 1.55 | 1.725 | 1.9
type Goal = 'lose' | 'maintain' | 'gain'

interface FormState {
  age: string
  gender: Gender
  weight: string
  height: string
  activity: Activity
  goal: Goal
}

interface Result {
  calories: number
  protein: number
  fat: number
  carbs: number
  bmr: number
  water: number
}

// Доп. вода в зависимости от уровня активности (литры), к базе 30 мл/кг
const waterActivityBonus: Record<Activity, number> = {
  1.2: 0,
  1.375: 0.3,
  1.55: 0.5,
  1.725: 0.7,
  1.9: 1.0,
}

const STORAGE_KEY = 'kbju_calculator_v1'

const activityOptions: { value: Activity; label: string }[] = [
  { value: 1.2, label: 'Минимальная (сидячая работа)' },
  { value: 1.375, label: 'Лёгкая (тренировки 1–3 раза/нед)' },
  { value: 1.55, label: 'Средняя (3–5 раз/нед)' },
  { value: 1.725, label: 'Высокая (6–7 раз/нед)' },
  { value: 1.9, label: 'Очень высокая (спортсмен)' },
]

const goalOptions: { value: Goal; label: string; multiplier: number }[] = [
  { value: 'lose', label: 'Похудение', multiplier: 0.8 },
  { value: 'maintain', label: 'Поддержание', multiplier: 1 },
  { value: 'gain', label: 'Набор массы', multiplier: 1.15 },
]

export const CalorieCalculator = () => {
  const [form, setForm] = useState<FormState>({
    age: '',
    gender: 'female',
    weight: '',
    height: '',
    activity: 1.375,
    goal: 'maintain',
  })
  const [result, setResult] = useState<Result | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.form) setForm(parsed.form)
        if (parsed.result) setResult(parsed.result)
      }
    } catch {}
  }, [])

  const calculate = (e: React.FormEvent) => {
    e.preventDefault()
    const age = parseInt(form.age)
    const weight = parseFloat(form.weight)
    const height = parseFloat(form.height)

    if (!age || !weight || !height) return

    // Формула Миффлина–Сан Жеора
    const bmr =
      form.gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161

    const tdee = bmr * form.activity
    const goalMult = goalOptions.find((g) => g.value === form.goal)!.multiplier
    const calories = Math.round(tdee * goalMult)

    // Макросы (процент от калорий):
    // Белки 27% / 4 ккал, Жиры 27% / 9 ккал, Углеводы 46% / 4 ккал
    const protein = Math.round((calories * 0.27) / 4)
    const fat = Math.round((calories * 0.27) / 9)
    const carbs = Math.round((calories * 0.46) / 4)

    // Норма воды: 30 мл на кг веса + поправка на активность
    const water = Math.round((weight * 0.03 + waterActivityBonus[form.activity]) * 10) / 10

    const newResult = { calories, protein, fat, carbs, bmr: Math.round(bmr), water }
    setResult(newResult)

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ form, result: newResult })
      )
    } catch {}
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-base">Калькулятор КБЖУ</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Дневная норма калорий и воды
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <form onSubmit={calculate} className="px-4 pb-4 pt-1 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Возраст
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="10"
                max="100"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary focus:outline-none focus:border-primary focus:bg-white transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Пол</label>
              <div className="flex h-11 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'female' })}
                  className={`flex-1 rounded-lg text-sm font-medium transition-colors ${
                    form.gender === 'female'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary'
                  }`}
                >
                  Жен
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'male' })}
                  className={`flex-1 rounded-lg text-sm font-medium transition-colors ${
                    form.gender === 'male'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary'
                  }`}
                >
                  Муж
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Вес (кг)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="20"
                max="300"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary focus:outline-none focus:border-primary focus:bg-white transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Рост (см)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="250"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary focus:outline-none focus:border-primary focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Уровень активности
            </label>
            <div className="relative">
            <select
              value={form.activity}
              onChange={(e) =>
                setForm({ ...form, activity: parseFloat(e.target.value) as Activity })
              }
              className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-text-primary focus:outline-none focus:border-primary"
            >
              {activityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Цель</label>
            <div className="grid grid-cols-3 h-11 p-1 bg-gray-100 rounded-xl">
              {goalOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, goal: opt.value })}
                  className={`rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                    form.goal === opt.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold active:scale-[0.98] transition-transform"
          >
            Рассчитать
          </button>

          {result && (
            <div className="mt-4">
              {/* Тот же стиль, что блок КБЖУ в рецепте */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-sm text-text-secondary">Калорийность</span>
                  <span className="text-2xl font-bold text-text-primary">
                    {result.calories}{' '}
                    <span className="text-base font-medium text-text-secondary">ккал</span>
                  </span>
                </div>

                {result.protein + result.fat + result.carbs > 0 && (
                  <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-primary"
                      style={{
                        width: `${(result.protein / (result.protein + result.fat + result.carbs)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-amber-400"
                      style={{
                        width: `${(result.fat / (result.protein + result.fat + result.carbs)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-violet-400"
                      style={{
                        width: `${(result.carbs / (result.protein + result.fat + result.carbs)) * 100}%`,
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Белки
                    </div>
                    <div className="text-base font-bold text-text-primary">
                      {result.protein} г
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Жиры
                    </div>
                    <div className="text-base font-bold text-text-primary">
                      {result.fat} г
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      Углеводы
                    </div>
                    <div className="text-base font-bold text-text-primary">
                      {result.carbs} г
                    </div>
                  </div>
                </div>
              </div>

              {/* Норма воды */}
              {result.water > 0 && (
                <div className="mt-3 bg-sky-50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xl" aria-hidden>💧</span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-text-secondary">Норма воды</span>
                      <span className="text-lg font-bold text-sky-600">
                        {result.water.toLocaleString('ru-RU')} л
                        <span className="text-xs font-medium text-text-secondary">/день</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary/80 mt-0.5">
                      с учётом активности, без учёта чая и кофе
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 text-center space-y-1">
                <p className="text-xs text-text-secondary">
                  BMR: <span className="font-semibold text-text-primary">{result.bmr} ккал</span>
                </p>
                <p className="text-xs text-text-secondary">
                  Расчёт по формуле Миффлина–Сан Жеора
                </p>
                <p className="text-[11px] text-text-secondary/70 italic">
                  Результат носит рекомендательный характер
                </p>
              </div>
            </div>
          )}
        </form>
      )}
    </Card>
  )
}
