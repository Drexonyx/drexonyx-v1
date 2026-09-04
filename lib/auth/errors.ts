export class AuthorizationError extends Error {
  readonly code = 'AUTHORIZATION_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TenantIsolationError extends Error {
  readonly code = 'TENANT_ISOLATION_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationError';
  }
}
