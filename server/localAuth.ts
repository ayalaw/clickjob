import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

async function createDefaultAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@localhost';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    if (existingAdmin) {
      console.log('✅ משתמש מנהל קיים כבר');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    await storage.createUser({
      email: adminEmail,
      firstName: 'מנהל',
      lastName: 'מערכת',
      password: passwordHash,
      username: 'admin',
      isActive: true
    });

    console.log('✅ נוצר משתמש מנהל ראשי:');
    console.log(`📧 אימייל: ${adminEmail}`);
    console.log(`🔑 סיסמה: ${adminPassword}`);
  } catch (error) {
    console.error('שגיאה ביצירת משתמש מנהל:', error);
  }
}

export async function setupAuth(app: Express) {
  console.log('🔐 מגדיר מערכת אימות מקומית...');
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Create default admin user
  await createDefaultAdminUser();

  // Local authentication strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        
        if (!user || !user.isActive) {
          return done(null, false, { message: 'משתמש לא נמצא או לא פעיל' });
        }

        if (!user.password) {
          return done(null, false, { message: 'משתמש לא מוגדר עם סיסמה' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'סיסמה שגויה' });
        }

        // Update last login
        await storage.updateUser(user.id, { lastLogin: new Date() });

        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('Deserialize user error:', error);
      done(null, false);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'שגיאה במערכת' });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || 'פרטי התחברות שגויים' });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'שגיאה בהתחברות' });
        }
        
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          }
        });
      });
    })(req, res, next);
  });

  // Registration route
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, username } = req.body;
      
      // Validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'כל השדות נדרשים' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'משתמש עם האימייל הזה כבר קיים' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await storage.createUser({
        email,
        password: passwordHash,
        firstName,
        lastName,
        username: username || email.split('@')[0],
        isActive: true
      });

      // Log the user in
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'שגיאה בהתחברות' });
        }
        res.json({ 
          success: true, 
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username
          }
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'שגיאה ביצירת משתמש' });
    }
  });


  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'שגיאה בהתנתקות' });
      }
      res.json({ success: true });
    });
  });

  console.log('✅ מערכת אימות מקומית הוגדרה בהצלחה');
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};