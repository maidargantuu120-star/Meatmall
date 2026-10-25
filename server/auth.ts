import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, UserWithNullablePhone } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sendWelcomeEmail } from "./email";

// Add custom properties to Express.User and Session
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      name?: string | null;
      phone?: string | null;
      googleId?: string | null;
      profileImageUrl?: string | null;
      isAdmin: boolean;
    }
  }
}

// Extend session with admin properties
declare module 'express-session' {
  interface SessionData {
    adminLoggedIn?: boolean;
    adminId?: number;
  }
}

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

/**
 * Hash a password with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Verify a password against a hashed password
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    console.log(`Comparing passwords: (supplied-length: ${supplied.length}, stored-format: ${stored.includes('.') ? 'valid' : 'invalid'})`);

    // Check if stored password is in correct format
    if (!stored || !stored.includes('.')) {
      console.error("Invalid stored password format - not in 'hash.salt' format");
      return false;
    }

    const [hashed, salt] = stored.split(".");

    // If either hashed part or salt is missing, authentication fails
    if (!hashed || !salt) {
      console.error("Invalid stored password format - missing hash or salt");
      return false;
    }

    console.log(`Password comparison - hash length: ${hashed.length}, salt length: ${salt.length}`);

    const hashedBuf = Buffer.from(hashed, "hex");

    // Hash the supplied password with the same salt
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    // Compare the two buffers in constant time to prevent timing attacks
    const matches = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${matches ? 'match' : 'no match'}`);

    return matches;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

/**
 * Set up authentication for the Express app
 */
export function setupAuth(app: Express): void {
  // Session configuration with enhanced persistence and longer duration
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSettings: session.SessionOptions = {
    store: new PostgresSessionStore({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      // Add additional options for improved robustness
      pruneSessionInterval: 24 * 60 * 60, // Prune expired sessions once a day (in seconds)
      errorLog: console.error, // Log errors to console
      // Extend session retention in PostgreSQL to match cookie duration
      ttl: 30 * 24 * 60 * 60, // 30 days (in seconds)
    }),
    secret: process.env.SESSION_SECRET || 'gerinmah-secret-key',
    resave: true, // Resave session even if unmodified to keep it alive
    saveUninitialized: true, // Save uninitialized sessions for mobile compatibility
    rolling: true, // Reset maxAge on every response
    cookie: {
      secure: isProduction, // Secure in production (HTTPS), false in development
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days for extremely long persistence
      httpOnly: true, // Protect against XSS attacks
      sameSite: 'lax', // CSRF protection
      path: '/',
      domain: undefined // Allow cookies on all domains for mobile
    },
    name: 'gerinmah.sid' // Give our session a specific name
  };

  // Set up session middleware
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure LocalStrategy for authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting to authenticate user: ${username}`);

        // Check if username is provided
        if (!username || !password) {
          console.log("Authentication failed: Username or password missing");
          return done(null, false, { message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" });
        }

        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);

        // If not found by username, try email (check if input looks like email)
        if (!user && username.includes('@')) {
          console.log(`No user found with username, trying email: ${username}`);
          user = await storage.getUserByEmail(username);
        }

        if (!user) {
          console.log(`Authentication failed: No user found with username/email: ${username}`);
          return done(null, false, { message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" });
        }

        // Compare passwords
        console.log(`User found, comparing passwords for user: ${username}`);
        const passwordsMatch = await comparePasswords(password, user.password);

        if (!passwordsMatch) {
          console.log(`Authentication failed: Invalid password for user: ${username}`);
          return done(null, false, { message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" });
        }

        // Cast to the correct type to handle null vs undefined for phone
        const userWithNullablePhone: UserWithNullablePhone = user as UserWithNullablePhone;

        console.log(`Authentication successful for user: ${username}`);
        return done(null, userWithNullablePhone);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }),
  );

  // Configure Google OAuth Strategy if credentials are available
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    console.log("Google OAuth configured and enabled");

    // Determine callback URL based on environment
    const baseUrl = process.env.BASE_URL || 'https://arvijix.kr';
    const callbackURL = `${baseUrl}/api/auth/google/callback`;

    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: callbackURL,
          scope: ['profile', 'email'],
          state: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth callback received for:", profile.displayName);

            const email = profile.emails?.[0]?.value;
            const googleId = profile.id;
            const name = profile.displayName;
            const profileImageUrl = profile.photos?.[0]?.value;

            if (!email) {
              console.error("No email provided by Google");
              return done(null, false, { message: "Google 계정에서 이메일을 가져올 수 없습니다" });
            }

            // Check if user already exists with this Google ID
            let user = await storage.getUserByGoogleId(googleId);

            if (user) {
              console.log(`Found existing user by Google ID: ${user.username}`);
              return done(null, user as UserWithNullablePhone);
            }

            // Check if user exists with this email
            user = await storage.getUserByEmail(email);

            if (user) {
              // Link Google account to existing user
              console.log(`Linking Google account to existing user: ${user.username}`);
              user = await storage.updateUserGoogleId(user.id, googleId, profileImageUrl);
              return done(null, user as UserWithNullablePhone);
            }

            // Create new user with Google account
            console.log(`Creating new user from Google account: ${email}`);
            const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);
            const randomPassword = await hashPassword(randomBytes(32).toString('hex'));

            const newUser = await storage.createUser({
              username,
              email,
              password: randomPassword,
              name: name || '',
              phone: null,
              googleId,
              profileImageUrl,
            });

            // Send welcome email
            try {
              await sendWelcomeEmail({
                userName: newUser.name || newUser.username,
                userEmail: newUser.email,
              });
              console.log(`Welcome email sent to ${newUser.email}`);
            } catch (emailError) {
              console.error("Failed to send welcome email:", emailError);
            }

            return done(null, newUser as UserWithNullablePhone);
          } catch (error) {
            console.error("Google OAuth error:", error);
            return done(error as Error);
          }
        }
      )
    );

    // Google OAuth routes
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (req, res) => {
        console.log("Google OAuth login successful");
        res.redirect("/auth/callback");
      }
    );
  } else {
    console.log("Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
  }

  // Configure serialization for session storage
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      // Cast to the correct type to handle null vs undefined for phone
      const userWithNullablePhone = user as UserWithNullablePhone;
      done(null, userWithNullablePhone);
    } catch (error) {
      done(error);
    }
  });

  // User registration route
  app.post("/api/register", async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.username || req.body.username.trim() === '') {
        res.status(400).json({
          success: false,
          message: "Хэрэглэгчийн нэр оруулах шаардлагатай"
        });
        return;
      }

      if (!req.body.email || req.body.email.trim() === '') {
        res.status(400).json({
          success: false,
          message: "И-мэйл хаяг оруулах шаардлагатай"
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email.trim())) {
        res.status(400).json({
          success: false,
          message: "Зөв и-мэйл хаяг оруулна уу"
        });
        return;
      }

      if (!req.body.password || req.body.password.length < 6) {
        res.status(400).json({
          success: false,
          message: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"
        });
        return;
      }

      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username.trim());
      if (existingUserByUsername) {
        res.status(400).json({
          success: false,
          message: "Энэ хэрэглэгчийн нэр аль хэдийн бүртгэгдсэн байна"
        });
        return;
      }

      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(req.body.email.trim());
      if (existingUserByEmail) {
        res.status(400).json({
          success: false,
          message: "Энэ и-мэйл хаяг аль хэдийн бүртгэгдсэн байна"
        });
        return;
      }

      // Create new user with hashed password and cleaned data
      const userData = {
        username: req.body.username.trim(),
        email: req.body.email.trim().toLowerCase(),
        password: await hashPassword(req.body.password),
        name: req.body.name ? req.body.name.trim() : "",
        phone: req.body.phone ? req.body.phone.trim() : null,
      };
      const user = await storage.createUser(userData);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Send welcome email
      try {
        await sendWelcomeEmail({
          userName: user.name || user.username,
          userEmail: user.email,
        });
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Continue with registration even if email fails
      }

      // Log the user in automatically
      try {
        // Cast to the correct type to handle null vs undefined for phone
        const userWithNullablePhone = user as UserWithNullablePhone;

        await new Promise<void>((resolve, reject) => {
          req.login(userWithNullablePhone, (err) => {
            if (err) {
              console.error("Login error during registration:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        // If login successful, send user data with success message
        res.status(201).json({
          success: true,
          user: userWithoutPassword,
          message: "Бүртгэл амжилттай үүсгэгдлээ"
        });
      } catch (loginError) {
        console.error("Login error after registration:", loginError);
        // Still send success since registration was successful
        res.status(201).json({
          success: true,
          user: userWithoutPassword,
          message: "Бүртгэл амжилттай үүссэн боловч автоматаар нэвтрэхэд алдаа гарлаа. Дахин нэвтэрнэ үү."
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Бүртгэл үүсгэх үед алдаа гарлаа"
      });
    }
  });

  // User login route
  app.post("/api/login", (req, res) => {
    // Validate the request body
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    console.log("Login request received for username:", req.body.username);
    console.log("Cookie header:", req.headers.cookie);
    console.log("Session before auth:", req.session);

    passport.authenticate("local", async (err: Error, user: UserWithNullablePhone, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({
          success: false,
          message: "서버 오류가 발생했습니다" // Server error occurred
        });
      }

      if (!user) {
        console.log("Authentication failed:", info);
        return res.status(401).json({
          success: false,
          message: info?.message || "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" // Username or password is incorrect
        });
      }

      console.log("User authenticated successfully:", user.id, user.username);

      // Use a promise to handle the login properly
      try {
        await new Promise<void>((resolve, reject) => {
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Login error:", loginErr);
              reject(loginErr);
              return;
            }
            resolve();
          });
        });

        console.log("Login successful, session saved");
        console.log("Session after login:", req.session);
        console.log("Authentication status:", req.isAuthenticated());

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        // Set a explicit cookie header to help debug
        res.cookie('sessionActive', 'true', {
          maxAge: 1000 * 60 * 60 * 24, // 1 day
          httpOnly: false,
          path: '/',
          sameSite: 'lax'
        });

        // Send just the user object directly as this is what the client expects
        return res.status(200).json(userWithoutPassword);
      } catch (loginErr) {
        console.error("Login session error:", loginErr);
        return res.status(500).json({
          success: false,
          message: "Нэвтрэх үйл явцад алдаа гарлаа" // Error creating login session
        });
      }
    })(req, res);
  });

  // User logout route with improved cookie clearing
  app.post("/api/logout", (req, res) => {
    // Store the user status before logout for logging
    const wasAuthenticated = req.isAuthenticated();
    const userId = req.user?.id;

    console.log(`Logout attempt by user: ${userId}, authenticated: ${wasAuthenticated}`);

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        res.status(500).json({
          success: false,
          message: "Гарах үед алдаа гарлаа"
        });
        return;
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
          res.status(500).json({
            success: false,
            message: "Сэшн устгах үед алдаа гарлаа"
          });
          return;
        }

        // Clear session cookie with all relevant options for complete removal
        res.clearCookie('gerinmah.sid', {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });

        // Clear additional cookies
        res.clearCookie('sessionActive', { path: '/' });

        // Also clear any other potential session cookies
        res.clearCookie('connect.sid', { path: '/' });

        console.log(`User ${userId} successfully logged out`);

        res.status(200).json({
          success: true,
          message: "Амжилттай гарлаа"
        });
      });
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    console.log("GET /api/user request received");
    console.log("Cookies:", req.headers.cookie);
    console.log("Session ID:", req.sessionID);
    console.log("Session:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User in session:", req.user);

    if (!req.isAuthenticated()) {
      console.log("User not authenticated, returning 401");
      return res.status(401).json({
        message: "Үйлдлийг гүйцэтгэхийн тулд нэвтрэх шаардлагатай",
        debug: {
          hasSession: !!req.session,
          sessionID: req.sessionID,
          authenticated: req.isAuthenticated()
        }
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as UserWithNullablePhone;
    res.json(userWithoutPassword);
  });

  // Get user's order history
  app.get("/api/user/orders", async (req, res) => {
    console.log("GET /api/user/orders request received");
    console.log("User in session:", req.user);
    console.log("Is authenticated:", req.isAuthenticated());

    if (!req.isAuthenticated()) {
      console.log("User not authenticated, returning 401");
      return res.status(401).json({ message: "Захиалгын түүхийг харахын тулд нэвтрэх шаардлагатай" });
    }

    try {
      const userId = req.user!.id;
      console.log("Fetching orders for user ID:", userId);

      const orders = await storage.getUserOrders(userId);
      console.log(`Found ${orders.length} orders for user ID ${userId}`);

      return res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      return res.status(500).json({ message: "Захиалгын түүхийг авахад алдаа гарлаа" });
    }
  });
}