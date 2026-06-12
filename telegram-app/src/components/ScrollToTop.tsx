import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Сбрасывает скролл к началу страницы при смене маршрута.
 * Без этого позиция скролла «переезжает» с предыдущего экрана,
 * и страница открывается пролистанной вниз.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
