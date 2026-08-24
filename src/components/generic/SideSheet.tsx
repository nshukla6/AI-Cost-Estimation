import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface SideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit?: () => void
  submitLabel?: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  submittingLabel?: string
}

/**
 * Generic reusable side panel for add/edit forms — no domain logic.
 * Feature forms render their own fields as children.
 */
export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Submit',
  submitDisabled,
  isSubmitting,
  submittingLabel = 'Submitting...',
}: SideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 space-y-4 px-4">{children}</div>

        {onSubmit && (
          <SheetFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary-hover"
              onClick={onSubmit}
              disabled={submitDisabled || isSubmitting}
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
