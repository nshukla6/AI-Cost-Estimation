import { LogOut } from 'lucide-react'

import { useAuth } from '@/components/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/config/roles.config'

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Header() {
  const { currentUser, logout } = useAuth()
  if (!currentUser) return null

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
            <Avatar className="size-8">
              <AvatarFallback>{initialsFor(currentUser.name)}</AvatarFallback>
            </Avatar>
            <div className="text-left text-sm leading-tight">
              <p className="font-medium">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[currentUser.role]}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
