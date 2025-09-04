# Deployment Checklist for Self-Hosted Server

## Pre-Deployment Files Required

### ✅ Core Application Files
- [ ] `client/` - Frontend code
- [ ] `server/` - Backend code  
- [ ] `shared/` - Shared schemas
- [ ] `package.json` - Dependencies
- [ ] `vite.config.ts` - Build configuration
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `drizzle.config.ts` - Database configuration

### ✅ Production Configuration Files
- [ ] `.env.production` - Production environment variables (create from .env.example)
- [ ] `ecosystem.config.js` - PM2 process management
- [ ] Nginx configuration file

### ⚠️ Missing Files to Create

1. **`.env.production`** - Copy from `.env.example` and fill with real values
2. **SSL certificates** - Generate with Let's Encrypt
3. **Nginx site configuration** - Create in `/etc/nginx/sites-available/`

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Security
SESSION_SECRET=64_character_random_string

# Server
NODE_ENV=production
PORT=3000

# Domain
REPLIT_DOMAINS=yourdomain.com
```

## Deployment Commands Summary

```bash
# 1. Install dependencies
npm install

# 2. Build application
npm run build

# 3. Setup database
npm run db:push

# 4. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Files NOT to Copy to Server

- [ ] `node_modules/` - Will be rebuilt on server
- [ ] `.replit` - Replit-specific configuration
- [ ] `attached_assets/` - Local assets only
- [ ] Any `.env` files with real secrets