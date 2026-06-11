import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Глобальный перехватчик ошибок рендера админки — вместо белого экрана
 * показывает понятное сообщение с кнопкой перезагрузки.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Render error:', error)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Что-то пошло не так
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Попробуйте перезагрузить страницу.
          </p>
          <button
            onClick={this.handleReload}
            className="bg-primary text-white py-3 px-6 rounded-lg font-medium hover:opacity-90"
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
