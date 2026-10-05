import { Building2, Check, ChevronsUpDown, Globe, LogOut, Monitor, Moon, Plus, RotateCcw, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTheme, type ThemePreference } from '@/app/theme'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-context'
import { useOrganization } from '@/features/organization/organization-context'
import { setLocale } from '@/i18n'
import { cn, initials } from '@/lib/utils'
import { Breadcrumbs } from './breadcrumbs'
import { MobileSidebar } from './mobile-sidebar'

function OrgSwitcher() {
  const { t } = useTranslation()
  const { organizations, active, setActive } = useOrganization()
  const { mode } = useAuth()
  const navigate = useNavigate()
  if (!active) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 max-w-[14rem] gap-2 px-2 sm:h-10" aria-label={t('topbar.switchOrg')}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {initials(active.name.replace('DEMO · ', ''))}
          </span>
          <span className="hidden truncate text-left text-sm font-semibold md:block">{active.name}</span>
          <ChevronsUpDown className="hidden !size-3.5 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('topbar.switchOrg')}</DropdownMenuLabel>
        {organizations.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => setActive(o.id)}>
            <Building2 />
            <span className="flex-1 truncate">{o.name}</span>
            {o.id === active.id && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
        {mode !== 'demo' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/bienvenida')}>
              <Plus /> {t('topbar.newOrg')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { t, i18n } = useTranslation()
  const { session, signOut, mode, exitDemo, resetDemo } = useAuth()
  const { active } = useOrganization()
  const { preference, setPreference } = useTheme()
  const navigate = useNavigate()
  if (!session) return null
  const themeIcon = { light: Sun, dark: Moon, system: Monitor } as const
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex size-11 items-center justify-center rounded-full sm:size-10"
          aria-label={t('topbar.account')}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(session.user.fullName)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold">{session.user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          {active && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('topbar.role')}: <span className="font-medium text-foreground">{t(`roles.${active.role}`)}</span>
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('topbar.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
          {(['light', 'dark', 'system'] as const).map((p) => {
            const Icon = themeIcon[p]
            return (
              <DropdownMenuRadioItem key={p} value={p} onSelect={(e) => e.preventDefault()}>
                <Icon /> {t(`topbar.theme${p[0]!.toUpperCase()}${p.slice(1)}`)}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLocale(i18n.language === 'es' ? 'en' : 'es')}>
          <Globe /> {i18n.language === 'es' ? 'English' : 'Español'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {mode === 'demo' ? (
          <>
            <DropdownMenuItem onSelect={() => resetDemo()}>
              <RotateCcw /> {t('topbar.resetDemo')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void exitDemo().then(() => navigate('/login', { replace: true }))
              }}
            >
              <LogOut /> {t('topbar.exitDemo')}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut /> {t('topbar.signOut')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const { t } = useTranslation()
  const { mode, repo } = useAuth()
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-surface/85 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:px-4 lg:px-6',
      )}
    >
      <MobileSidebar />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      {mode === 'demo' && <Badge tone="demo">{t('common.demoBadge')}</Badge>}
      {repo.kind === 'local' && <Badge className="hidden sm:inline-flex">{t('common.localBadge')}</Badge>}
      <OrgSwitcher />
      <UserMenu />
    </header>
  )
}
