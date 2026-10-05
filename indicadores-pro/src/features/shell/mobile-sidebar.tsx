import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { SidebarNav } from './sidebar'

/** En pantallas pequeñas la barra lateral se convierte en un panel deslizable. */
export function MobileSidebar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.openMenu')}>
          <Menu className="!size-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/50 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[85vw] animate-slide-in flex-col bg-sidebar shadow-xl lg:hidden">
          <Dialog.Title className="sr-only">{t('nav.main')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('nav.main')}</Dialog.Description>
          <div className="flex h-16 items-center justify-between pl-6 pr-2">
            <Logo inverted />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-white/10" aria-label={t('nav.closeMenu')}>
                <X className="!size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
