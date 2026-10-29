import type { Bindings } from './types';
import { ensureRecoveryTables, recoveryLimit, recoveryLimitHits } from './password-recovery';

// Wrong passwords allowed per 15 minutes, per network address and per typed account name.
// Only failures count, so normal sign-ins never use up the allowance.
const MAX_FAILURES_PER_IP = 20;
const MAX_FAILURES_PER_ACCOUNT = 10;

// One answer for "no such account" and "wrong password", so the response never reveals which accounts exist
export const LOGIN_FAILED_MESSAGE = 'Нэвтрэх нэр эсвэл нууц үг буруу байна.';
export const LOGIN_LOCKED_MESSAGE = 'Олон удаа буруу оруулсан тул 15 минутын дараа дахин оролдоно уу.';

export const loginAccountKey = (login: string) => login.trim().toLowerCase();

export async function loginLocked(env: Bindings, ip: string, account: string): Promise<boolean> {
  await ensureRecoveryTables(env.DB);
  const [ipHits, accountHits] = await Promise.all([
    recoveryLimitHits(env, 'login-ip', ip),
    recoveryLimitHits(env, 'login-account', account),
  ]);
  return ipHits >= MAX_FAILURES_PER_IP || accountHits >= MAX_FAILURES_PER_ACCOUNT;
}

export async function recordLoginFailure(env: Bindings, ip: string, account: string): Promise<void> {
  await Promise.all([
    recoveryLimit(env, 'login-ip', ip, MAX_FAILURES_PER_IP),
    recoveryLimit(env, 'login-account', account, MAX_FAILURES_PER_ACCOUNT),
  ]);
}
