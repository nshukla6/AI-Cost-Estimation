import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
      <Button asChild className="bg-primary hover:bg-primary-hover">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
