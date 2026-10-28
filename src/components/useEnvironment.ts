import { useState } from 'react'
import { currentEnvironment } from '@/app/environment'

/** Resolved once per mount: the environment does not change at runtime. */
export function useEnvironment() {
  const [info] = useState(() => currentEnvironment())
  return info
}
