import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCandidateSchema, insertClientSchema, insertJobSchema, insertJobApplicationSchema, insertTaskSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed'));
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
  const namePattern = /(?:שם[:\s]*)?([א-ת]{2,})\s+([א-ת]{2,})|([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
  const nameMatch = upperThird.match(namePattern);
  if (nameMatch) {
    const fullName = nameMatch[0].replace(/שם[:\s]*/, '').trim();
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length >= 2) {
      result.firstName = nameParts[0];
      result.lastName = nameParts[1];
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
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Candidate routes
  app.get('/api/candidates', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      
      const result = await storage.getCandidates(limit, offset, search);
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
      
      const candidateData = insertCandidateSchema.parse(bodyData);
      
      // If CV file was uploaded, add the path
      if (req.file) {
        candidateData.cvPath = req.file.path;
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
    try {
      if (!req.file) {
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
          console.log('PDF file detected - תדרש ספרייה מיוחדת לחילוץ טקסט');
          // חזרה לנתונים ריקים עבור PDF עד שנתקין ספרייה מתאימה
          const extractedData = {
            firstName: "", lastName: "", email: "", mobile: "", phone: "", phone2: "",
            nationalId: "", city: "", street: "", houseNumber: "", zipCode: "",
            gender: "", maritalStatus: "", drivingLicense: "", profession: "",
            experience: null, achievements: ""
          };
          console.log('PDF - returning empty data for manual fill');
          return res.json(extractedData);
        } else if (req.file.mimetype.includes('application/vnd.openxmlformats') || 
                   req.file.mimetype.includes('application/msword')) {
          console.log('DOC/DOCX file detected - תדרש ספרייה מיוחדת לחילוץ טקסט');
          // חזרה לנתונים ריקים עבור DOC/DOCX עד שנתקין ספרייה מתאימה
          const extractedData = {
            firstName: "", lastName: "", email: "", mobile: "", phone: "", phone2: "",
            nationalId: "", city: "", street: "", houseNumber: "", zipCode: "",
            gender: "", maritalStatus: "", drivingLicense: "", profession: "",
            experience: null, achievements: ""
          };
          console.log('DOC/DOCX - returning empty data for manual fill');
          return res.json(extractedData);
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
        res.json(extractedData);
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
        res.json(emptyData);
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
      
      const applications = await storage.getJobApplications(jobId, candidateId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Failed to fetch job applications" });
    }
  });

  app.post('/api/job-applications', isAuthenticated, async (req, res) => {
    try {
      const applicationData = insertJobApplicationSchema.parse(req.body);
      const application = await storage.createJobApplication(applicationData);
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
      res.json(application);
    } catch (error) {
      console.error("Error updating job application:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
