import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '@/providers/TelegramProvider'
import { getTelegramUser } from '@/lib/telegram'
import { usersApi, clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { CalorieCalculator } from '@/components/CalorieCalculator'
import { User, Dumbbell, UtensilsCrossed, Receipt, MessageCircle, ChevronDown, Ruler, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

// Единая сворачиваемая секция профиля: иконка в круге, заголовок, подпись
const Section = ({
  icon,
  title,
  subtitle,
  count,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  count?: number
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-base">
            {title}
            {typeof count === 'number' && count > 0 && (
              <span className="text-text-secondary text-sm"> ({count})</span>
            )}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}

export const ProfilePage = () => {
  const { user } = useTelegram()
  // Имя и фото берём из Telegram (first_name / photo_url), а если их там нет —
  // из нашего профиля на сервере (firstName / photoUrl)
  const tgUser: any = getTelegramUser()
  const firstName = tgUser?.first_name || user?.firstName || user?.first_name || ''
  const lastName = tgUser?.last_name || user?.lastName || user?.last_name || ''
  const username = tgUser?.username || user?.username || ''
  const photoUrl = tgUser?.photo_url || user?.photoUrl || user?.photo_url || ''
  const [photoFailed, setPhotoFailed] = useState(false)
  const navigate = useNavigate()

  // Клиент ли я у тренера — открывает блок «Мой прогресс»
  const { data: clientMe } = useQuery({
    queryKey: ['client-me'],
    queryFn: () => clientsApi.getMe(),
  })
  const isClient = clientMe?.data?.isClient

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile(),
  })

  const { data: accessData } = useQuery({
    queryKey: ['access'],
    queryFn: () => usersApi.getAccess(),
  })

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => usersApi.getTransactions(),
  })

  const profile = profileData?.data
  const access = accessData?.data
  const transactions = transactionsData?.data || []

  return (
    <div className="p-4 space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          {photoUrl && !photoFailed ? (
            <img
              src={photoUrl}
              alt={firstName}
              onError={() => setPhotoFailed(true)}
              className="w-16 h-16 rounded-full object-cover bg-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-text-primary truncate">
              {`${firstName} ${lastName}`.trim() || 'Пользователь'}
            </h2>
            {profile?.phoneNumber && (
              <p className="text-text-secondary text-sm">{profile.phoneNumber}</p>
            )}
            {username && <p className="text-text-secondary text-sm truncate">@{username}</p>}
          </div>
        </div>
      </Card>

      {/* Мой прогресс — только для клиентов тренера */}
      {isClient && (
        <button
          onClick={() => navigate('/progress')}
          className="w-full text-left rounded-card overflow-hidden shadow-card active:scale-[0.98] transition-transform"
          style={{ background: '#717C5A' }}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Ruler className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold">Мой прогресс</div>
              <div className="text-white/80 text-xs mt-0.5">
                Замеры тела и динамика результатов
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
          </div>
        </button>
      )}

      <CalorieCalculator />

      <Section
        icon={<Dumbbell className="w-5 h-5 text-primary" />}
        title="Мои тренировки"
        subtitle="Купленные сборники тренировок"
        count={access?.workouts?.length}
      >
        {access?.workouts?.length > 0 ? (
          <div className="space-y-2">
            {access.workouts.map((workout: any) => (
              <button
                key={workout.id}
                onClick={() => navigate(`/workouts/${workout.id}`)}
                className="w-full flex items-center gap-3 text-left active:opacity-60"
              >
                {workout.coverImage && (
                  <img
                    src={workout.coverImage}
                    alt={workout.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <span className="flex-1 text-text-primary">{workout.title}</span>
                <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">У вас пока нет купленных тренировок</p>
        )}
      </Section>

      <Section
        icon={<UtensilsCrossed className="w-5 h-5 text-primary" />}
        title="Мои рецепты"
        subtitle="Купленные сборники рецептов"
        count={access?.recipes?.length}
      >
        {access?.recipes?.length > 0 ? (
          <div className="space-y-2">
            {access.recipes.map((recipe: any) => (
              <button
                key={recipe.id}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                className="w-full flex items-center gap-3 text-left active:opacity-60"
              >
                {recipe.coverImage && (
                  <img
                    src={recipe.coverImage}
                    alt={recipe.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <span className="flex-1 text-text-primary">{recipe.title}</span>
                <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">У вас пока нет купленных рецептов</p>
        )}
      </Section>

      <Section
        icon={<Receipt className="w-5 h-5 text-primary" />}
        title="История покупок"
        subtitle="Платежи и их статусы"
        count={transactions.length}
      >
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction: any) => (
              <div key={transaction.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-text-primary font-medium">
                    {transaction.itemType === 'WORKOUT_COLLECTION' ? 'Тренировки' : 'Рецепты'}
                  </span>
                  <span className="text-text-primary font-bold">
                    {transaction.amount.toLocaleString()} сум
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    {new Date(transaction.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : transaction.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {transaction.status === 'COMPLETED'
                      ? 'Оплачено'
                      : transaction.status === 'PENDING'
                      ? 'В ожидании'
                      : 'Отменено'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">История покупок пуста</p>
        )}
      </Section>

      <div className="pt-4 pb-2 flex justify-center">
        <button
          onClick={() => {
            const url = 'https://t.me/Ioca_uz'
            const tg = (window as any).Telegram?.WebApp
            if (tg?.openTelegramLink) {
              tg.openTelegramLink(url)
            } else if (tg?.openLink) {
              tg.openLink(url)
            } else {
              window.open(url, '_blank')
            }
          }}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Обратиться в тех.поддержку</span>
        </button>
      </div>
    </div>
  )
}
