import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express } from 'express';

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  createdAt: string;
}

interface UsersDB {
  [key: string]: User;
}

const USERS_FILE = path.join(process.cwd(), 'users', 'users.json');

// Load users from JSON file
function loadUsers(): UsersDB {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return {};
}

// Save users to JSON file
function saveUsers(users: UsersDB): void {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Find user by email
function findUserByEmail(email: string): User | undefined {
  const users = loadUsers();
  return Object.values(users).find(user => user.email === email);
}

// Find user by ID
function findUserById(id: string): User | undefined {
  const users = loadUsers();
  return users[id];
}

// Create initial admin user if none exists
function createInitialAdmin(): void {
  const users = loadUsers();
  if (Object.keys(users).length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@localhost.local';
    
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    const admin: User = {
      id: 'admin',
      email: adminEmail,
      name: 'Administrator',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    
    users.admin = admin;
    saveUsers(users);
    
    console.log('✅ נוצר משתמש מנהל ראשי:');
    console.log(`📧 אימייל: ${adminEmail}`);
    console.log(`🔑 סיסמה: ${adminPassword}`);
  }
}

// Setup local authentication
export function setupLocalAuth(app: Express): void {
  console.log('🔐 מגדיר מערכת אימות מקומית...');
  
  // Create initial admin user
  createInitialAdmin();
  
  // Session configuration
  const PgSession = connectPg(session);
  
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Local strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email: string, password: string, done) => {
      try {
        const user = findUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'משתמש לא נמצא' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'סיסמה שגויה' });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser((id: string, done) => {
    const user = findUserById(id);
    done(null, user || null);
  });
  
  console.log('✅ מערכת אימות מקומית הוגדרה בהצלחה');
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any): void {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'לא מאומת - נדרש כניסה למערכת' });
}

// Create new user (for registration)
export function createUser(userData: Omit<User, 'id' | 'createdAt' | 'password'> & { password: string }): User {
  const users = loadUsers();
  
  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  
  const newUser: User = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name,
    password: hashedPassword,
    role: userData.role || 'user',
    createdAt: new Date().toISOString()
  };
  
  users[newUser.id] = newUser;
  saveUsers(users);
  
  return newUser;
}

// Update user password
export function updateUserPassword(userId: string, newPassword: string): boolean {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user) {
    return false;
  }
  
  user.password = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  
  return true;
}

// Get all users (without passwords)
export function getAllUsers(): Omit<User, 'password'>[] {
  const users = loadUsers();
  return Object.values(users).map(({ password, ...user }) => user);
}

// Delete user
export function deleteUser(userId: string): boolean {
  const users = loadUsers();
  
  if (users[userId]) {
    delete users[userId];
    saveUsers(users);
    return true;
  }
  
  return false;
}