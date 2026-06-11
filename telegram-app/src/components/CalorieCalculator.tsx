import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Calculator } from 'lucide-react'

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

    const newResult = { calories, protein, fat, carbs, bmr: Math.round(bmr) }
    setResult(newResult)

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ form, result: newResult })
      )
    } catch {}
  }

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Калькулятор КБЖУ
        </h3>
        <span className="text-sm text-text-secondary">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <form onSubmit={calculate} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Возраст
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="10"
                max="100"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Пол</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'female' })}
                  className={`flex-1 py-2 rounded-lg border text-sm ${
                    form.gender === 'female'
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-text-primary'
                  }`}
                >
                  Жен
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'male' })}
                  className={`flex-1 py-2 rounded-lg border text-sm ${
                    form.gender === 'male'
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-text-primary'
                  }`}
                >
                  Муж
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Рост (см)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="250"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-text-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Уровень активности
            </label>
            <select
              value={form.activity}
              onChange={(e) =>
                setForm({ ...form, activity: parseFloat(e.target.value) as Activity })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-text-primary bg-white"
            >
              {activityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Цель</label>
            <div className="grid grid-cols-3 gap-2">
              {goalOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, goal: opt.value })}
                  className={`py-2 rounded-lg border text-sm ${
                    form.goal === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90"
          >
            Рассчитать
          </button>

          {result && (
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
                  <div className="text-xs text-text-secondary mb-0.5">Белки</div>
                  <div className="text-lg font-bold text-primary">
                    {result.protein} г
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
                  <div className="text-xs text-text-secondary mb-0.5">Жиры</div>
                  <div className="text-lg font-bold text-primary">
                    {result.fat} г
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
                  <div className="text-xs text-text-secondary mb-0.5">Углеводы</div>
                  <div className="text-lg font-bold text-primary">
                    {result.carbs} г
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
                  <div className="text-xs text-text-secondary mb-0.5">Ккал</div>
                  <div className="text-lg font-bold text-primary">
                    {result.calories}
                  </div>
                </div>
              </div>
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
