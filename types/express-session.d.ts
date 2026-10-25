import 'express-session';

declare module 'express-session' {
  interface SessionData {
    admin: boolean;
    userId: number;
    adminLoggedIn: boolean;
    adminId: number;
  }
}