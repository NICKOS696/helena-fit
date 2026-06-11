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

  const toggleFavorite = useMutation({
    mutationFn: () => 
      isFavorite 
        ? recipesApi.removeFromFavorites(recipeId)
        : recipesApi.addToFavorites(recipeId),
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
      disabled={toggleFavorite.isPending}
      className={clsx(
        'rounded-full flex items-center justify-center transition-all duration-300',
        'active:scale-90 bg-white/90 backdrop-blur-sm shadow-md',
        sizeClasses[size],
        className
      )}
    >
      <Heart
        className={clsx(
          'transition-all duration-300',
          iconSizes[size],
          isFavorite 
            ? 'fill-primary text-primary' 
            : 'text-white'
        )}
      />
    </button>
  )
}
