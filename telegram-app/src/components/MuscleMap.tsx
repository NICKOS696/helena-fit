import { MuscleKey } from '@/data/exerciseGuideMock'

// Собственная анатомическая карта (без сторонней графики).
// Стилизованное тело спереди/сзади: каждая мышца — отдельная фигура,
// которую можно подсветить по данным упражнения.
// Когда появится фотореалистичный набор — заменим SVG на картинки,
// сохранив те же ключи мышц (primary/secondary).

interface MuscleMapProps {
  primary: MuscleKey[]
  secondary: MuscleKey[]
}

const COLOR = {
  primary: '#E0524D', // основная мышца — насыщенный красный
  secondary: '#F2A9A4', // вспомогательная — бледнее
  idle: '#D9DBD3', // неактивная мышца
  base: '#C7CABF', // нейтральные части (голова, таз, суставы)
  stroke: '#B4B8AB',
}

export const MuscleMap = ({ primary, secondary }: MuscleMapProps) => {
  const p = new Set(primary)
  const s = new Set(secondary)
  const fill = (key: MuscleKey) =>
    p.has(key) ? COLOR.primary : s.has(key) ? COLOR.secondary : COLOR.idle

  const common = { stroke: COLOR.stroke, strokeWidth: 1 }

  return (
    <div>
      <div className="flex justify-center gap-4">
        {/* ВИД СПЕРЕДИ */}
        <div className="flex-1 max-w-[160px]">
          <svg viewBox="0 0 150 340" className="w-full h-auto">
            {/* нейтральная база */}
            <circle cx="75" cy="26" r="17" fill={COLOR.base} />
            <rect x="68" y="40" width="14" height="12" rx="5" fill={COLOR.base} />
            <rect x="58" y="150" width="34" height="24" rx="9" fill={COLOR.base} />
            <circle cx="64" cy="242" r="7" fill={COLOR.base} />
            <circle cx="86" cy="242" r="7" fill={COLOR.base} />

            {/* дельты (перед) */}
            <ellipse cx="51" cy="61" rx="13" ry="11" fill={fill('delts_front')} {...common} />
            <ellipse cx="99" cy="61" rx="13" ry="11" fill={fill('delts_front')} {...common} />
            {/* грудь */}
            <path d="M63 66 q-12 2 -12 12 q0 8 12 8 q6 0 6 -10 q0 -10 -6 -10Z" fill={fill('chest')} {...common} />
            <path d="M87 66 q12 2 12 12 q0 8 -12 8 q-6 0 -6 -10 q0 -10 6 -10Z" fill={fill('chest')} {...common} />
            {/* бицепсы */}
            <ellipse cx="42" cy="90" rx="8" ry="16" fill={fill('biceps')} {...common} />
            <ellipse cx="108" cy="90" rx="8" ry="16" fill={fill('biceps')} {...common} />
            {/* предплечья */}
            <ellipse cx="34" cy="122" rx="7" ry="17" fill={fill('forearms')} {...common} />
            <ellipse cx="116" cy="122" rx="7" ry="17" fill={fill('forearms')} {...common} />
            {/* пресс */}
            <rect x="64" y="88" width="22" height="56" rx="9" fill={fill('abs')} {...common} />
            {/* косые */}
            <ellipse cx="58" cy="120" rx="6" ry="17" fill={fill('obliques')} {...common} />
            <ellipse cx="92" cy="120" rx="6" ry="17" fill={fill('obliques')} {...common} />
            {/* приводящие */}
            <ellipse cx="75" cy="200" rx="6" ry="26" fill={fill('adductors')} {...common} />
            {/* квадры */}
            <ellipse cx="63" cy="205" rx="12" ry="33" fill={fill('quads')} {...common} />
            <ellipse cx="87" cy="205" rx="12" ry="33" fill={fill('quads')} {...common} />
            {/* голени (перед) */}
            <ellipse cx="64" cy="285" rx="8" ry="30" fill={fill('tibialis')} {...common} />
            <ellipse cx="86" cy="285" rx="8" ry="30" fill={fill('tibialis')} {...common} />
          </svg>
          <p className="text-center text-[11px] text-text-secondary mt-1">Спереди</p>
        </div>

        {/* ВИД СЗАДИ */}
        <div className="flex-1 max-w-[160px]">
          <svg viewBox="0 0 150 340" className="w-full h-auto">
            {/* нейтральная база */}
            <circle cx="75" cy="26" r="17" fill={COLOR.base} />
            <rect x="58" y="150" width="34" height="22" rx="9" fill={COLOR.base} />
            <circle cx="64" cy="242" r="7" fill={COLOR.base} />
            <circle cx="86" cy="242" r="7" fill={COLOR.base} />

            {/* трапеции */}
            <path d="M60 46 L90 46 L84 80 L66 80 Z" fill={fill('traps')} {...common} />
            {/* дельты (зад) */}
            <ellipse cx="51" cy="61" rx="13" ry="11" fill={fill('delts_rear')} {...common} />
            <ellipse cx="99" cy="61" rx="13" ry="11" fill={fill('delts_rear')} {...common} />
            {/* широчайшие */}
            <path d="M66 78 q-14 6 -8 34 l14 4 Z" fill={fill('lats')} {...common} />
            <path d="M84 78 q14 6 8 34 l-14 4 Z" fill={fill('lats')} {...common} />
            {/* трицепсы */}
            <ellipse cx="42" cy="90" rx="8" ry="16" fill={fill('triceps')} {...common} />
            <ellipse cx="108" cy="90" rx="8" ry="16" fill={fill('triceps')} {...common} />
            {/* предплечья */}
            <ellipse cx="34" cy="122" rx="7" ry="17" fill={fill('forearms')} {...common} />
            <ellipse cx="116" cy="122" rx="7" ry="17" fill={fill('forearms')} {...common} />
            {/* поясница */}
            <rect x="66" y="116" width="18" height="26" rx="6" fill={fill('lower_back')} {...common} />
            {/* ягодичные */}
            <ellipse cx="66" cy="164" rx="12" ry="13" fill={fill('glutes')} {...common} />
            <ellipse cx="84" cy="164" rx="12" ry="13" fill={fill('glutes')} {...common} />
            {/* бицепс бедра */}
            <ellipse cx="63" cy="208" rx="12" ry="31" fill={fill('hamstrings')} {...common} />
            <ellipse cx="87" cy="208" rx="12" ry="31" fill={fill('hamstrings')} {...common} />
            {/* икры */}
            <ellipse cx="64" cy="285" rx="9" ry="28" fill={fill('calves')} {...common} />
            <ellipse cx="86" cy="285" rx="9" ry="28" fill={fill('calves')} {...common} />
          </svg>
          <p className="text-center text-[11px] text-text-secondary mt-1">Сзади</p>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="w-3 h-3 rounded-full" style={{ background: COLOR.primary }} />
          Основные
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="w-3 h-3 rounded-full" style={{ background: COLOR.secondary }} />
          Вспомогательные
        </span>
      </div>
    </div>
  )
}
