export class DuplicateAccountSecretError extends Error {
  constructor() {
    super('An account with this secret is already saved.');
    this.name = 'DuplicateAccountSecretError';
  }
}
