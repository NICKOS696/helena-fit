import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export const Layout = () => {
  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: 'var(--app-safe-top)',
        paddingBottom: 'calc(5rem + var(--app-safe-bottom))',
      }}
    >
      {/* Брендовая полоса safe-area сверху: в fullscreen не даёт контенту
          «просвечивать» под кнопками Telegram при скролле и читается как
          намеренный топ-бар. Высота 0 вне fullscreen (вид не меняется). */}
      <div
        className="fixed top-0 left-0 right-0 bg-gradient-to-r from-primary-light to-primary z-40"
        style={{ height: 'var(--app-safe-top)' }}
      />
      <Outlet />
      <BottomNav />
    </div>
  )
}
