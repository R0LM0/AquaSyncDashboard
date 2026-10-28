export const REMEMBERED_USER_KEY = 'aquasync.dashboard.usuario'

/** Only the username is remembered; the password never touches storage. */
export function readRememberedUser(storage: Storage = localStorage): string {
  try {
    return storage.getItem(REMEMBERED_USER_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveRememberedUser(usuario: string, storage: Storage = localStorage): void {
  try {
    const value = usuario.trim()
    if (value) storage.setItem(REMEMBERED_USER_KEY, value)
    else storage.removeItem(REMEMBERED_USER_KEY)
  } catch {
    /* private mode: the choice just does not persist */
  }
}

export function clearRememberedUser(storage: Storage = localStorage): void {
  try {
    storage.removeItem(REMEMBERED_USER_KEY)
  } catch {
    /* ignore */
  }
}
