import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/components/AuthContext'
import { appConfig } from '@/config/app.config'
import { navigationConfig } from '@/config/navigation.config'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const items = navigationConfig.filter((item) => hasPermission(item.permission))

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className={cn('flex size-10 items-center justify-center text-lg font-semibold text-white', appConfig.branding.logoContainerClassName)}>
          {appConfig.branding.logoInitial}
        </div>
        <span className="font-semibold leading-tight">{appConfig.appShortName}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {items.map((item) => {
          // For a parent with sub-items (e.g. Departments), highlight it
          // whenever any child route is active — not just its own exact path.
          const sectionActive = item.children
            ? location.pathname.startsWith(`/${item.path.split('/')[1]}`)
            : location.pathname === item.path

          return (
            <div key={item.path}>
              <NavLink
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-tab-inactive-hover',
                  sectionActive && 'bg-tab-active text-white hover:bg-tab-active',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>

              {item.children && (
                <div className="mt-1 flex flex-col gap-1 pl-8">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        cn(
                          'rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-tab-inactive-hover',
                          isActive && 'bg-tab-active text-white hover:bg-tab-active',
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
