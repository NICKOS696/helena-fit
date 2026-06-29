import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recipesApi } from '@/lib/api'
import { haptic } from '@/lib/telegram'
import clsx from 'clsx'

interface FavoriteButtonProps {
  recipeId: string
  isFavorite: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const FavoriteButton = ({ 
  recipeId, 
  isFavorite, 
  size = 'md',
  className 
}: FavoriteButtonProps) => {
  const queryClient = useQueryClient()
  // Оптимистичное состояние: меняем иконку сразу, не дожидаясь сервера
  const [optimistic, setOptimistic] = useState(isFavorite)
  useEffect(() => setOptimistic(isFavorite), [isFavorite])

  const toggleFavorite = useMutation({
    mutationFn: () =>
      optimistic
        ? recipesApi.removeFromFavorites(recipeId)
        : recipesApi.addToFavorites(recipeId),
    onMutate: () => {
      setOptimistic((v) => !v) // мгновенно переключаем визуально
    },
    onError: () => {
      setOptimistic((v) => !v) // откат при ошибке сети
    },
    onSuccess: () => {
      // Обновляем все запросы с рецептами
      queryClient.invalidateQueries({ queryKey: ['recipe-collection'] })
      queryClient.invalidateQueries({ queryKey: ['recipe'] })
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        haptic.impact('light')
        toggleFavorite.mutate()
      }}
      className={clsx(
        'rounded-full flex items-center justify-center transition-colors',
        'active:scale-90 backdrop-blur-sm shadow-md',
        // Тот же стиль, что у кнопки списка покупок: белый кружок / мягкий зелёный при активации
        optimistic ? 'bg-primary-light' : 'bg-white/90',
        sizeClasses[size],
        className
      )}
    >
      <Heart
        className={clsx(
          iconSizes[size],
          optimistic
            ? 'fill-white text-white'
            : 'text-primary-light/70'
        )}
      />
    </button>
  )
}
