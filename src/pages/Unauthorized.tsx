import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function Unauthorized() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You don't have access to this page</h1>
      <p className="text-sm text-muted-foreground">Contact your AI Cost Manager if you believe this is a mistake.</p>
      <Button asChild className="bg-primary hover:bg-primary-hover">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
