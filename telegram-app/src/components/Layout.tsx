import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export const Layout = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav />
    </div>
  )
}
