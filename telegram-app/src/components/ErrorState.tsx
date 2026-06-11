import { ArrowLeft, RefreshCw } from 'lucide-react'

interface Props {
  message?: string
  onRetry?: () => void
  onBack?: () => void
}

/**
 * Унифицированное состояние ошибки/отсутствия данных на экранах,
 * чтобы пользователь не видел пустой/сломанный экран при сбое API.
 */
export const ErrorState = ({ message, onRetry, onBack }: Props) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <p className="text-base font-semibold text-text-primary mb-2">
        Не удалось загрузить данные
      </p>
      <p className="text-sm text-text-secondary mb-6">
        {message || 'Проверьте соединение и попробуйте ещё раз.'}
      </p>
      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-gray-100 text-text-primary py-3 px-5 rounded-xl font-medium hover:bg-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-primary text-white py-3 px-5 rounded-xl font-medium hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            Повторить
          </button>
        )}
      </div>
    </div>
  )
}
