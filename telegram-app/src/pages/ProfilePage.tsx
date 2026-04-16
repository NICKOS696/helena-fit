import { useQuery } from '@tanstack/react-query'
import { useTelegram } from '@/providers/TelegramProvider'
import { usersApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { User, Dumbbell, UtensilsCrossed, Receipt } from 'lucide-react'

export const ProfilePage = () => {
  const { user } = useTelegram()

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
              {user?.first_name} {user?.last_name}
            </h2>
            {user?.username && (
              <p className="text-text-secondary">@{user.username}</p>
            )}
            {profile?.phoneNumber && (
              <p className="text-text-secondary">{profile.phoneNumber}</p>
            )}
          </div>
        </div>
      </Card>

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
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          История покупок
        </h3>
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
          <p className="text-text-secondary">История покупок пуста</p>
        )}
      </Card>
    </div>
  )
}
