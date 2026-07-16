import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '@/providers/TelegramProvider'
import { usersApi, clientsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { CalorieCalculator } from '@/components/CalorieCalculator'
import { User, Dumbbell, UtensilsCrossed, Receipt, MessageCircle, ChevronDown, Ruler, ChevronRight } from 'lucide-react'

export const ProfilePage = () => {
  const { user } = useTelegram()
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)

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
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.first_name}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-light to-primary flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {user?.first_name || 'Пользователь'} {user?.last_name || ''}
            </h2>
            {profile?.phoneNumber && (
              <p className="text-text-secondary text-sm">{profile.phoneNumber}</p>
            )}
            {user?.username && (
              <p className="text-text-secondary text-sm">@{user.username}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Мой прогресс — только для клиентов тренера */}
      {isClient && (
        <button
          onClick={() => navigate('/progress')}
          className="w-full text-left rounded-card overflow-hidden shadow-card active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(110deg, #8A9A6E, #5F6A49)' }}
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

      <Card>
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Мои тренировки
        </h3>
        {access?.workouts?.length > 0 ? (
          <div className="space-y-2">
            {access.workouts.map((workout: any) => (
              <div key={workout.id} className="flex items-center gap-3">
                {workout.coverImage && (
                  <img
                    src={workout.coverImage}
                    alt={workout.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <span className="text-text-primary">{workout.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">У вас пока нет купленных тренировок</p>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          Мои рецепты
        </h3>
        {access?.recipes?.length > 0 ? (
          <div className="space-y-2">
            {access.recipes.map((recipe: any) => (
              <div key={recipe.id} className="flex items-center gap-3">
                {recipe.coverImage && (
                  <img
                    src={recipe.coverImage}
                    alt={recipe.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <span className="text-text-primary">{recipe.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">У вас пока нет купленных рецептов</p>
        )}
      </Card>

      <Card>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            История покупок
            {transactions.length > 0 && (
              <span className="text-sm font-normal text-text-secondary">
                ({transactions.length})
              </span>
            )}
          </h3>
          <ChevronDown
            className={`w-5 h-5 text-text-secondary transition-transform ${
              historyOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {historyOpen &&
          (transactions.length > 0 ? (
          <div className="space-y-3 mt-3">
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
                    className={`text-xs px-2 py-1 rounded ${
                      transaction.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : transaction.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary mt-3">История покупок пуста</p>
        ))}
      </Card>

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
