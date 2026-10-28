/** An API error carrying the HTTP status and the envelope title. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string

  constructor(message: string, status: number, title = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.title = title
  }
}

/** 401/403 outside login: the session is gone and the app must go back to login. */
export class SessionExpiredError extends ApiError {
  constructor(message = 'La sesión expiró. Iniciá sesión otra vez.') {
    super(message, 401, 'Unauthorized')
    this.name = 'SessionExpiredError'
  }
}

/** 404: the resource does not exist (the panel shows "Cuenta no encontrada"). */
export class NotFoundError extends ApiError {
  constructor(message = 'Cuenta no encontrada') {
    super(message, 404, 'Not Found')
    this.name = 'NotFoundError'
  }
}

export function isNotFound(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

export function isSessionExpired(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
