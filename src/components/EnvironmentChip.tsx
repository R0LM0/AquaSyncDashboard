import { useMemo } from 'react'
import { CircleDot, FlaskConical, Server, Signal } from 'lucide-react'
import { currentEnvironment, describeEnvironment, type EnvironmentTone } from '@/app/environment'
import type { RuntimeEnvironment } from '@/app/runtimeEnvironment'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const toneIcon: Record<EnvironmentTone, typeof Server> = {
  success: Server,
  warning: FlaskConical,
  info: Signal,
  violet: CircleDot,
}

export interface EnvironmentChipProps {
  /** Overrides for tests; the running app resolves them from import.meta.env. */
  env?: { MODE: string; VITE_API_MODE?: string; VITE_API_URL?: string; VITE_API_PORT?: string }
  apiUrl?: string
  /** Runtime environment chosen on the login (production build switch). */
  environment?: RuntimeEnvironment
  className?: string
}

export function EnvironmentChip({ env, apiUrl, environment, className }: EnvironmentChipProps) {
  const info = useMemo(() => {
    if (env && apiUrl) return describeEnvironment(env, apiUrl, environment)
    return currentEnvironment(env, undefined, environment)
  }, [env, apiUrl, environment])

  const Icon = toneIcon[info.tone]

  return (
    <TooltipProvider>
      <Tooltip content={`Conectado a ${info.detail}`}>
        <span tabIndex={0} className={cn('inline-flex outline-none', className)}>
          <Badge tone={info.tone} data-testid="environment-chip" data-tone={info.tone}>
            <Icon className="size-3" aria-hidden="true" />
            {info.label}
          </Badge>
        </span>
      </Tooltip>
    </TooltipProvider>
  )
}
