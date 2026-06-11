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
      {/* Непрозрачная заглушка safe-area сверху: в fullscreen не даёт контенту
          «просвечивать» под кнопками Telegram при скролле. Высота 0 вне fullscreen. */}
      <div
        className="fixed top-0 left-0 right-0 bg-white z-40"
        style={{ height: 'var(--app-safe-top)' }}
      />
      <Outlet />
      <BottomNav />
    </div>
  )
}
