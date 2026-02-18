'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { ImportUrlModal } from './ImportUrlModal'

export function ImportUrlButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Link2 className="h-4 w-4" />
        Import URL
      </button>
      <ImportUrlModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
