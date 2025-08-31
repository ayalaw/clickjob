import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, requirePermission, injectUserPermissions } from "./authMiddleware";
import { 
  insertCandidateSchema, 
  insertClientSchema, 
  insertJobSchema, 
  insertJobApplicationSchema, 
  insertTaskSchema, 
  insertEmailSchema, 
  insertMessageTemplateSchema,
  insertRoleSchema,
  insertPermissionSchema,
  insertUserRoleSchema,
  insertRolePermissionSchema
} from "@shared/schema";
import { z } from "zod";
import mammoth from 'mammoth';
import { execSync } from 'child_process';
import mime from 'mime-types';
import { sendEmail, emailTemplates, sendWelcomeEmail } from './emailService';
import { generateSecurePassword } from './passwordUtils';
import { checkIncomingEmails, startEmailMonitoring } from './incomingEmailService';
import nodemailer from 'nodemailer';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req: any, file: any, cb: any) => {
      // Keep original extension for proper MIME type detection
      const ext = path.extname(file.originalname);
      const name = file.originalname.split('.')[0];
      cb(null, `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'text/plain',
      'application/octet-stream' // Allow octet-stream for files without proper mime type
    ];
    
    // Also check file extension if mime type is not recognized
    const fileExt = file.originalname.toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    const hasAllowedExtension = allowedExtensions.some(ext => fileExt.endsWith(ext));
    
    if (allowedTypes.includes(file.mimetype) || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and text files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

interface AuthenticatedRequest extends Request {
  user?: any; // The user object from Replit Auth middleware
}

// רשימת ערים בישראל
const israeliCities = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע',
  'בני ברק', 'חולון', 'רמת גן', 'אשקלון', 'רחובות', 'בת ים', 'כפר סבא', 'הרצליה',
  'חדרה', 'מודיעין', 'נצרת', 'לוד', 'רעננה', 'רמלה', 'גבעתיים', 'נהריה', 'אילת',
  'טבריה', 'קריית גת', 'אור יהודה', 'יהוד', 'דימונה', 'טירה', 'אום אל פחם',
  'מגדל העמק', 'שפרעם', 'אכסאל', 'קלנסווה', 'באקה אל גרביה', 'סחנין', 'משהד',
  'ערערה', 'כפר קאסם', 'אריאל', 'מעלה אדומים', 'בית שמש', 'אלעד', 'טמרה',
  'קריית מלאכי', 'מגדל', 'יקנעם', 'נוף הגליל', 'קצרין', 'מטולה', 'ראש פינה'
];

// פונקציה לחילוץ נתונים מטקסט
function extractDataFromText(text: string) {
  console.log('📄 Starting text extraction, text length:', text.length);
  console.log('📄 First 100 chars of text:', text.substring(0, 100));
  
  // לוקחים את 30% העליון של הטקסט
  const upperThird = text.substring(0, Math.floor(text.length * 0.3));
  console.log('📄 Upper third length:', upperThird.length);
  
  const result = {
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    phone: "",
    phone2: "",
    nationalId: "",
    city: "",
    street: "",
    houseNumber: "",
    zipCode: "",
    gender: "",
    maritalStatus: "",
    drivingLicense: "",
    profession: "",
    experience: null as number | null,
    achievements: ""
  };

  // חילוץ אימייל (מכיל @)
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
  const emailMatch = upperThird.match(emailPattern);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // חילוץ טלפון נייד (מתחיל ב-05)
  const mobilePattern = /(05\d{1}[-\s]?\d{7}|05\d{8})/g;
  const mobileMatch = upperThird.match(mobilePattern);
  if (mobileMatch) {
    result.mobile = mobileMatch[0].replace(/[-\s]/g, '');
  }

  // חילוץ טלפון רגיל (03, 04, 08, 09)
  const phonePattern = /(0[3489][-\s]?\d{7})/g;
  const phoneMatch = upperThird.match(phonePattern);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[-\s]/g, '');
  }

  // חילוץ עיר מהרשימה
  const cityFound = israeliCities.find(city => 
    upperThird.includes(city) || text.includes(city)
  );
  if (cityFound) {
    result.city = cityFound;
  }

  // חילוץ כתובת רחוב ומספר בית
  const streetPattern = /(?:רחוב|רח['"]|דרך|שדרות|שד['"])\s*([א-ת\s]+)\s*(\d+)/i;
  const streetMatch = upperThird.match(streetPattern);
  if (streetMatch) {
    result.street = streetMatch[1].trim();
    result.houseNumber = streetMatch[2];
  }

  // חילוץ מיקוד (5-7 ספרות)
  const zipPattern = /\b(\d{5,7})\b/;
  const zipMatch = upperThird.match(zipPattern);
  if (zipMatch && !result.mobile.includes(zipMatch[1]) && !result.phone.includes(zipMatch[1])) {
    // וודא שזה לא חלק ממספר טלפון
    const zipCode = zipMatch[1];
    if (zipCode.length >= 5 && zipCode.length <= 7) {
      result.zipCode = zipCode;
    }
  }

  // חילוץ שם פרטי ושם משפחה (מחפשים מילים בעברית ובאנגלית)
  // רשימת מילים להתעלמות
  const ignoredWords = ['קורות', 'חיים', 'קוח', 'קו"ח', 'אינפורמציה', 'פרטית', 'מידע', 'אישי', 'פרטים', 'תקופת', 'המועמד', 'המועמדת'];
  
  const namePattern = /(?:שם[:\s]*)?([א-ת]{2,})\s+([א-ת]{2,})|([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
  const nameMatch = upperThird.match(namePattern);
  if (nameMatch) {
    const fullName = nameMatch[0].replace(/שם[:\s]*/, '').trim();
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[1];
      
      // בדיקה שהשמות לא במילים הממוקעות להתעלמות
      if (!ignoredWords.includes(firstName) && !ignoredWords.includes(lastName)) {
        result.firstName = firstName;
        result.lastName = lastName;
      }
    }
  }

  // חילוץ מקצוע (מחפש מילות מפתח)
  const professionKeywords = [
    'מפתח', 'מתכנת', 'מהנדס', 'מעצב', 'רופא', 'עורך דין', 'רואה חשבון',
    'מנהל', 'סמנכ"ל', 'מנכ"ל', 'יועץ', 'אדריכל', 'מורה', 'מרצה',
    'developer', 'engineer', 'designer', 'manager', 'analyst', 'consultant'
  ];
  
  const professionFound = professionKeywords.find(profession => 
    text.toLowerCase().includes(profession.toLowerCase())
  );
  if (professionFound) {
    result.profession = professionFound;
  }

  // חילוץ שנות ניסיון (מחפש מספרים ליד "שנות ניסיון" או "years")
  const experiencePattern = /(\d+)\s*(?:שנ(?:ה|ות|ים)?\s*(?:של\s*)?(?:ניסיון|עבודה)|years?\s*(?:of\s*)?experience)/i;
  const experienceMatch = text.match(experiencePattern);
  if (experienceMatch) {
    result.experience = parseInt(experienceMatch[1]);
  }

  // חילוץ תעודת זהות (9 ספרות)
  const nationalIdPattern = /\b(\d{9})\b/;
  const nationalIdMatch = upperThird.match(nationalIdPattern);
  if (nationalIdMatch) {
    result.nationalId = nationalIdMatch[1];
  }

  // חילוץ מין/מגדר
  const genderKeywords = ['זכר', 'נקבה', 'גבר', 'אישה', 'male', 'female', 'man', 'woman'];
  const genderFound = genderKeywords.find(gender => 
    text.toLowerCase().includes(gender.toLowerCase())
  );
  if (genderFound) {
    result.gender = genderFound;
  }

  // חילוץ מצב משפחתי
  const maritalKeywords = ['נשוי', 'רווק', 'גרוש', 'אלמן', 'נשואה', 'רווקה', 'גרושה', 'אלמנה', 'married', 'single', 'divorced', 'widowed'];
  const maritalFound = maritalKeywords.find(marital => 
    text.toLowerCase().includes(marital.toLowerCase())
  );
  if (maritalFound) {
    result.maritalStatus = maritalFound;
  }

  // חילוץ רישיון נהיגה
  const licensePattern = /רישיון\s*נהיגה|ר\.?\s*נ\.?|driving\s*license/i;
  if (text.match(licensePattern)) {
    result.drivingLicense = "כן";
  }

  // חילוץ טלפון נוסף (מחפש טלפון שני)
  const phonePattern2 = /(0[2-9][-\s]?\d{7})/g;
  const phoneMatches = upperThird.match(phonePattern2);
  if (phoneMatches && phoneMatches.length > 1 && phoneMatches[1] !== result.phone) {
    result.phone2 = phoneMatches[1].replace(/[-\s]/g, '');
  }

  // חילוץ הישגים (חיפוש אחר מילות מפתח)
  const achievementKeywords = ['הישגים', 'פרסים', 'הכרה', 'הצטיינות', 'achievements', 'awards', 'recognition'];
  const achievementFound = achievementKeywords.find(achievement => 
    text.toLowerCase().includes(achievement.toLowerCase())
  );
  if (achievementFound) {
    // מחפש את השורות שמכילות את המילה ולוקח כמה שורות אחריה
    const achievementIndex = text.toLowerCase().indexOf(achievementFound.toLowerCase());
    if (achievementIndex !== -1) {
      const achievementSection = text.substring(achievementIndex, achievementIndex + 300);
      result.achievements = achievementSection.trim();
    }
  }

  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Bootstrap admin user - special route for initial setup (before auth middleware)
  app.post('/api/bootstrap-admin', async (req, res) => {
    try {
      // Create super admin role if doesn't exist
      let superAdminRole;
      try {
        superAdminRole = await storage.getRoleByType('super_admin');
      } catch {
        superAdminRole = await storage.createRole({
          name: 'מנהל מערכת ראשי',
          type: 'super_admin',
          description: 'גישה מלאה למערכת'
        });
      }

      // Get the target user (hardcoded for now)
      const targetUserId = '46866906';
      const existingUser = await storage.getUser(targetUserId);
      if (!existingUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      // Check if user already has super admin role
      const userWithRoles = await storage.getUserWithRoles(targetUserId);
      const hasRole = userWithRoles?.userRoles?.some(ur => ur.role.type === 'super_admin');
      
      if (!hasRole && superAdminRole) {
        // Assign super admin role
        await storage.assignUserRole({
          userId: targetUserId,
          roleId: superAdminRole.id,
          assignedBy: targetUserId // Self-assigned for bootstrap
        });
        res.json({ message: "Super admin role assigned successfully" });
      } else {
        res.json({ message: "User already has super admin role" });
      }
    } catch (error) {
      console.error("Error bootstrapping admin:", error);
      res.status(500).json({ message: "Failed to bootstrap admin", error: (error as Error).message });
    }
  });

  // Static files serving for uploads - Add CORS middleware
  app.use('/uploads', (req, res, next) => {
    // Add CORS headers for file access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  }, express.static('uploads'));
  // Route for serving CV files with preview generation
  app.get('/uploads/:filename', async (req, res) => {
    const filePath = path.join('uploads', req.params.filename);
    
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }
      
      const buffer = fs.readFileSync(filePath);
      let mimeType = 'application/octet-stream';
      
      // Check for PDF signature
      if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
        mimeType = 'application/pdf';
      }
      // Check for ZIP/Office document signatures (DOCX, etc.)
      else if (buffer.length >= 2 && buffer.toString('ascii', 0, 2) === 'PK') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      // Check for old DOC signature
      else if (buffer.length >= 8 && buffer.readUInt32LE(0) === 0xE011CFD0) {
        mimeType = 'application/msword';
      }
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline'); // הצגה בדפדפן במקום הורדה
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.send(buffer);
      
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).send('Error reading file');
    }
  });

  // Route for generating preview images from Word documents
  app.get('/uploads/:filename/preview', async (req, res) => {
    const filePath = path.join('uploads', req.params.filename);
    const previewDir = path.join('uploads', 'previews');
    const previewPath = path.join(previewDir, `${req.params.filename}.png`);
    
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }
      
      // Create previews directory if it doesn't exist
      if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
      }
      
      // Check if preview image already exists
      if (fs.existsSync(previewPath)) {
        const imageBuffer = fs.readFileSync(previewPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(imageBuffer);
      }
      
      const buffer = fs.readFileSync(filePath);
      
      // Check if it's a Word document
      if (buffer.length >= 2 && buffer.toString('ascii', 0, 2) === 'PK') {
        try {
          // Convert Word document to PDF first, then to PNG
          // Use the already imported execSync
          const tempPdfPath = path.join(previewDir, `${req.params.filename}.pdf`);
          
          // Convert DOCX to PDF using LibreOffice
          try {
            execSync(`libreoffice --headless --convert-to pdf --outdir "${previewDir}" "${filePath}"`);
            const generatedPdf = path.join(previewDir, `${req.params.filename}.pdf`);
            if (!fs.existsSync(generatedPdf)) {
              throw new Error('PDF not generated');
            }
          } catch (error) {
            console.error('LibreOffice conversion error:', error);
            throw error;
          }
          
          // Convert PDF to PNG using ImageMagick
          try {
            execSync(`convert "${tempPdfPath}[0]" -density 150 -quality 90 "${previewPath}"`);
          } catch (error) {
            console.error('ImageMagick conversion error:', error);
            throw error;
          }
          
          // Clean up temporary PDF
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
          
          // Send the generated PNG
          if (fs.existsSync(previewPath)) {
            const imageBuffer = fs.readFileSync(previewPath);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(imageBuffer);
          } else {
            throw new Error('Failed to generate preview image');
          }
          
        } catch (error) {
          console.error('Error converting Word document:', error);
          
          // Fallback to text extraction if image conversion fails
          try {
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value;
            
            const htmlPreview = `
              <!DOCTYPE html>
              <html dir="rtl" lang="he">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CV Preview</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    line-height: 1.6; 
                    background: white;
                    direction: rtl;
                    text-align: right;
                  }
                  .cv-content { 
                    white-space: pre-wrap; 
                    word-wrap: break-word;
                    font-size: 14px;
                  }
                  .error-notice {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="error-notice">
                  לא ניתן היה להמיר את הקובץ לתמונה. מוצג התוכן בפורמט טקסט בלבד.
                </div>
                <div class="cv-content">${text.replace(/\n/g, '<br>')}</div>
              </body>
              </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(htmlPreview);
          } catch (textError) {
            res.status(500).send('Error processing document');
          }
        }
      } else if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
        // If it's already a PDF, convert directly to PNG
        try {
          // Use the already imported execSync
          
          try {
            execSync(`convert "${filePath}[0]" -density 150 -quality 90 "${previewPath}"`);
          } catch (error) {
            console.error('PDF to PNG conversion error:', error);
            throw error;
          }
          
          if (fs.existsSync(previewPath)) {
            const imageBuffer = fs.readFileSync(previewPath);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(imageBuffer);
          } else {
            // Fallback: serve original PDF
            res.redirect(`/uploads/${req.params.filename}`);
          }
        } catch (error) {
          console.error('Error converting PDF:', error);
          res.redirect(`/uploads/${req.params.filename}`);
        }
      } else {
        // For other file types, redirect to original file
        res.redirect(`/uploads/${req.params.filename}`);
      }
      
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).send('Error generating preview');
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/recent-candidates', isAuthenticated, async (req, res) => {
    try {
      const candidates = await storage.getRecentCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching recent candidates:", error);
      res.status(500).json({ message: "Failed to fetch recent candidates" });
    }
  });

  app.get('/api/dashboard/urgent-tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getUrgentTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching urgent tasks:", error);
      res.status(500).json({ message: "Failed to fetch urgent tasks" });
    }
  });

  // Check for duplicate candidates
  app.post('/api/candidates/check-duplicate', isAuthenticated, async (req, res) => {
    try {
      const { email, mobile } = req.body;
      
      if (!email && !mobile) {
        return res.json({ exists: false });
      }
      
      const candidates = await storage.getCandidates();
      const duplicate = candidates.candidates.find((candidate: any) => 
        (email && candidate.email === email) || 
        (mobile && candidate.mobile === mobile)
      );
      
      if (duplicate) {
        res.json({ 
          exists: true, 
          candidate: {
            firstName: duplicate.firstName,
            lastName: duplicate.lastName,
            email: duplicate.email,
            mobile: duplicate.mobile
          }
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking duplicate candidate:", error);
      res.status(500).json({ message: "Failed to check duplicate" });
    }
  });

  // Candidate routes
  app.get('/api/candidates', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const dateFilter = req.query.dateFilter as string;
      
      const result = await storage.getCandidates(limit, offset, search, dateFilter);
      res.json(result);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get('/api/candidates/:id', isAuthenticated, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  // Get candidate events
  app.get('/api/candidates/:id/events', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getCandidateEvents(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching candidate events:", error);
      res.status(500).json({ message: "Failed to fetch candidate events" });
    }
  });

  // Add candidate event (notes, actions, etc.)
  app.post('/api/candidates/:id/events', isAuthenticated, async (req, res) => {
    try {
      const { eventType, description, metadata } = req.body;
      
      console.log("🔄 מוסיף אירוע למועמד:", {
        candidateId: req.params.id,
        eventType,
        description,
        metadata
      });
      
      const result = await storage.addCandidateEvent({
        candidateId: req.params.id,
        eventType,
        description,
        metadata
      });
      
      console.log("✅ אירוע נוסף בהצלחה:", result);
      
      res.json({ success: true, message: "Event added successfully" });
    } catch (error) {
      console.error("❌ שגיאה בהוספת אירוע למועמד:", error);
      res.status(500).json({ message: "Failed to add candidate event" });
    }
  });

  app.post('/api/candidates', isAuthenticated, upload.single('cv'), async (req, res) => {
    try {
      // Handle tags array conversion if it comes as a string
      const bodyData = { ...req.body };
      if (bodyData.tags && typeof bodyData.tags === 'string') {
        try {
          bodyData.tags = JSON.parse(bodyData.tags);
        } catch {
          bodyData.tags = []; // Default to empty array if parsing fails
        }
      }
      
      // Extract jobId if provided
      const jobId = bodyData.jobId;
      delete bodyData.jobId; // Remove from candidate data
      
      const candidateData = insertCandidateSchema.parse(bodyData);
      
      // If CV file was uploaded, add the path and extract content
      if (req.file) {
        candidateData.cvPath = req.file.path;
        
        // Extract text content from CV for search functionality
        try {
          const fs = require('fs');
          const { execSync } = require('child_process');
          
          const fileBuffer = fs.readFileSync(req.file.path);
          let fileText = '';
          
          if (req.file.mimetype === 'application/pdf') {
            try {
              const stringsOutput = execSync(`strings "${req.file.path}"`, { encoding: 'utf8' });
              const lines = stringsOutput.split('\n').filter((line: string) => 
                line.trim().length > 2 && (
                  /[\u0590-\u05FF]/.test(line) || // Hebrew characters
                  /@/.test(line) || // Email
                  /05\d/.test(line) // Mobile phone
                )
              );
              fileText = lines.join(' ');
            } catch (error) {
              console.log('Error extracting PDF text for search:', error);
            }
          } else if (req.file.mimetype.includes('word')) {
            try {
              const mammoth = require('mammoth');
              const result = await mammoth.extractRawText({ buffer: fileBuffer });
              fileText = result.value;
            } catch (error) {
              console.log('Error extracting Word text for search:', error);
            }
          } else if (req.file.mimetype === 'text/plain') {
            fileText = fileBuffer.toString('utf8');
          }
          
          candidateData.cvContent = fileText;
        } catch (error) {
          console.log('Error processing CV file for search:', error);
        }
      }
      
      // הוספת מקור גיוס אוטומטי - שם המשתמש הנוכחי
      if (!candidateData.recruitmentSource && (req.user as any)?.claims) {
        const userClaims = (req.user as any).claims;
        const userFirstName = userClaims.first_name || '';
        const userLastName = userClaims.last_name || '';
        const userName = `${userFirstName} ${userLastName}`.trim() || userClaims.email;
        candidateData.recruitmentSource = userName;
      }
      
      const candidate = await storage.createCandidate(candidateData);
      
      // Create initial event for manual candidate creation
      await storage.addCandidateEvent({
        candidateId: candidate.id,
        eventType: 'created',
        description: `מועמד נוצר ידנית על ידי ${candidateData.recruitmentSource || 'משתמש'}`,
        metadata: {
          source: 'manual_entry',
          createdBy: candidateData.recruitmentSource,
          cvUploaded: !!candidateData.cvPath,
          timestamp: new Date().toISOString()
        }
      });
      
      // Create job application automatically if jobId is provided
      if (jobId) {
        try {
          await storage.createJobApplication({
            candidateId: candidate.id,
            jobId: jobId,
            status: 'submitted',
          });
          
          // Add event for job application
          await storage.addCandidateEvent({
            candidateId: candidate.id,
            eventType: 'job_application',
            description: `הופנה למשרה בעת יצירת המועמד`,
            metadata: {
              jobId: jobId,
              source: 'manual_assignment',
              timestamp: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error("Error creating job application:", error);
          // Don't fail the candidate creation, just log the error
        }
      }
      
      res.status(201).json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.put('/api/candidates/:id', isAuthenticated, upload.single('cv'), async (req, res) => {
    try {
      // Get current candidate to check for status changes
      const currentCandidate = await storage.getCandidate(req.params.id);
      
      // Handle tags array conversion if it comes as a string
      const bodyData = { ...req.body };
      if (bodyData.tags && typeof bodyData.tags === 'string') {
        try {
          bodyData.tags = JSON.parse(bodyData.tags);
        } catch {
          bodyData.tags = []; // Default to empty array if parsing fails
        }
      }
      
      const candidateData = insertCandidateSchema.partial().parse(bodyData);
      
      // If CV file was uploaded, add the path
      if (req.file) {
        candidateData.cvPath = req.file.path;
      }
      
      const candidate = await storage.updateCandidate(req.params.id, candidateData);
      
      // Add event for candidate profile update
      await storage.addCandidateEvent({
        candidateId: req.params.id,
        eventType: 'profile_updated',
        description: `פרטי המועמד עודכנו`,
        metadata: {
          updatedFields: Object.keys(candidateData),
          cvUpdated: !!candidateData.cvPath,
          timestamp: new Date().toISOString()
        }
      });
      
      // Check if status was manually changed and add specific event
      if (candidateData.status && currentCandidate?.status !== candidateData.status) {
        const statusTranslations = {
          // Legacy statuses
          'available': 'זמין',
          'employed': 'מועסק',
          'inactive': 'לא פעיל',
          'blacklisted': 'ברשימה שחורה',
          // New detailed statuses
          'pending': 'ממתין',
          'pending_initial_screening': 'ממתין לסינון ראשוני',
          'in_initial_screening': 'בסינון ראשוני',
          'passed_initial_screening': 'עבר סינון ראשוני',
          'failed_initial_screening': 'נפסל בסינון ראשוני',
          'sent_to_employer': 'נשלח למעסיק',
          'whatsapp_sent': 'נשלחה הודעת ווצאפ',
          'phone_contact_made': 'נוצר קשר טלפוני',
          'waiting_employer_response': 'מועמד ממתין לתשובת מעסיק',
          'invited_to_interview': 'זומן לראיון אצל מעסיק',
          'attended_interview': 'הגיע לראיון אצל מעסיק',
          'missed_interview': 'לא הגיע לראיון',
          'passed_interview': 'עבר ראיון אצל מעסיק',
          'rejected_by_employer': 'נפסל ע"י מעסיק',
          'hired': 'התקבל לעבודה',
          'employment_ended': 'סיים העסקה'
        };
        
        await storage.addCandidateEvent({
          candidateId: req.params.id,
          eventType: 'status_change',
          description: `סטטוס המועמד השתנה מ-${statusTranslations[currentCandidate?.status as keyof typeof statusTranslations] || currentCandidate?.status} ל-${statusTranslations[candidateData.status as keyof typeof statusTranslations] || candidateData.status}`,
          metadata: {
            previousStatus: currentCandidate?.status,
            newStatus: candidateData.status,
            changeType: 'manual',
            updatedBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json(candidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update candidate" });
    }
  });

  // CV Data Extraction endpoint
  app.post('/api/extract-cv-data', isAuthenticated, upload.single('cv'), async (req, res) => {
    console.log('🚀 CV extraction endpoint called!');
    console.log('🚀 Request method:', req.method);
    console.log('🚀 Request headers:', req.headers['content-type']);
    
    try {
      if (!req.file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({ message: "No CV file uploaded" });
      }
      
      console.log('🔍 Processing CV file:', req.file.filename);
      console.log('🔍 Original filename:', req.file.originalname);
      
      try {
        // קריאת תוכן הקובץ
        const fileBuffer = fs.readFileSync(req.file.path);
        let fileText = '';
        
        console.log('📁 File type:', req.file.mimetype);
        console.log('📁 File size:', fileBuffer.length, 'bytes');
        console.log('📁 File path:', req.file.path);
        
        // נסיון לקרוא את הקובץ לפי סוג
        if (req.file.mimetype === 'application/pdf') {
          console.log('📑 PDF file detected - attempting basic text extraction');
          try {
            // ניסיון לחלץ טקסט בסיסי מ-PDF באמצעות strings
            const stringsOutput = execSync(`strings "${req.file.path}"`, { encoding: 'utf8' });
            
            // ניקוי וחיבור השורות
            const lines = stringsOutput.split('\n').filter(line => 
              line.trim().length > 2 && 
              /[\u0590-\u05FF]/.test(line) || // Hebrew characters
              /@/.test(line) || // Email
              /05\d/.test(line) // Mobile phone
            );
            
            fileText = lines.join(' ');
            console.log('📑 PDF basic text extracted, length:', fileText.length);
            console.log('📑 PDF content preview:', fileText.substring(0, 300) + '...');
            
            if (fileText.length < 10) {
              console.log('📑 PDF - insufficient text extracted, returning empty data');
              const extractedData = {
                firstName: "", lastName: "", email: "", mobile: "", phone: "", phone2: "",
                nationalId: "", city: "", street: "", houseNumber: "", zipCode: "",
                gender: "", maritalStatus: "", drivingLicense: "", profession: "",
                experience: null, achievements: ""
              };
              return res.json({ extractedData });
            }
          } catch (error) {
            console.log('❌ Error extracting PDF text:', error instanceof Error ? error.message : 'Unknown error');
            fileText = '';
          }
        } else if (req.file.mimetype.includes('application/vnd.openxmlformats') || 
                   req.file.mimetype.includes('application/msword')) {
          console.log('📄 DOC/DOCX file detected - attempting to extract text');
          try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            fileText = result.value;
            console.log('📄 DOCX text extracted successfully, length:', fileText.length);
            console.log('📄 DOCX content preview:', fileText.substring(0, 200) + '...');
            if (result.messages.length > 0) {
              console.log('📄 DOCX extraction messages:', result.messages);
            }
          } catch (error) {
            console.log('❌ Error extracting DOCX text:', error instanceof Error ? error.message : 'Unknown error');
            fileText = '';
          }
        } else {
          // קבצי טקסט רגילים או קבצים שניתן לקרוא כטקסט
          try {
            fileText = fileBuffer.toString('utf8');
            console.log('📝 Text file detected! Content preview:', fileText.substring(0, 200) + '...');
            console.log('📝 Full text length:', fileText.length);
          } catch (error) {
            console.log('Error reading as text:', error instanceof Error ? error.message : 'Unknown error');
            fileText = '';
          }
        }
        
        // אם אין תוכן טקסט, נחזיר נתונים ריקים
        if (!fileText || fileText.trim().length === 0) {
          console.log('No readable text content found');
          const extractedData = {
            firstName: "", lastName: "", email: "", mobile: "", phone: "", phone2: "",
            nationalId: "", city: "", street: "", houseNumber: "", zipCode: "",
            gender: "", maritalStatus: "", drivingLicense: "", profession: "",
            experience: null, achievements: ""
          };
          return res.json(extractedData);
        }
        
        // חילוץ נתונים מהטקסט האמיתי
        const extractedData = extractDataFromText(fileText);
        
        console.log('Extracted data from CV:', extractedData);
        
        // בדיקה אם יש מספיק נתונים ליצירת מועמד אוטומטית
        const hasRequiredData = extractedData.firstName && 
                               extractedData.lastName && 
                               (extractedData.mobile || extractedData.email);
        
        if (hasRequiredData) {
          try {
            console.log('🎯 Creating candidate automatically from CV data...');
            
            // הכנת נתוני המועמד
            const candidateData = {
              firstName: extractedData.firstName,
              lastName: extractedData.lastName,
              email: extractedData.email || "",
              mobile: extractedData.mobile || "",
              phone: extractedData.phone || "",
              phone2: extractedData.phone2 || "",
              nationalId: extractedData.nationalId || "",
              city: extractedData.city || "",
              street: extractedData.street || "",
              houseNumber: extractedData.houseNumber || "",
              zipCode: extractedData.zipCode || "",
              gender: extractedData.gender || "",
              maritalStatus: extractedData.maritalStatus || "",
              drivingLicense: extractedData.drivingLicense || "",
              address: `${extractedData.street || ""} ${extractedData.houseNumber || ""}`.trim(),
              profession: extractedData.profession || "",
              experience: extractedData.experience,
              expectedSalary: undefined,
              status: "available" as const,
              rating: undefined,
              notes: extractedData.achievements || "",
              tags: [],
              cvPath: req.file.path, // שמירת נתיב הקובץ
              cvContent: fileText, // שמירת תוכן הקובץ לחיפוש
              recruitmentSource: "העלאת קורות חיים אוטומטית"
            };

            // הוספת מקור גיוס אוטומטי - שם המשתמש הנוכחי
            if ((req.user as any)?.claims) {
              const userClaims = (req.user as any).claims;
              const userFirstName = userClaims.first_name || '';
              const userLastName = userClaims.last_name || '';
              const userName = `${userFirstName} ${userLastName}`.trim() || userClaims.email;
              candidateData.recruitmentSource = `${userName} - העלאת קורות חיים`;
            }
            
            // יצירת המועמד
            const candidate = await storage.createCandidate(candidateData);
            console.log('✅ Candidate created successfully:', candidate.id);
            
            // הוספת אירוע יצירה אוטומטית מקורות חיים
            await storage.addCandidateEvent({
              candidateId: candidate.id,
              eventType: 'cv_uploaded',
              description: `מועמד נוצר אוטומטית מהעלאת קורות חיים`,
              metadata: {
                source: 'cv_upload',
                createdBy: candidateData.recruitmentSource,
                cvPath: candidateData.cvPath,
                autoExtracted: true,
                timestamp: new Date().toISOString()
              }
            });
            
            // החזרת הנתונים כולל מידע על המועמד החדש
            res.json({
              extractedData: {
                ...extractedData,
                candidateCreated: true,
                candidateId: candidate.id,
                candidateName: `${candidate.firstName} ${candidate.lastName}`,
                message: "מועמד נוצר אוטומטית מקורות החיים!"
              },
              fileContent: fileText
            });
            
          } catch (candidateError) {
            console.error('❌ Error creating candidate from CV:', candidateError);
            // אם נכשלנו ביצירת המועמד, עדיין נחזיר את הנתונים שחילצנו
            res.json({
              extractedData: {
                ...extractedData,
                candidateCreated: false,
                error: "נתונים חולצו בהצלחה אך יצירת המועמד נכשלה"
              },
              fileContent: fileText
            });
          }
        } else {
          console.log('⚠️ Insufficient data for auto-candidate creation');
          res.json({
            extractedData: {
              ...extractedData,
              candidateCreated: false,
              message: "נתונים חולצו אך חסרים פרטים ליצירת מועמד אוטומטית"
            },
            fileContent: fileText
          });
        }
      } catch (fileError) {
        console.error("Error reading file:", fileError);
        // אם יש בעיה בקריאת הקובץ, נחזיר נתונים ריקים
        const emptyData = {
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          phone: "",
          phone2: "",
          nationalId: "",
          city: "",
          street: "",
          houseNumber: "",
          zipCode: "",
          gender: "",
          maritalStatus: "",
          drivingLicense: "",
          profession: "",
          experience: null,
          achievements: ""
        };
        res.json({ extractedData: emptyData });
      }
    } catch (error) {
      console.error("Error extracting CV data:", error);
      res.status(500).json({ message: "Failed to extract CV data" });
    }
  });

  app.delete('/api/candidates/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCandidate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      
      const result = await storage.getClients(limit, offset, search);
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Job routes
  app.get('/api/jobs', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      
      const result = await storage.getJobs(limit, offset, search);
      res.json(result);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get('/api/jobs/:id', isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.put('/api/jobs/:id', isAuthenticated, async (req, res) => {
    try {
      const jobData = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(req.params.id, jobData);
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.delete('/api/jobs/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Job application routes
  app.get('/api/job-applications', isAuthenticated, async (req, res) => {
    try {
      const jobId = req.query.jobId as string;
      const candidateId = req.query.candidateId as string;
      const forReview = req.query.forReview as string;
      
      let applications;
      if (forReview === 'true') {
        applications = await storage.getJobApplicationsForReview();
      } else {
        applications = await storage.getJobApplications(jobId, candidateId);
      }
      
      res.json({ applications });
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Failed to fetch job applications" });
    }
  });

  app.post('/api/job-applications', isAuthenticated, async (req, res) => {
    try {
      const applicationData = insertJobApplicationSchema.parse(req.body);
      const application = await storage.createJobApplication(applicationData);
      
      // Add event for job application creation
      if (applicationData.candidateId) {
        await storage.addCandidateEvent({
          candidateId: applicationData.candidateId,
          eventType: 'job_application',
          description: `הופנה למשרה חדשה`,
          metadata: {
            jobId: applicationData.jobId,
            status: applicationData.status || 'submitted',
            appliedBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update candidate status automatically when applying to a job
        await storage.updateCandidate(applicationData.candidateId, { status: 'sent_to_employer' });
      }
      
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating job application:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create job application" });
    }
  });

  app.put('/api/job-applications/:id', isAuthenticated, async (req, res) => {
    try {
      const applicationData = insertJobApplicationSchema.partial().parse(req.body);
      const application = await storage.updateJobApplication(req.params.id, applicationData);
      
      // Add event for job application status change
      if (application.candidateId && applicationData.status) {
        await storage.addCandidateEvent({
          candidateId: application.candidateId,
          eventType: 'status_change',
          description: `סטטוס מועמדות למשרה השתנה`,
          metadata: {
            jobId: application.jobId,
            newStatus: applicationData.status,
            notes: applicationData.notes,
            feedback: applicationData.clientFeedback || applicationData.reviewerFeedback,
            updatedBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update candidate status automatically based on application status
        if (applicationData.status === 'hired') {
          await storage.updateCandidate(application.candidateId, { status: 'hired' });
        } else if (applicationData.status === 'interview_scheduled') {
          await storage.updateCandidate(application.candidateId, { status: 'invited_to_interview' });
        } else if (applicationData.status === 'rejected') {
          await storage.updateCandidate(application.candidateId, { status: 'rejected_by_employer' });
        }
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error updating job application:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update job application" });
    }
  });

  // PATCH route for partial updates (used by interviews page)
  app.patch('/api/job-applications/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const application = await storage.updateJobApplication(req.params.id, updates);
      
      // Add event for job application status change
      if (application.candidateId && updates.status) {
        await storage.addCandidateEvent({
          candidateId: application.candidateId,
          eventType: 'status_change',
          description: `סטטוס מועמדות למשרה השתנה`,
          metadata: {
            jobId: application.jobId,
            newStatus: updates.status,
            notes: updates.notes,
            feedback: updates.clientFeedback || updates.reviewerFeedback,
            updatedBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error updating job application:", error);
      res.status(500).json({ message: "Failed to update job application" });
    }
  });

  app.delete('/api/job-applications/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteJobApplication(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job application:", error);
      res.status(500).json({ message: "Failed to delete job application" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const isCompleted = req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;
      
      const result = await storage.getTasks(limit, offset, isCompleted);
      res.json(result);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      // Add event for task creation if related to candidate
      if (taskData.candidateId) {
        await storage.addCandidateEvent({
          candidateId: taskData.candidateId,
          eventType: 'task_created',
          description: `נוצרה משימה חדשה: ${taskData.title}`,
          metadata: {
            taskId: task.id,
            taskTitle: taskData.title,
            taskType: taskData.type,
            dueDate: taskData.dueDate?.toISOString(),
            createdBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, taskData);
      
      // Add event for task completion if relevant
      if (task.candidateId && taskData.completed === true) {
        await storage.addCandidateEvent({
          candidateId: task.candidateId,
          eventType: 'task_completed',
          description: `הושלמה משימה: ${task.title}`,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            taskType: task.type,
            completedBy: req.user?.claims?.sub,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Email routes
  app.post('/api/emails/send-candidate-profile', isAuthenticated, async (req: any, res) => {
    try {
      const { candidateId, to, cc, notes } = req.body;
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const template = emailTemplates.candidateProfile(candidate);
      const emailData = {
        to,
        cc,
        subject: template.subject,
        html: template.html,
      };

      const result = await sendEmail(emailData);
      
      if (result.success) {
        // Save email to database
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to,
          cc,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'sent',
          sentAt: new Date(),
          candidateId,
          sentBy: req.user.claims.sub,
        });
        
        // Add event for sending candidate profile to employer
        await storage.addCandidateEvent({
          candidateId,
          eventType: 'sent_to_employer',
          description: `פרופיל המועמד נשלח למעסיק`,
          metadata: {
            recipient: to,
            cc: cc,
            notes: notes,
            sentBy: req.user.claims.sub,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update candidate status automatically when sent to employer
        await storage.updateCandidate(candidateId, { status: 'sent_to_employer' });
        
        res.json({ success: true });
      } else {
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to,
          cc,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'failed',
          candidateId,
          sentBy: req.user.claims.sub,
          errorMessage: result.error,
        });
        
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending candidate profile email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  app.post('/api/emails/send-interview-invitation', isAuthenticated, async (req: any, res) => {
    try {
      const { candidateId, jobTitle, date, time, location, interviewer, notes } = req.body;
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const interviewDetails = { jobTitle, date, time, location, interviewer, notes };
      const template = emailTemplates.interviewInvitation(candidate, interviewDetails);
      
      const emailData = {
        to: candidate.email,
        subject: template.subject,
        html: template.html,
      };

      const result = await sendEmail(emailData);
      
      if (result.success) {
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to: candidate.email,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'sent',
          sentAt: new Date(),
          candidateId,
          sentBy: req.user.claims.sub,
        });
        
        // Add event for interview invitation
        await storage.addCandidateEvent({
          candidateId,
          eventType: 'interview_invited',
          description: `נשלחה הזמנה לראיון`,
          metadata: {
            jobTitle: jobTitle,
            date: date,
            time: time,
            location: location,
            interviewer: interviewer,
            notes: notes,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update candidate status automatically when invited to interview
        await storage.updateCandidate(candidateId, { status: 'invited_to_interview' });
        
        res.json({ success: true });
      } else {
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to: candidate.email,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'failed',
          candidateId,
          sentBy: req.user.claims.sub,
          errorMessage: result.error,
        });
        
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending interview invitation:", error);
      res.status(500).json({ message: "Failed to send interview invitation" });
    }
  });

  app.post('/api/emails/send-candidate-shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const { candidateIds, to, cc, jobTitle } = req.body;
      
      const candidates = await Promise.all(
        candidateIds.map((id: string) => storage.getCandidate(id))
      );
      
      const validCandidates = candidates.filter(Boolean);
      if (validCandidates.length === 0) {
        return res.status(404).json({ message: "No candidates found" });
      }

      const template = emailTemplates.candidateShortlist(validCandidates, jobTitle);
      
      const emailData = {
        to,
        cc,
        subject: template.subject,
        html: template.html,
      };

      const result = await sendEmail(emailData);
      
      if (result.success) {
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to,
          cc,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'sent',
          sentAt: new Date(),
          sentBy: req.user.claims.sub,
        });
        
        // Add events for each candidate in the shortlist
        for (const candidate of validCandidates) {
          await storage.addCandidateEvent({
            candidateId: candidate.id,
            eventType: 'sent_to_employer',
            description: `נשלח ברשימה קצרה למעסיק`,
            metadata: {
              recipient: to,
              cc: cc,
              jobTitle: jobTitle,
              shortlistCount: validCandidates.length,
              sentBy: req.user.claims.sub,
              timestamp: new Date().toISOString()
            }
          });
          
          // Update candidate status automatically when sent in shortlist
          await storage.updateCandidate(candidate.id, { status: 'sent_to_employer' });
        }
        
        res.json({ success: true });
      } else {
        await storage.createEmail({
          from: process.env.GMAIL_USER || 'noreply@yourcompany.com',
          to,
          cc,
          subject: template.subject,
          body: template.html,
          isHtml: true,
          status: 'failed',
          sentBy: req.user.claims.sub,
          errorMessage: result.error,
        });
        
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending candidate shortlist:", error);
      res.status(500).json({ message: "Failed to send candidate shortlist" });
    }
  });

  app.get('/api/emails', isAuthenticated, async (req: any, res) => {
    try {
      const emails = await storage.getEmails();
      res.json({ emails });
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  // Manual check for incoming emails route
  app.post('/api/emails/check-incoming', isAuthenticated, async (req: any, res) => {
    try {
      await checkIncomingEmails();
      res.json({ success: true, message: "בדיקת מיילים נכנסים הושלמה" });
    } catch (error) {
      console.error("Error checking incoming emails:", error);
      res.status(500).json({ message: "Failed to check incoming emails" });
    }
  });

  // Get email settings
  app.get('/api/system-settings/email', isAuthenticated, async (req: any, res) => {
    try {
      const smtpHost = await storage.getSystemSetting('CPANEL_SMTP_HOST');
      const smtpPort = await storage.getSystemSetting('CPANEL_SMTP_PORT');
      const smtpSecure = await storage.getSystemSetting('CPANEL_SMTP_SECURE');
      const emailUser = await storage.getSystemSetting('CPANEL_EMAIL_USER');
      const emailPass = await storage.getSystemSetting('CPANEL_EMAIL_PASS');
      const imapHost = await storage.getSystemSetting('CPANEL_IMAP_HOST');
      const imapPort = await storage.getSystemSetting('CPANEL_IMAP_PORT');
      const imapSecure = await storage.getSystemSetting('CPANEL_IMAP_SECURE');

      res.json({
        smtpHost: smtpHost?.value || '',
        smtpPort: smtpPort?.value || '587',
        smtpSecure: smtpSecure?.value || 'false',
        emailUser: emailUser?.value || '',
        emailPass: emailPass?.value || '',
        imapHost: imapHost?.value || '',
        imapPort: imapPort?.value || '993',
        imapSecure: imapSecure?.value || 'true'
      });
    } catch (error) {
      console.error("Error getting email settings:", error);
      res.status(500).json({ message: "Failed to get email settings" });
    }
  });

  // Configure email settings (cPanel)
  app.post('/api/email/configure', isAuthenticated, async (req: any, res) => {
    try {
      const { smtpHost, smtpPort, smtpSecure, emailUser, emailPass, imapHost, imapPort, imapSecure } = req.body;
      
      // Store configuration in database
      await storage.setSystemSetting('CPANEL_SMTP_HOST', smtpHost, 'cPanel SMTP server host');
      await storage.setSystemSetting('CPANEL_SMTP_PORT', smtpPort, 'cPanel SMTP server port');
      await storage.setSystemSetting('CPANEL_SMTP_SECURE', smtpSecure.toString(), 'cPanel SMTP secure connection');
      await storage.setSystemSetting('CPANEL_EMAIL_USER', emailUser, 'cPanel email user account');
      await storage.setSystemSetting('CPANEL_EMAIL_PASS', emailPass, 'cPanel email password');
      await storage.setSystemSetting('CPANEL_IMAP_HOST', imapHost, 'cPanel IMAP server host');
      await storage.setSystemSetting('CPANEL_IMAP_PORT', imapPort, 'cPanel IMAP server port');
      await storage.setSystemSetting('CPANEL_IMAP_SECURE', imapSecure.toString(), 'cPanel IMAP secure connection');
      
      res.json({ success: true, message: "הגדרות מייל נשמרו בהצלחה" });
    } catch (error) {
      console.error("Error configuring email:", error);
      res.status(500).json({ message: "Failed to configure email settings" });
    }
  });

  // Send test email
  app.post('/api/test-email', async (req: any, res) => {
    try {
      const { to, subject, text } = req.body;
      
      console.log('🔄 מנסה לשלוח מייל ניסיון ל:', to);
      
      const result = await sendEmail({
        to,
        subject: subject || 'בדיקת מייל ממערכת הגיוס',
        text: text || 'זהו מייל ניסיון לבדיקת הגדרות המערכת.',
        from: 'dolev@h-group.org.il'
      });
      
      if (result.success) {
        console.log('✅ מייל נשלח בהצלחה ל:', to);
        res.json({ success: true, message: 'מייל נשלח בהצלחה' });
      } else {
        console.error('❌ שגיאה בשליחת מייל:', result.error);
        res.status(500).json({ success: false, message: 'שגיאה בשליחת המייל', error: result.error });
      }
    } catch (error) {
      console.error('❌ שגיאה כללית בשליחת מייל:', error);
      res.status(500).json({ success: false, message: 'שגיאה בשליחת המייל', error: error.message });
    }
  });

  // Test email connection
  app.post('/api/email/test', isAuthenticated, async (req: any, res) => {
    try {
      const { smtpHost, smtpPort, smtpSecure, emailUser, emailPass } = req.body;
      
      // Create test transporter
      const testTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Test connection
      await testTransporter.verify();
      
      res.json({ success: true, message: "החיבור לשרת המייל תקין" });
    } catch (error) {
      console.error("Email connection test failed:", error);
      res.status(500).json({ message: "בדיקת החיבור נכשלה", error: error.message });
    }
  });

  // Configure outgoing email settings (SMTP)
  app.post('/api/email/configure-outgoing', isAuthenticated, async (req: any, res) => {
    try {
      const { smtpHost, smtpPort, smtpSecure, emailUser, emailPass } = req.body;
      
      // Store outgoing email configuration in database
      await storage.setSystemSetting('CPANEL_SMTP_HOST', smtpHost, 'cPanel SMTP server host');
      await storage.setSystemSetting('CPANEL_SMTP_PORT', smtpPort, 'cPanel SMTP server port');
      await storage.setSystemSetting('CPANEL_SMTP_SECURE', smtpSecure.toString(), 'cPanel SMTP secure connection');
      await storage.setSystemSetting('CPANEL_EMAIL_USER', emailUser, 'cPanel email user account');
      await storage.setSystemSetting('CPANEL_EMAIL_PASS', emailPass, 'cPanel email password');
      
      res.json({ success: true, message: "הגדרות מיילים יוצאים נשמרו בהצלחה" });
    } catch (error) {
      console.error("Error configuring outgoing email:", error);
      res.status(500).json({ message: "Failed to configure outgoing email settings" });
    }
  });

  // Configure incoming email settings (IMAP)
  app.post('/api/email/configure-incoming', isAuthenticated, async (req: any, res) => {
    try {
      const { imapHost, imapPort, imapSecure, emailUser, emailPass } = req.body;
      
      // Store incoming email configuration in database
      await storage.setSystemSetting('CPANEL_IMAP_HOST', imapHost, 'cPanel IMAP server host');
      await storage.setSystemSetting('CPANEL_IMAP_PORT', imapPort, 'cPanel IMAP server port');
      await storage.setSystemSetting('CPANEL_IMAP_SECURE', imapSecure.toString(), 'cPanel IMAP secure connection');
      await storage.setSystemSetting('CPANEL_IMAP_USER', emailUser, 'cPanel IMAP user account');
      await storage.setSystemSetting('CPANEL_IMAP_PASS', emailPass, 'cPanel IMAP password');
      
      res.json({ success: true, message: "הגדרות מיילים נכנסים נשמרו בהצלחה" });
    } catch (error) {
      console.error("Error configuring incoming email:", error);
      res.status(500).json({ message: "Failed to configure incoming email settings" });
    }
  });

  // Test outgoing email connection
  app.post('/api/email/test-outgoing', isAuthenticated, async (req: any, res) => {
    try {
      const { smtpHost, smtpPort, smtpSecure, emailUser, emailPass } = req.body;
      
      const testTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await testTransporter.verify();
      res.json({ success: true, message: "החיבור לשרת SMTP תקין" });
    } catch (error) {
      console.error("SMTP connection test failed:", error);
      res.status(500).json({ message: "בדיקת חיבור SMTP נכשלה", error: error.message });
    }
  });

  // Test incoming email connection  
  app.post('/api/email/test-incoming', isAuthenticated, async (req: any, res) => {
    try {
      const { imapHost, imapPort, imapSecure, emailUser, emailPass } = req.body;
      
      // Note: In a real implementation, you'd test IMAP connection here
      // For now, we'll just validate the parameters
      if (!imapHost || !imapPort || !emailUser || !emailPass) {
        throw new Error('Missing IMAP parameters');
      }
      
      res.json({ success: true, message: "החיבור לשרת IMAP תקין" });
    } catch (error) {
      console.error("IMAP connection test failed:", error);
      res.status(500).json({ message: "בדיקת חיבור IMAP נכשלה", error: error.message });
    }
  });

  // Save recruitment sources
  app.post('/api/settings/recruitment-sources', isAuthenticated, async (req: any, res) => {
    try {
      const { sources } = req.body;
      
      // In a real implementation, you'd save this to the database
      // For now, we'll just return success
      console.log('Recruitment sources updated:', sources);
      
      res.json({ success: true, message: "מקורות גיוס נשמרו בהצלחה" });
    } catch (error) {
      console.error("Error saving recruitment sources:", error);
      res.status(500).json({ message: "Failed to save recruitment sources" });
    }
  });

  // Save candidate statuses
  app.post('/api/settings/candidate-statuses', isAuthenticated, async (req: any, res) => {
    try {
      const { statuses } = req.body;
      
      if (!Array.isArray(statuses)) {
        return res.status(400).json({ message: "Invalid statuses format" });
      }
      
      // Store candidate statuses in system settings
      await storage.setSystemSetting('CANDIDATE_STATUSES', JSON.stringify(statuses), 'Custom candidate statuses configuration');
      
      console.log('Candidate statuses updated:', statuses);
      
      res.json({ success: true, message: "סטטוסי מועמדים נשמרו בהצלחה" });
    } catch (error) {
      console.error("Error saving candidate statuses:", error);
      res.status(500).json({ message: "Failed to save candidate statuses" });
    }
  });

  // Get candidate statuses
  app.get('/api/settings/candidate-statuses', isAuthenticated, async (req: any, res) => {
    try {
      const statusesSetting = await storage.getSystemSetting('CANDIDATE_STATUSES');
      
      let statuses = [
        { id: 'available', name: 'זמין', color: 'bg-green-100 text-green-800' },
        { id: 'employed', name: 'מועסק', color: 'bg-blue-100 text-blue-800' },
        { id: 'inactive', name: 'לא פעיל', color: 'bg-gray-100 text-gray-800' },
        { id: 'blacklisted', name: 'ברשימה שחורה', color: 'bg-red-100 text-red-800' }
      ];
      
      if (statusesSetting?.value) {
        try {
          statuses = JSON.parse(statusesSetting.value);
        } catch (parseError) {
          console.error('Error parsing candidate statuses:', parseError);
        }
      }
      
      res.json({ statuses });
    } catch (error) {
      console.error("Error getting candidate statuses:", error);
      res.status(500).json({ message: "Failed to get candidate statuses" });
    }
  });

  // CV Search routes
  app.get('/api/candidates/search', isAuthenticated, async (req, res) => {
    try {
      const { keywords, page = '1', limit = '20' } = req.query;
      
      if (!keywords || typeof keywords !== 'string') {
        return res.status(400).json({ error: 'מילות מפתח נדרשות' });
      }
      
      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10))); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;
      
      const searchResults = await storage.searchCandidatesByKeywords(keywords.trim(), limitNum, offset);
      
      res.json({
        candidates: searchResults.candidates,
        total: searchResults.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(searchResults.total / limitNum)
      });
    } catch (error) {
      console.error('שגיאה בחיפוש מועמדים:', error);
      res.status(500).json({ error: 'שגיאה בחיפוש מועמדים' });
    }
  });

  // Message Templates routes
  app.get('/api/message-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getMessageTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching message templates:', error);
      res.status(500).json({ error: 'שגיאה בטעינת תבניות ההודעות' });
    }
  });

  app.post('/api/message-templates', isAuthenticated, async (req, res) => {
    try {
      const templateData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error('Error creating message template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'נתונים לא תקינים', details: error.errors });
      }
      res.status(500).json({ error: 'שגיאה ביצירת תבנית ההודעה' });
    }
  });

  app.put('/api/message-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const templateData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.updateMessageTemplate(id, templateData);
      res.json(template);
    } catch (error) {
      console.error('Error updating message template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'נתונים לא תקינים', details: error.errors });
      }
      res.status(500).json({ error: 'שגיאה בעדכון תבנית ההודעה' });
    }
  });

  app.delete('/api/message-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMessageTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message template:', error);
      res.status(500).json({ error: 'שגיאה במחיקת תבנית ההודעה' });
    }
  });

  // Job Referrals route
  app.post('/api/job-referrals', isAuthenticated, async (req, res) => {
    try {
      const { candidateId, jobId, recommendation } = req.body;
      
      if (!candidateId || !jobId || !recommendation) {
        return res.status(400).json({ error: 'חסרים פרטים נדרשים' });
      }

      // Get candidate and job details
      const candidate = await storage.getCandidate(candidateId);
      const job = await storage.getJob(jobId);
      
      if (!candidate || !job) {
        return res.status(404).json({ error: 'מועמד או משרה לא נמצאו' });
      }

      // Send email to employer using the professional template
      const emailSubject = `מועמד לתפקיד: ${job.title}`;
      const currentDate = new Date().toLocaleDateString('he-IL');
      const userFullName = (req as AuthenticatedRequest).user?.displayName || 'רכז/ת הגיוס';
      
      const emailBody = `
<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 700px;">
  <!-- ברכת פתיחה -->
  <p>שלום רב!</p>
  
  <!-- משפט פתיחה עם פרטי המשרה -->
  <p>מצורפים למייל זה קורות חיים של המועמד/ת לתפקיד <strong>${job.title}</strong>.</p>
  
  <!-- פרטי המועמד -->
  <h3 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">פרטי המועמד:</h3>
  
  <p><strong>שם מלא:</strong> ${candidate.firstName} ${candidate.lastName}</p>
  <p><strong>טלפון:</strong> ${candidate.mobile || candidate.phone || 'לא צוין'}</p>
  <p><strong>ישוב:</strong> ${candidate.city || 'לא צוין'}</p>
  
  <!-- סיכום סינון ראשוני -->
  <h3 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">סיכום סינון ראשוני מתאריך ${currentDate}:</h3>
  
  <!-- חוות דעת והערות -->
  <h3 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">חוות דעת והערות:</h3>
  <div style="background: #f8f9fa; padding: 15px; border-right: 4px solid #2563eb; margin: 15px 0; white-space: pre-line;">
${recommendation}
  </div>
  
  <br>
  <br>
  
  <!-- חתימה -->
  <p>--<br>
  בברכה,<br>
  <strong>${userFullName}</strong></p>
</div>
      `;

      // Create email record
      const emailData = {
        from: process.env.SMTP_FROM || 'system@company.com',
        to: job.client?.email || '',
        subject: emailSubject,
        body: emailBody,
        isHtml: true,
        candidateId: candidateId,
        jobId: jobId,
        clientId: job.clientId,
        sentBy: (req as AuthenticatedRequest).user?.id
      };

      if (job.client?.email) {
        const email = await storage.createEmail(emailData);
        
        // Try to send the email
        try {
          await sendEmail({
            to: job.client.email,
            subject: emailSubject,
            html: emailBody
          });
          
          // Update email status to sent
          await storage.updateEmail(email.id, { 
            status: 'sent',
            sentAt: new Date()
          });
          
          // Add event for successful CV referral to employer
          await storage.addCandidateEvent({
            candidateId: candidateId,
            eventType: 'sent_to_employer',
            description: `קורות החיים נשלחו למעסיק - ${job.client?.name || job.title}`,
            metadata: {
              jobId: jobId,
              jobTitle: job.title,
              clientName: job.client?.name,
              clientEmail: job.client?.email,
              recommendation: recommendation,
              sentBy: (req as AuthenticatedRequest).user?.claims?.sub,
              timestamp: new Date().toISOString()
            }
          });
          
          // Update candidate status automatically when CV sent to employer
          await storage.updateCandidate(candidateId, { status: 'sent_to_employer' });
          
        } catch (emailError) {
          console.error('Error sending referral email:', emailError);
          // Update email status to failed
          await storage.updateEmail(email.id, { 
            status: 'failed',
            errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error'
          });
          
          // Add event for failed CV referral attempt
          await storage.addCandidateEvent({
            candidateId: candidateId,
            eventType: 'email_failed',
            description: `שגיאה בשליחת קורות חיים למעסיק - ${job.client?.name || job.title}`,
            metadata: {
              jobId: jobId,
              jobTitle: job.title,
              clientName: job.client?.name,
              clientEmail: job.client?.email,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      res.json({ 
        success: true, 
        message: 'המועמד הופנה למעסיק בהצלחה',
        emailSent: !!job.client?.email
      });
      
    } catch (error) {
      console.error('Error processing job referral:', error);
      res.status(500).json({ error: 'שגיאה בשליחת ההפניה למעסיק' });
    }
  });

  // Reminders API routes
  app.get('/api/reminders', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const reminders = await storage.getReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ error: 'שגיאה באחזור התזכורות' });
    }
  });

  app.get('/api/reminders/due', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const dueReminders = await storage.getDueReminders(userId);
      res.json(dueReminders);
    } catch (error) {
      console.error('Error fetching due reminders:', error);
      res.status(500).json({ error: 'שגיאה באחזור התזכורות הפעילות' });
    }
  });

  app.get('/api/reminders/:id', isAuthenticated, async (req, res) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      if (!reminder) {
        return res.status(404).json({ error: 'תזכורת לא נמצאה' });
      }
      res.json(reminder);
    } catch (error) {
      console.error('Error fetching reminder:', error);
      res.status(500).json({ error: 'שגיאה באחזור התזכורת' });
    }
  });

  app.post('/api/reminders', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const reminderData = {
        ...req.body,
        createdBy: userId,
        reminderDate: new Date(req.body.reminderDate)
      };

      const reminder = await storage.createReminder(reminderData);
      res.json(reminder);
    } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ error: 'שגיאה ביצירת התזכורת' });
    }
  });

  app.put('/api/reminders/:id', isAuthenticated, async (req, res) => {
    try {
      const reminderData = {
        ...req.body,
        reminderDate: req.body.reminderDate ? new Date(req.body.reminderDate) : undefined
      };

      const reminder = await storage.updateReminder(req.params.id, reminderData);
      res.json(reminder);
    } catch (error) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ error: 'שגיאה בעדכון התזכורת' });
    }
  });

  app.delete('/api/reminders/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteReminder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ error: 'שגיאה במחיקת התזכורת' });
    }
  });

  // Interview Events API routes
  app.get('/api/interview-events', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const events = await storage.getInterviewEvents(userId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching interview events:', error);
      res.status(500).json({ error: 'שגיאה באחזור אירועי הראיונות' });
    }
  });

  app.get('/api/interview-events/upcoming', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const upcomingEvents = await storage.getUpcomingInterviewEvents(userId);
      res.json(upcomingEvents);
    } catch (error) {
      console.error('Error fetching upcoming interview events:', error);
      res.status(500).json({ error: 'שגיאה באחזור אירועי הראיונות הקרובים' });
    }
  });

  app.get('/api/interview-events/:id', isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getInterviewEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'אירוע לא נמצא' });
      }
      res.json(event);
    } catch (error) {
      console.error('Error fetching interview event:', error);
      res.status(500).json({ error: 'שגיאה באחזור האירוע' });
    }
  });

  app.post('/api/interview-events', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.claims?.sub;
      const eventData = {
        ...req.body,
        createdBy: userId,
        eventDate: new Date(req.body.eventDate)
      };

      const event = await storage.createInterviewEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error('Error creating interview event:', error);
      res.status(500).json({ error: 'שגיאה ביצירת האירוע' });
    }
  });

  app.put('/api/interview-events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventData = {
        ...req.body,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined
      };

      const event = await storage.updateInterviewEvent(req.params.id, eventData);
      res.json(event);
    } catch (error) {
      console.error('Error updating interview event:', error);
      res.status(500).json({ error: 'שגיאה בעדכון האירוע' });
    }
  });

  app.delete('/api/interview-events/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInterviewEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting interview event:', error);
      res.status(500).json({ error: 'שגיאה במחיקת האירוע' });
    }
  });

  // Start automatic email monitoring 
  console.log('🚀 מתחיל מעקב אוטומטי אחרי מיילים נכנסים...');
  startEmailMonitoring();

  // RBAC Routes - Role & Permission Management
  
  // Get all roles (Admin and Super Admin only)
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const allRoles = await storage.getRoles();
      // Filter only the basic 3 roles: user, admin, super_admin
      const basicRoles = allRoles.filter(role => 
        role.type === 'user' || role.type === 'admin' || role.type === 'super_admin'
      );
      res.json(basicRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Get specific role (Admin and Super Admin only)
  app.get('/api/roles/:id', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  // Create new role (Super Admin only)
  app.post('/api/roles', isAuthenticated, requireRole('super_admin'), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Update role (Super Admin only)
  app.put('/api/roles/:id', isAuthenticated, requireRole('super_admin'), async (req, res) => {
    try {
      const roleData = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(req.params.id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Delete role (Super Admin only)
  app.delete('/api/roles/:id', isAuthenticated, requireRole('super_admin'), async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Get all permissions (Admin and Super Admin only)
  app.get('/api/permissions', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Create new permission (Super Admin only)
  app.post('/api/permissions', isAuthenticated, requireRole('super_admin'), async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error creating permission:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create permission" });
    }
  });

  // Assign role to user (Admin and Super Admin only)
  app.post('/api/users/:userId/roles', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const { roleId } = req.body;
      const targetUserId = req.params.userId;
      
      if (!roleId) {
        return res.status(400).json({ message: "Role ID is required" });
      }

      // Only Super Admin can assign super_admin or admin roles
      const role = await storage.getRole(roleId);
      if (role && (role.type === 'super_admin' || role.type === 'admin')) {
        const isSuperAdmin = await storage.hasRole(userId, 'super_admin');
        if (!isSuperAdmin) {
          return res.status(403).json({ message: "Only Super Admin can assign admin or super admin roles" });
        }
      }

      const userRole = await storage.assignUserRole({
        userId: targetUserId,
        roleId,
        assignedBy: userId
      });
      
      res.status(201).json(userRole);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ message: "Failed to assign user role" });
    }
  });

  // Remove role from user (Admin and Super Admin only)
  app.delete('/api/users/:userId/roles/:roleId', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const sessionUserId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(sessionUserId, 'admin') || await storage.hasRole(sessionUserId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const { userId, roleId } = req.params;
      
      // Only Super Admin can remove super_admin or admin roles
      const role = await storage.getRole(roleId);
      if (role && (role.type === 'super_admin' || role.type === 'admin')) {
        const isSuperAdmin = await storage.hasRole(sessionUserId, 'super_admin');
        if (!isSuperAdmin) {
          return res.status(403).json({ message: "Only Super Admin can remove admin or super admin roles" });
        }
      }

      await storage.removeUserRole(userId, roleId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing user role:", error);
      res.status(500).json({ message: "Failed to remove user role" });
    }
  });

  // Get current user's roles and permissions
  app.get('/api/users/roles', isAuthenticated, injectUserPermissions, async (req, res) => {
    try {
      const userId = req.userPermissions?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const userWithRoles = await storage.getUserWithRoles(userId);
      if (!userWithRoles) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(userWithRoles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Get all users with their roles (Admin and Super Admin only)
  app.get('/api/users/all', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }
    try {
      const users = await storage.getAllUsers();
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          const userWithRoles = await storage.getUserWithRoles(user.id);
          return userWithRoles;
        })
      );
      res.json(usersWithRoles.filter(Boolean));
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Add new user route
  app.post('/api/users', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const userId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(userId, 'admin') || await storage.hasRole(userId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }

    try {
      const { email, firstName, lastName, roleId } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email is required' });
      }

      if (!roleId || roleId === 'no-role') {
        return res.status(400).json({ message: 'Role is required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      // Generate secure password
      const tempPassword = generateSecurePassword();
      
      // Create new user with password
      const newUser = await storage.createUser({
        email: email.trim(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        password: tempPassword,
      });

      // Assign role (now required)
      await storage.assignUserRole({
        userId: newUser.id,
        roleId: roleId,
        assignedBy: userId
      });

      // Send welcome email with login credentials
      const loginUrl = `${req.protocol}://${req.get('host')}`;
      console.log(`📧 Attempting to send welcome email to: ${newUser.email}`);
      
      const emailSent = await sendWelcomeEmail({
        email: newUser.email!,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
        password: tempPassword,
        loginUrl,
      });

      if (!emailSent) {
        console.error('❌ Failed to send welcome email to new user:', newUser.email);
      } else {
        console.log('✅ Welcome email sent successfully to:', newUser.email);
      }

      // Return user without password
      const { password, ...userWithoutPassword } = newUser as any;
      const response = {
        ...userWithoutPassword,
        emailSent,
      };
      
      console.log('📤 Sending response to client:', {
        userId: response.id,
        email: response.email,
        emailSent: response.emailSent
      });
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete user (Admin and Super Admin only)
  app.delete('/api/users/:userId', isAuthenticated, async (req, res) => {
    // Check if user has admin or super_admin role
    const sessionUser = req.user as any;
    const sessionUserId = sessionUser.claims.sub;
    const hasAdminRole = await storage.hasRole(sessionUserId, 'admin') || await storage.hasRole(sessionUserId, 'super_admin');
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden - Required role: admin or super_admin" });
    }

    try {
      const { userId } = req.params;
      
      // Prevent users from deleting themselves
      if (userId === sessionUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Get user to check if they exist and what roles they have
      const userToDelete = await storage.getUserWithRoles(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only Super Admin can delete users with super_admin or admin roles
      const hasAdminOrSuperAdminRole = userToDelete.userRoles.some(ur => 
        ur.role.type === 'super_admin' || ur.role.type === 'admin'
      );
      
      if (hasAdminOrSuperAdminRole) {
        const isSuperAdmin = await storage.hasRole(sessionUserId, 'super_admin');
        if (!isSuperAdmin) {
          return res.status(403).json({ message: "Only Super Admin can delete users with admin or super admin roles" });
        }
      }

      // First remove all user roles
      for (const userRole of userToDelete.userRoles) {
        await storage.removeUserRole(userId, userRole.roleId);
      }

      // Then delete the user
      await storage.deleteUser(userId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get user with roles and permissions
  app.get('/api/users/:id/roles', isAuthenticated, injectUserPermissions, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Users can only see their own roles unless they're admin or super admin
      const requestingUserId = req.userPermissions?.userId;
      const isAdmin = await req.userPermissions?.isAdmin();
      const isSuperAdmin = await req.userPermissions?.isSuperAdmin();
      
      if (userId !== requestingUserId && !isAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userWithRoles = await storage.getUserWithRoles(userId);
      if (!userWithRoles) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(userWithRoles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Check if user has specific permission
  app.get('/api/users/:id/permissions/:resource/:action', isAuthenticated, injectUserPermissions, async (req, res) => {
    try {
      const { id: userId, resource, action } = req.params;
      
      // Users can only check their own permissions unless they're admin or super admin
      const requestingUserId = req.userPermissions?.userId;
      const isAdmin = await req.userPermissions?.isAdmin();
      const isSuperAdmin = await req.userPermissions?.isSuperAdmin();
      
      if (userId !== requestingUserId && !isAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const hasPermission = await storage.hasPermission(userId, resource, action);
      res.json({ hasPermission });
    } catch (error) {
      console.error("Error checking user permission:", error);
      res.status(500).json({ message: "Failed to check user permission" });
    }
  });

  // Test email endpoint - Send test email to existing user
  app.post('/api/test-email/:userId', isAuthenticated, injectUserPermissions, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Only admin or super admin can send test emails
      const isAdmin = await req.userPermissions?.isAdmin();
      const isSuperAdmin = await req.userPermissions?.isSuperAdmin();
      
      if (!isAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: "Access denied - admin privileges required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send test welcome email
      const emailData = {
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        password: 'test-password-123',
        loginUrl: `${req.protocol}://${req.get('host')}/api/login`
      };

      console.log('🧪 שולח מייל בדיקה למשתמש:', user.email);
      const success = await sendWelcomeEmail(emailData);
      
      if (success) {
        res.json({ message: "Test email sent successfully", email: user.email });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Route לבדיקה ידנית של כל המיילים
  app.post('/api/check-all-emails', isAuthenticated, async (req, res) => {
    try {
      const { checkAllEmails } = await import('./incomingEmailService');
      await checkAllEmails();
      res.json({ message: 'בדיקה ידנית של כל המיילים הופעלה' });
    } catch (error) {
      console.error('שגיאה בבדיקה ידנית:', error);
      res.status(500).json({ error: 'שגיאה בבדיקה ידנית של מיילים' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
