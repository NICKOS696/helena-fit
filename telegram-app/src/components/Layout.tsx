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
      <Outlet />
      <BottomNav />
    </div>
  )
}
