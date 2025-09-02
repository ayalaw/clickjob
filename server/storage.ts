import {
  users,
  candidates,
  clients,
  jobs,
  jobApplications,
  tasks,
  emails,
  candidateEvents,
  messageTemplates,
  systemSettings,
  reminders,
  interviewEvents,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  type User,
  type UpsertUser,
  type UserWithRoles,
  type Candidate,
  type InsertCandidate,
  type Client,
  type InsertClient,
  type Job,
  type JobWithClient,
  type InsertJob,
  type JobApplication,
  type JobApplicationWithDetails,
  type InsertJobApplication,
  type Task,
  type TaskWithDetails,
  type InsertTask,
  type Email,
  type InsertEmail,
  type CandidateEvent,
  type InsertCandidateEvent,
  type MessageTemplate,
  type InsertMessageTemplate,
  type SystemSetting,
  type InsertSystemSetting,
  type Reminder,
  type ReminderWithDetails,
  type InsertReminder,
  type InterviewEvent,
  type InterviewEventWithDetails,
  type InsertInterviewEvent,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type UserRole,
  type InsertUserRole,
  type RolePermission,
  type InsertRolePermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, ilike, sql, count, or, isNotNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { execSync } from 'child_process';

// CV Search types
export interface SearchResult {
  candidateId: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  email: string;
  matchedKeywords: string[];
  cvPreview: string;
  extractedAt: Date;
}

// פונקציה לחילוץ טקסט מקובץ קורות חיים (PDF/DOCX)
async function extractTextFromCVFile(cvPath: string): Promise<string> {
  try {
    // נתיב מלא לקובץ
    const fullPath = cvPath.startsWith('uploads/') ? cvPath : path.join('uploads', cvPath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`📄 קובץ לא קיים: ${fullPath}`);
      return '';
    }

    const fileBuffer = fs.readFileSync(fullPath);
    
    // זיהוי סוג הקובץ לפי ההמצאות
    const isPDF = fileBuffer.length >= 4 && fileBuffer.toString('ascii', 0, 4) === '%PDF';
    const isDOCX = fileBuffer.length >= 2 && fileBuffer.toString('ascii', 0, 2) === 'PK';
    
    if (isDOCX) {
      console.log(`📄 מחלץ טקסט מ-DOCX: ${cvPath}`);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value || '';
    } else if (isPDF) {
      console.log(`📄 מחלץ טקסט מ-PDF: ${cvPath}`);
      const tempFilePath = `/tmp/${Date.now()}.pdf`;
      const textFilePath = `/tmp/${Date.now()}.txt`;
      
      try {
        // כתיבת הקובץ למקום זמני
        fs.writeFileSync(tempFilePath, fileBuffer);
        
        // חילוץ טקסט בעזרת pdftotext
        try {
          execSync(`pdftotext "${tempFilePath}" "${textFilePath}"`);
          const extractedText = fs.readFileSync(textFilePath, 'utf8');
          
          // ניקוי קבצים זמניים
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          if (fs.existsSync(textFilePath)) fs.unlinkSync(textFilePath);
          
          return extractedText || '';
        } catch (pdfError) {
          console.log('📑 pdftotext לא זמין, מנסה עם strings');
          const stringsOutput = execSync(`strings "${tempFilePath}"`).toString('utf8');
          
          // ניקוי קבצים זמניים
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          
          return stringsOutput || '';
        }
      } catch (error) {
        console.error('שגיאה בחילוץ PDF:', error);
        return '';
      }
    }
    
    return '';
  } catch (error) {
    console.error(`שגיאה בחילוץ טקסט מקובץ ${cvPath}:`, error);
    return '';
  }
}

// פונקציה לבדיקה אם מילת מפתח נמצאת בטקסט
function textContainsKeyword(text: string | null | undefined, keyword: string): boolean {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; firstName?: string | null; lastName?: string | null; password?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Candidate operations
  getCandidates(limit?: number, offset?: number, search?: string, dateFilter?: string): Promise<{ candidates: Candidate[]; total: number }>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;
  findCandidateByMobileOrId(mobile?: string, nationalId?: string): Promise<Candidate | undefined>;
  findCandidateByContactInfo(mobile?: string, email?: string, nationalId?: string): Promise<Candidate | undefined>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  addCandidateEvent(event: InsertCandidateEvent): Promise<CandidateEvent>;
  getCandidateEvents(candidateId: string): Promise<CandidateEvent[]>;
  
  // CV Search operations
  searchCVs(filters: { positiveKeywords: string[]; negativeKeywords: string[] }): Promise<SearchResult[]>;

  // Reminder operations
  getReminders(userId?: string): Promise<ReminderWithDetails[]>;
  getReminder(id: string): Promise<ReminderWithDetails | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  getDueReminders(userId?: string): Promise<ReminderWithDetails[]>;

  // Interview Event operations
  getInterviewEvents(userId?: string): Promise<InterviewEventWithDetails[]>;
  getInterviewEvent(id: string): Promise<InterviewEventWithDetails | undefined>;
  createInterviewEvent(event: InsertInterviewEvent): Promise<InterviewEvent>;

  // Role & Permission operations for RBAC
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getRoleByType(type: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  
  getPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  deletePermission(id: string): Promise<void>;
  
  // User role assignments
  getUserWithRoles(id: string): Promise<UserWithRoles | undefined>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  removeUserRole(userId: string, roleId: string): Promise<void>;
  getUserRoles(userId: string): Promise<UserRole[]>;
  
  // Role permission assignments
  assignRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(roleId: string, permissionId: string): Promise<void>;
  getRolePermissions(roleId: string): Promise<RolePermission[]>;
  
  // Permission checking
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  hasRole(userId: string, roleType: string): Promise<boolean>;
  updateInterviewEvent(id: string, event: Partial<InsertInterviewEvent>): Promise<InterviewEvent>;
  deleteInterviewEvent(id: string): Promise<void>;
  getUpcomingInterviewEvents(userId?: string): Promise<InterviewEventWithDetails[]>;

  // Client operations
  getClients(limit?: number, offset?: number, search?: string): Promise<{ clients: Client[]; total: number }>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Job operations
  getJobs(limit?: number, offset?: number, search?: string): Promise<{ jobs: JobWithClient[]; total: number }>;
  getJob(id: string): Promise<JobWithClient | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: string): Promise<void>;

  // Job application operations
  getJobApplications(jobId?: string, candidateId?: string): Promise<JobApplicationWithDetails[]>;
  getJobApplicationsForReview(): Promise<JobApplicationWithDetails[]>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplication(id: string, application: Partial<InsertJobApplication>): Promise<JobApplication>;
  deleteJobApplication(id: string): Promise<void>;

  // Task operations
  getTasks(limit?: number, offset?: number, isCompleted?: boolean): Promise<{ tasks: TaskWithDetails[]; total: number }>;
  getTask(id: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    activeJobs: number;
    newCandidates: number;
    placements: number;
    revenue: number;
  }>;

  // Recent activity
  getRecentCandidates(limit?: number): Promise<Candidate[]>;
  getUrgentTasks(limit?: number): Promise<TaskWithDetails[]>;

  // Email operations
  getEmails(): Promise<Email[]>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, email: Partial<InsertEmail>): Promise<Email>;

  // CV Search operations
  searchCandidatesByKeywords(keywords: string, limit?: number, offset?: number): Promise<{ candidates: Candidate[]; total: number }>;

  // Message Template operations
  getMessageTemplates(): Promise<MessageTemplate[]>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(id: string, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate>;
  deleteMessageTemplate(id: string): Promise<void>;

  // System Settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  deleteSystemSetting(key: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by email
    if (userData.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        // Update existing user
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updatedUser;
      }
    }

    // Create new user if not found
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; firstName?: string | null; lastName?: string | null; password?: string }): Promise<User> {
    const userData_with_password = {
      email: userData.email,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      password: userData.password ? await bcrypt.hash(userData.password, 10) : null,
    };
    
    const [user] = await db
      .insert(users)
      .values(userData_with_password)
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Candidate operations
  async getCandidates(limit = 50, offset = 0, search?: string, dateFilter?: string): Promise<{ candidates: Candidate[]; total: number }> {
    let conditions = [];
    
    if (search) {
      conditions.push(sql`${candidates.firstName} || ' ' || ${candidates.lastName} ILIKE ${`%${search}%`} OR ${candidates.email} ILIKE ${`%${search}%`} OR ${candidates.profession} ILIKE ${`%${search}%`}`);
    }
    
    if (dateFilter && dateFilter !== 'all') {
      switch (dateFilter) {
        case 'today':
          conditions.push(sql`DATE(${candidates.createdAt}) = CURRENT_DATE`);
          break;
        case 'yesterday':
          conditions.push(sql`DATE(${candidates.createdAt}) = CURRENT_DATE - INTERVAL '1 day'`);
          break;
        case 'this_week':
          conditions.push(sql`${candidates.createdAt} >= CURRENT_DATE - INTERVAL '7 days'`);
          break;
        case 'this_month':
          conditions.push(sql`EXTRACT(MONTH FROM ${candidates.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ${candidates.createdAt}) = EXTRACT(YEAR FROM CURRENT_DATE)`);
          break;
      }
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const candidateResults = await db
      .select()
      .from(candidates)
      .where(whereCondition)
      .orderBy(desc(candidates.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResults = await db
      .select({ count: count() })
      .from(candidates)
      .where(whereCondition);

    return {
      candidates: candidateResults,
      total: totalResults[0].count
    };
  }

  async getCandidatesEnriched(limit = 50, offset = 0, search?: string, dateFilter?: string): Promise<{ candidates: any[]; total: number }> {
    // Get basic candidates data
    const { candidates: basicCandidates, total } = await this.getCandidates(limit, offset, search, dateFilter);
    
    // Enrich each candidate with additional computed data
    const enrichedCandidates = await Promise.all(
      basicCandidates.map(async (candidate) => {
        // Get latest job application
        const latestJobApp = await db
          .select({
            jobTitle: jobs.title,
            appliedAt: jobApplications.appliedAt,
            status: jobApplications.status
          })
          .from(jobApplications)
          .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
          .where(eq(jobApplications.candidateId, candidate.id))
          .orderBy(desc(jobApplications.appliedAt))
          .limit(1);

        // Get latest status change event
        const latestStatusEvent = await db
          .select({
            eventType: candidateEvents.eventType,
            description: candidateEvents.description,
            createdAt: candidateEvents.createdAt
          })
          .from(candidateEvents)
          .where(
            and(
              eq(candidateEvents.candidateId, candidate.id),
              eq(candidateEvents.eventType, 'status_change')
            )
          )
          .orderBy(desc(candidateEvents.createdAt))
          .limit(1);

        // Get latest referral event
        const latestReferralEvent = await db
          .select({
            description: candidateEvents.description,
            createdAt: candidateEvents.createdAt
          })
          .from(candidateEvents)
          .where(
            and(
              eq(candidateEvents.candidateId, candidate.id),
              or(
                eq(candidateEvents.eventType, 'email_sent'),
                eq(candidateEvents.eventType, 'cv_sent'),
                eq(candidateEvents.eventType, 'job_application')
              )
            )
          )
          .orderBy(desc(candidateEvents.createdAt))
          .limit(1);

        return {
          ...candidate,
          lastJobTitle: latestJobApp[0]?.jobTitle || null,
          lastAppliedAt: latestJobApp[0]?.appliedAt || null,
          recruitmentSource: candidate.recruitmentSource || null,
          lastReferralDate: latestReferralEvent[0]?.createdAt || null,
          lastStatusChange: latestStatusEvent[0]?.createdAt || null,
          lastStatusDescription: latestStatusEvent[0]?.description || null
        };
      })
    );

    return {
      candidates: enrichedCandidates,
      total
    };
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    // Get the next candidate number
    const lastCandidate = await db
      .select({ candidateNumber: candidates.candidateNumber })
      .from(candidates)
      .where(isNotNull(candidates.candidateNumber))
      .orderBy(desc(candidates.candidateNumber))
      .limit(1);
    
    const nextNumber = lastCandidate.length > 0 ? (lastCandidate[0].candidateNumber || 99) + 1 : 100;
    
    const candidateWithNumber = {
      ...candidate,
      candidateNumber: nextNumber
    };
    
    const [newCandidate] = await db.insert(candidates).values(candidateWithNumber).returning();
    return newCandidate;
  }

  async findCandidateByMobileOrId(mobile?: string, nationalId?: string): Promise<Candidate | undefined> {
    if (!mobile && !nationalId) return undefined;
    
    let whereCondition;
    if (mobile && nationalId) {
      whereCondition = sql`${eq(candidates.mobile, mobile)} OR ${eq(candidates.nationalId, nationalId)}`;
    } else if (mobile) {
      whereCondition = eq(candidates.mobile, mobile);
    } else if (nationalId) {
      whereCondition = eq(candidates.nationalId, nationalId);
    }
    
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(whereCondition);
    
    return candidate;
  }

  // פונקציה לנירמול מספרי טלפון (זהה לזו שבroutes.ts)
  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[-\s()]/g, '');
    
    // טיפול בקידומת +972
    if (normalized.startsWith('+972')) {
      normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('972')) {
      normalized = '0' + normalized.substring(3);
    }
    
    // וידוא שהמספר מתחיל ב-0 ויש לו 10 ספרות
    if (normalized.length === 9 && !normalized.startsWith('0')) {
      normalized = '0' + normalized;
    }
    
    return normalized;
  }

  async findCandidateByContactInfo(mobile?: string, email?: string, nationalId?: string): Promise<Candidate | undefined> {
    if (!mobile && !email && !nationalId) return undefined;
    
    const conditions = [];
    
    // טלפון נייד - נירמול ובדיקה
    if (mobile) {
      const normalizedMobile = this.normalizePhone(mobile);
      conditions.push(sql`REPLACE(REPLACE(REPLACE(${candidates.mobile}, '-', ''), ' ', ''), '+972', '0') = ${normalizedMobile}`);
    }
    
    // אימייל - בדיקה מדויקת (case insensitive)
    if (email && email !== '' && !email.includes('temp.local')) {
      conditions.push(sql`LOWER(${candidates.email}) = LOWER(${email})`);
    }
    
    // ת.ז - בדיקה מדויקת
    if (nationalId) {
      conditions.push(eq(candidates.nationalId, nationalId));
    }
    
    if (conditions.length === 0) return undefined;
    
    const whereCondition = conditions.reduce((acc, condition) => 
      acc ? sql`${acc} OR ${condition}` : condition
    );
    
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(whereCondition);
    
    return candidate;
  }

  async addCandidateEvent(event: InsertCandidateEvent): Promise<CandidateEvent> {
    const [newEvent] = await db.insert(candidateEvents).values(event).returning();
    return newEvent;
  }

  async getCandidateEvents(candidateId: string): Promise<CandidateEvent[]> {
    return await db
      .select()
      .from(candidateEvents)
      .where(eq(candidateEvents.candidateId, candidateId))
      .orderBy(desc(candidateEvents.createdAt));
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async searchCVs(filters: { positiveKeywords: string[]; negativeKeywords: string[]; includeNotes?: boolean }): Promise<SearchResult[]> {
    try {
      const { positiveKeywords = [], negativeKeywords = [], includeNotes = false } = filters;

      console.log(`🔍 מחפש עם מילות מפתח: חיוביות [${positiveKeywords.join(', ')}], שליליות [${negativeKeywords.join(', ')}]${includeNotes ? ', כולל הערות' : ''}`);

      // שלב 1: קח את כל המועמדים (כולל הערות אם נדרש)
      const allCandidates = await db
        .select({
          candidateId: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          city: candidates.city,
          phone: candidates.mobile,
          email: candidates.email,
          profession: candidates.profession,
          cvContent: candidates.cvContent,
          cvPath: candidates.cvPath,
          notes: candidates.notes,
          extractedAt: candidates.createdAt,
        })
        .from(candidates)
        .orderBy(desc(candidates.createdAt));

      console.log(`📊 נמצאו ${allCandidates.length} מועמדים לבדיקה`);

      // שלב 2: עבור על כל מועמד ובדוק אם הוא מתאים
      const matchingCandidates: SearchResult[] = [];

      for (const candidate of allCandidates) {
        let candidateText = '';
        
        // צירוף טקסט זמין: שם, מקצוע
        const nameProfession = `${candidate.firstName || ''} ${candidate.lastName || ''} ${candidate.profession || ''}`.trim();
        candidateText = nameProfession;
        
        // אם יש תוכן קורות חיים, הוסף אותו
        if (candidate.cvContent) {
          candidateText += ' ' + candidate.cvContent;
        }
        
        // אם יש קובץ קורות חיים אבל אין תוכן חולץ, נחלץ עכשיו
        if (candidate.cvPath && !candidate.cvContent) {
          console.log(`📄 מחלץ טקסט מקובץ עבור ${candidate.firstName} ${candidate.lastName}`);
          try {
            const extractedText = await extractTextFromCVFile(candidate.cvPath);
            if (extractedText) {
              candidateText += ' ' + extractedText;
              console.log(`✅ חילוץ הצליח, ${extractedText.length} תווים`);
            }
          } catch (error) {
            console.error(`❌ שגיאה בחילוץ טקסט עבור ${candidate.candidateId}:`, error);
          }
        }

        // אם נדרש חיפוש בהערות, הוסף הערות למועמד
        if (includeNotes) {
          // הוסף הערות ישירות מהמועמד
          if (candidate.notes) {
            candidateText += ' ' + candidate.notes;
          }
          
          // הוסף הערות מאירועי המועמד
          try {
            const candidateEvents = await this.getCandidateEvents(candidate.candidateId);
            const eventsText = candidateEvents
              .map(event => event.description || '')
              .filter(desc => desc.trim().length > 0)
              .join(' ');
            if (eventsText) {
              candidateText += ' ' + eventsText;
            }
          } catch (error) {
            console.error(`❌ שגיאה בקבלת אירועי מועמד ${candidate.candidateId}:`, error);
          }
        }

        // בדוק אם המועמד מתאים לקריטריונים
        let matches = true;
        const matchedKeywords: string[] = [];

        // בדיקת מילות מפתח חיוביות (לפחות אחת צריכה להתאים)
        if (positiveKeywords.length > 0) {
          let hasPositiveMatch = false;
          for (const keyword of positiveKeywords) {
            if (textContainsKeyword(candidateText, keyword)) {
              hasPositiveMatch = true;
              matchedKeywords.push(keyword);
            }
          }
          if (!hasPositiveMatch) {
            matches = false;
          }
        }

        // בדיקת מילות מפתח שליליות (אף אחת לא צריכה להתאים)
        if (matches && negativeKeywords.length > 0) {
          for (const keyword of negativeKeywords) {
            if (textContainsKeyword(candidateText, keyword)) {
              matches = false;
              break;
            }
          }
        }

        // אם המועמד מתאים, הוסף אותו לתוצאות
        if (matches) {
          matchingCandidates.push({
            candidateId: candidate.candidateId,
            firstName: candidate.firstName || '',
            lastName: candidate.lastName || '',
            city: candidate.city || '',
            phone: candidate.phone || '',
            email: candidate.email || '',
            matchedKeywords,
            cvPreview: candidateText,
            extractedAt: candidate.extractedAt,
          });
        }
      }

      console.log(`✅ נמצאו ${matchingCandidates.length} מועמדים מתאימים`);
      return matchingCandidates;

    } catch (error) {
      console.error('Error searching CVs:', error);
      throw new Error(`CV search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [updatedCandidate] = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: string): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Client operations
  async getClients(limit = 50, offset = 0, search?: string): Promise<{ clients: Client[]; total: number }> {
    const searchCondition = search 
      ? sql`${clients.companyName} ILIKE ${`%${search}%`} OR ${clients.contactName} ILIKE ${`%${search}%`} OR ${clients.email} ILIKE ${`%${search}%`}`
      : undefined;

    const clientResults = await db
      .select()
      .from(clients)
      .where(searchCondition)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResults = await db
      .select({ count: count() })
      .from(clients)
      .where(searchCondition);

    return {
      clients: clientResults,
      total: totalResults[0].count
    };
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Job operations
  async getJobs(limit = 50, offset = 0, search?: string): Promise<{ jobs: JobWithClient[]; total: number }> {
    const searchCondition = search 
      ? sql`${jobs.title} ILIKE ${`%${search}%`} OR ${jobs.description} ILIKE ${`%${search}%`} OR ${jobs.location} ILIKE ${`%${search}%`}`
      : undefined;

    const jobResults = await db
      .select({
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        location: jobs.location,
        salaryRange: jobs.salaryRange,
        jobType: jobs.jobType,
        isRemote: jobs.isRemote,
        status: jobs.status,
        priority: jobs.priority,
        deadline: jobs.deadline,
        clientId: jobs.clientId,
        positions: jobs.positions,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactName: clients.contactName,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          website: clients.website,
          industry: clients.industry,
          commissionRate: clients.commissionRate,
          paymentTerms: clients.paymentTerms,
          notes: clients.notes,
          isActive: clients.isActive,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        },
      })
      .from(jobs)
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(searchCondition)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResults = await db
      .select({ count: count() })
      .from(jobs)
      .where(searchCondition);

    return {
      jobs: jobResults as JobWithClient[],
      total: totalResults[0].count
    };
  }

  async getJob(id: string): Promise<JobWithClient | undefined> {
    const [job] = await db
      .select({
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        location: jobs.location,
        salaryRange: jobs.salaryRange,
        jobType: jobs.jobType,
        isRemote: jobs.isRemote,
        status: jobs.status,
        priority: jobs.priority,
        deadline: jobs.deadline,
        clientId: jobs.clientId,
        positions: jobs.positions,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactName: clients.contactName,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          website: clients.website,
          industry: clients.industry,
          commissionRate: clients.commissionRate,
          paymentTerms: clients.paymentTerms,
          notes: clients.notes,
          isActive: clients.isActive,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        },
      })
      .from(jobs)
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(eq(jobs.id, id));
    
    return job as JobWithClient;
  }

  async createJob(job: InsertJob): Promise<Job> {
    // יצירת קוד משרה אוטומטי בן 7 ספרות (מספרים בלבד)
    let jobCode: string = "";
    let isUnique = false;
    
    while (!isUnique) {
      // יצירת קוד בן 7 מספרים בלבד (1000000-9999999)
      jobCode = Math.floor(Math.random() * 9000000 + 1000000).toString();
      
      // בדיקה שהקוד לא קיים
      const existing = await db.select().from(jobs).where(eq(jobs.jobCode, jobCode)).limit(1);
      isUnique = existing.length === 0;
    }
    
    const jobWithCode = { ...job, jobCode };
    const [newJob] = await db.insert(jobs).values(jobWithCode).returning();
    return newJob;
  }

  async updateJob(id: string, job: Partial<InsertJob>): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJob(id: string): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  // Job application operations
  async getJobApplications(jobId?: string, candidateId?: string): Promise<JobApplicationWithDetails[]> {
    let conditions = [];
    if (jobId) {
      conditions.push(eq(jobApplications.jobId, jobId));
    }
    if (candidateId) {
      conditions.push(eq(jobApplications.candidateId, candidateId));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: jobApplications.id,
        candidateId: jobApplications.candidateId,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        appliedAt: jobApplications.appliedAt,
        interviewDate: jobApplications.interviewDate,
        notes: jobApplications.notes,
        clientFeedback: jobApplications.clientFeedback,
        candidate: {
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
          phone: candidates.phone,
          address: candidates.address,
          profession: candidates.profession,
          experience: candidates.experience,
          expectedSalary: candidates.expectedSalary,
          cvPath: candidates.cvPath,
          status: candidates.status,
          rating: candidates.rating,
          notes: candidates.notes,
          tags: candidates.tags,
          createdAt: candidates.createdAt,
          updatedAt: candidates.updatedAt,
        },
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          requirements: jobs.requirements,
          location: jobs.location,
          salaryRange: jobs.salaryRange,
          jobType: jobs.jobType,
          isRemote: jobs.isRemote,
          status: jobs.status,
          priority: jobs.priority,
          deadline: jobs.deadline,
          clientId: jobs.clientId,
          positions: jobs.positions,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
            contactName: clients.contactName,
            email: clients.email,
            phone: clients.phone,
            address: clients.address,
            website: clients.website,
            industry: clients.industry,
            commissionRate: clients.commissionRate,
            paymentTerms: clients.paymentTerms,
            notes: clients.notes,
            isActive: clients.isActive,
            createdAt: clients.createdAt,
            updatedAt: clients.updatedAt,
          },
        }
      })
      .from(jobApplications)
      .leftJoin(candidates, eq(jobApplications.candidateId, candidates.id))
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(whereCondition)
      .orderBy(desc(jobApplications.appliedAt));

    return results as JobApplicationWithDetails[];
  }

  async getJobApplicationsForReview(): Promise<JobApplicationWithDetails[]> {
    const results = await db
      .select({
        id: jobApplications.id,
        candidateId: jobApplications.candidateId,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        appliedAt: jobApplications.appliedAt,
        interviewDate: jobApplications.interviewDate,
        notes: jobApplications.notes,
        clientFeedback: jobApplications.clientFeedback,
        reviewerFeedback: jobApplications.reviewerFeedback,
        rejectionReason: jobApplications.rejectionReason,
        reviewedAt: jobApplications.reviewedAt,
        sentToClient: jobApplications.sentToClient,
        candidate: {
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
          mobile: candidates.mobile,
          phone: candidates.phone,
          phone2: candidates.phone2,
          nationalId: candidates.nationalId,
          city: candidates.city,
          street: candidates.street,
          houseNumber: candidates.houseNumber,
          zipCode: candidates.zipCode,
          address: candidates.address,
          gender: candidates.gender,
          maritalStatus: candidates.maritalStatus,
          drivingLicense: candidates.drivingLicense,
          receptionArea: candidates.receptionArea,
          profession: candidates.profession,
          experience: candidates.experience,
          achievements: candidates.achievements,
          recruitmentSource: candidates.recruitmentSource,
          expectedSalary: candidates.expectedSalary,
          cvPath: candidates.cvPath,
          status: candidates.status,
          rating: candidates.rating,
          notes: candidates.notes,
          tags: candidates.tags,
          createdAt: candidates.createdAt,
          updatedAt: candidates.updatedAt,
        },
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          requirements: jobs.requirements,
          location: jobs.location,
          salaryRange: jobs.salaryRange,
          jobType: jobs.jobType,
          isRemote: jobs.isRemote,
          status: jobs.status,
          priority: jobs.priority,
          deadline: jobs.deadline,
          clientId: jobs.clientId,
          positions: jobs.positions,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
            contactName: clients.contactName,
            email: clients.email,
            phone: clients.phone,
            address: clients.address,
            website: clients.website,
            industry: clients.industry,
            commissionRate: clients.commissionRate,
            paymentTerms: clients.paymentTerms,
            notes: clients.notes,
            isActive: clients.isActive,
            createdAt: clients.createdAt,
            updatedAt: clients.updatedAt,
          },
        }
      })
      .from(jobApplications)
      .leftJoin(candidates, eq(jobApplications.candidateId, candidates.id))
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(eq(jobApplications.status, 'submitted'))
      .orderBy(desc(jobApplications.appliedAt));

    return results as JobApplicationWithDetails[];
  }

  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    // בדיקת כפילות - האם המועמד כבר הגיש מועמדות למשרה הזו
    const existing = await db
      .select()
      .from(jobApplications)
      .where(and(
        eq(jobApplications.candidateId, application.candidateId),
        eq(jobApplications.jobId, application.jobId)
      ));

    if (existing.length > 0) {
      console.log(`⚠️ מועמדות כפולה זוהתה: מועמד ${application.candidateId} כבר הגיש למשרה ${application.jobId}`);
      
      // אם המועמדות קיימת ומבקשים להוסיף לראיון, נעדכן את הסטטוס
      if (application.status === 'interview_scheduled') {
        console.log(`🔄 מעדכן מועמדות קיימת לסטטוס ראיון`);
        const [updatedApplication] = await db
          .update(jobApplications)
          .set({ 
            status: 'interview_scheduled'
          })
          .where(eq(jobApplications.id, existing[0].id))
          .returning();
        
        console.log(`✅ סטטוס מועמדות עודכן לראיון: מועמד ${application.candidateId} למשרה ${application.jobId}`);
        
        // החזר מידע על המועמדות הקיימת כדי שהלקוח יוכל להציג פופ-אפ
        const existingApplicationWithDetails = {
          ...updatedApplication,
          alreadyExisted: true,
          originalAppliedAt: existing[0].appliedAt,
          originalStatus: existing[0].status,
          wasUpdated: true
        };
        
        console.log(`📤 מחזיר מידע על מועמדות קיימת:`, existingApplicationWithDetails);
        return existingApplicationWithDetails;
      }
      
      // במקרה אחר, החזר מידע על המועמדות הקיימת
      const duplicateError = new Error('המועמד כבר הגיש מועמדות למשרה זו') as any;
      duplicateError.existingApplication = {
        ...existing[0],
        alreadyExisted: true
      };
      throw duplicateError;
    }

    const [newApplication] = await db.insert(jobApplications).values(application).returning();
    console.log(`✅ נוצרה מועמדות חדשה: מועמד ${application.candidateId} למשרה ${application.jobId}`);
    return newApplication;
  }

  async updateJobApplication(id: string, application: Partial<InsertJobApplication>): Promise<JobApplication> {
    const [updatedApplication] = await db
      .update(jobApplications)
      .set(application)
      .where(eq(jobApplications.id, id))
      .returning();
    return updatedApplication;
  }

  async deleteJobApplication(id: string): Promise<void> {
    await db.delete(jobApplications).where(eq(jobApplications.id, id));
  }

  // Task operations
  async getTasks(limit = 50, offset = 0, isCompleted?: boolean): Promise<{ tasks: TaskWithDetails[]; total: number }> {
    let query = db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      isCompleted: tasks.isCompleted,
      candidateId: tasks.candidateId,
      jobId: tasks.jobId,
      clientId: tasks.clientId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      candidate: candidates,
      job: {
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        location: jobs.location,
        salaryRange: jobs.salaryRange,
        jobType: jobs.jobType,
        isRemote: jobs.isRemote,
        status: jobs.status,
        priority: jobs.priority,
        deadline: jobs.deadline,
        clientId: jobs.clientId,
        positions: jobs.positions,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        client: clients,
      },
      client: clients,
    }).from(tasks)
      .leftJoin(candidates, eq(tasks.candidateId, candidates.id))
      .leftJoin(jobs, eq(tasks.jobId, jobs.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id));

    let countQuery = db.select({ count: count() }).from(tasks);

    if (isCompleted !== undefined) {
      query = query.where(eq(tasks.isCompleted, isCompleted));
      countQuery = countQuery.where(eq(tasks.isCompleted, isCompleted));
    }

    const [taskResults, totalResults] = await Promise.all([
      query.orderBy(asc(tasks.dueDate)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      tasks: taskResults as TaskWithDetails[],
      total: totalResults[0].count
    };
  }

  async getTask(id: string): Promise<TaskWithDetails | undefined> {
    const [task] = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      isCompleted: tasks.isCompleted,
      candidateId: tasks.candidateId,
      jobId: tasks.jobId,
      clientId: tasks.clientId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      candidate: candidates,
      job: {
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        location: jobs.location,
        salaryRange: jobs.salaryRange,
        jobType: jobs.jobType,
        isRemote: jobs.isRemote,
        status: jobs.status,
        priority: jobs.priority,
        deadline: jobs.deadline,
        clientId: jobs.clientId,
        positions: jobs.positions,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        client: clients,
      },
      client: clients,
    }).from(tasks)
      .leftJoin(candidates, eq(tasks.candidateId, candidates.id))
      .leftJoin(jobs, eq(tasks.jobId, jobs.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(eq(tasks.id, id));
    
    return task as TaskWithDetails;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    activeJobs: number;
    newCandidates: number;
    placements: number;
    revenue: number;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [activeJobsResult] = await db
      .select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'active'));

    const [newCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(sql`${candidates.createdAt} >= ${thirtyDaysAgo}`);

    const [placementsResult] = await db
      .select({ count: count() })
      .from(jobApplications)
      .where(and(
        eq(jobApplications.status, 'accepted'),
        sql`${jobApplications.appliedAt} >= ${thirtyDaysAgo}`
      ));

    // Mock revenue calculation - in real app this would come from a payments table
    const revenue = placementsResult.count * 15000; // Average commission per placement

    return {
      activeJobs: activeJobsResult.count,
      newCandidates: newCandidatesResult.count,
      placements: placementsResult.count,
      revenue,
    };
  }

  // Recent activity
  async getRecentCandidates(limit = 5): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .orderBy(desc(candidates.createdAt))
      .limit(limit);
  }

  async getUrgentTasks(limit = 5): Promise<TaskWithDetails[]> {
    const results = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      isCompleted: tasks.isCompleted,
      candidateId: tasks.candidateId,
      jobId: tasks.jobId,
      clientId: tasks.clientId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      candidate: candidates,
      job: {
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        requirements: jobs.requirements,
        location: jobs.location,
        salaryRange: jobs.salaryRange,
        jobType: jobs.jobType,
        isRemote: jobs.isRemote,
        status: jobs.status,
        priority: jobs.priority,
        deadline: jobs.deadline,
        clientId: jobs.clientId,
        positions: jobs.positions,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        client: clients,
      },
      client: clients,
    }).from(tasks)
      .leftJoin(candidates, eq(tasks.candidateId, candidates.id))
      .leftJoin(jobs, eq(tasks.jobId, jobs.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(and(
        eq(tasks.isCompleted, false),
        sql`${tasks.dueDate} <= ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)}` // next 3 days
      ))
      .orderBy(asc(tasks.dueDate))
      .limit(limit);

    return results as TaskWithDetails[];
  }

  // Email operations
  async getEmails(): Promise<Email[]> {
    const emailList = await db
      .select()
      .from(emails)
      .orderBy(desc(emails.createdAt));
    return emailList;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const [newEmail] = await db
      .insert(emails)
      .values(email)
      .returning();
    return newEmail;
  }

  async updateEmail(id: string, email: Partial<InsertEmail>): Promise<Email> {
    const [updatedEmail] = await db
      .update(emails)
      .set(email)
      .where(eq(emails.id, id))
      .returning();
    return updatedEmail;
  }

  // CV Search operations
  async searchCandidatesByKeywords(keywords: string, limit = 50, offset = 0): Promise<{ candidates: Candidate[]; total: number }> {
    // Split keywords and search for exact matches in CV content
    const keywordList = keywords.split(' ').filter(k => k.trim().length > 0);
    
    if (keywordList.length === 0) {
      return { candidates: [], total: 0 };
    }

    // Use PostgreSQL full-text search for better performance
    const searchQuery = keywordList.map(k => k.trim()).join(' & ');
    
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidates)
      .where(and(
        sql`${candidates.cvContent} IS NOT NULL`,
        sql`to_tsvector('english', ${candidates.cvContent}) @@ to_tsquery('english', ${searchQuery})`
      ));

    const total = countResult?.count || 0;

    if (total === 0) {
      return { candidates: [], total: 0 };
    }

    // Get paginated results with ranking for relevance
    const results = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
        phone: candidates.phone,
        phone2: candidates.phone2,
        nationalId: candidates.nationalId,
        city: candidates.city,
        street: candidates.street,
        houseNumber: candidates.houseNumber,
        zipCode: candidates.zipCode,
        address: candidates.address,
        gender: candidates.gender,
        maritalStatus: candidates.maritalStatus,
        drivingLicense: candidates.drivingLicense,
        receptionArea: candidates.receptionArea,
        profession: candidates.profession,
        experience: candidates.experience,
        achievements: candidates.achievements,
        recruitmentSource: candidates.recruitmentSource,
        expectedSalary: candidates.expectedSalary,
        cvPath: candidates.cvPath,
        cvContent: candidates.cvContent,
        status: candidates.status,
        rating: candidates.rating,
        notes: candidates.notes,
        tags: candidates.tags,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        // Add relevance ranking
        rank: sql<number>`ts_rank(to_tsvector('english', ${candidates.cvContent}), to_tsquery('english', ${searchQuery}))`,
      })
      .from(candidates)
      .where(and(
        sql`${candidates.cvContent} IS NOT NULL`,
        sql`to_tsvector('english', ${candidates.cvContent}) @@ to_tsquery('english', ${searchQuery})`
      ))
      .orderBy(sql`ts_rank(to_tsvector('english', ${candidates.cvContent}), to_tsquery('english', ${searchQuery})) DESC`)
      .limit(limit)
      .offset(offset);

    // Remove the rank field from results before returning
    const candidatesWithoutRank = results.map(({ rank, ...candidate }) => candidate);

    return { candidates: candidatesWithoutRank, total };
  }

  // Message Template operations
  async getMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
  }

  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const [newTemplate] = await db.insert(messageTemplates).values(template).returning();
    return newTemplate;
  }

  async updateMessageTemplate(id: string, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate> {
    const [updatedTemplate] = await db
      .update(messageTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteMessageTemplate(id: string): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  // System Settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value,
          description,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  }

  async deleteSystemSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
  }

  // Reminder operations
  async getReminders(userId?: string): Promise<ReminderWithDetails[]> {
    const query = db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminderDate: reminders.reminderDate,
      priority: reminders.priority,
      isCompleted: reminders.isCompleted,
      candidateId: reminders.candidateId,
      jobId: reminders.jobId,
      clientId: reminders.clientId,
      createdBy: reminders.createdBy,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      }
    })
    .from(reminders)
    .leftJoin(candidates, eq(reminders.candidateId, candidates.id))
    .leftJoin(jobs, eq(reminders.jobId, jobs.id))
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .orderBy(desc(reminders.reminderDate));

    if (userId) {
      query.where(eq(reminders.createdBy, userId));
    }

    return await query;
  }

  async getReminder(id: string): Promise<ReminderWithDetails | undefined> {
    const [reminder] = await db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminderDate: reminders.reminderDate,
      priority: reminders.priority,
      isCompleted: reminders.isCompleted,
      candidateId: reminders.candidateId,
      jobId: reminders.jobId,
      clientId: reminders.clientId,
      createdBy: reminders.createdBy,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      }
    })
    .from(reminders)
    .leftJoin(candidates, eq(reminders.candidateId, candidates.id))
    .leftJoin(jobs, eq(reminders.jobId, jobs.id))
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .where(eq(reminders.id, id));

    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values(reminder).returning();
    return newReminder;
  }

  async updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder> {
    const [updatedReminder] = await db
      .update(reminders)
      .set({ ...reminder, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return updatedReminder;
  }

  async deleteReminder(id: string): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  async getDueReminders(userId?: string): Promise<ReminderWithDetails[]> {
    const query = db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminderDate: reminders.reminderDate,
      priority: reminders.priority,
      isCompleted: reminders.isCompleted,
      candidateId: reminders.candidateId,
      jobId: reminders.jobId,
      clientId: reminders.clientId,
      createdBy: reminders.createdBy,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      }
    })
    .from(reminders)
    .leftJoin(candidates, eq(reminders.candidateId, candidates.id))
    .leftJoin(jobs, eq(reminders.jobId, jobs.id))
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .where(and(
      eq(reminders.isCompleted, false),
      sql`${reminders.reminderDate} <= ${new Date()}`
    ))
    .orderBy(desc(reminders.reminderDate));

    if (userId) {
      query.where(and(
        eq(reminders.createdBy, userId),
        eq(reminders.isCompleted, false),
        sql`${reminders.reminderDate} <= ${new Date()}`
      ));
    }

    return await query;
  }

  // Interview Event operations
  async getInterviewEvents(userId?: string): Promise<InterviewEventWithDetails[]> {
    const query = db.select({
      id: interviewEvents.id,
      title: interviewEvents.title,
      description: interviewEvents.description,
      eventDate: interviewEvents.eventDate,
      eventType: interviewEvents.eventType,
      status: interviewEvents.status,
      candidateId: interviewEvents.candidateId,
      jobId: interviewEvents.jobId,
      clientId: interviewEvents.clientId,
      recruiterId: interviewEvents.recruiterId,
      recruiterName: interviewEvents.recruiterName,
      recruiterColor: interviewEvents.recruiterColor,
      location: interviewEvents.location,
      notes: interviewEvents.notes,
      metadata: interviewEvents.metadata,
      createdBy: interviewEvents.createdBy,
      createdAt: interviewEvents.createdAt,
      updatedAt: interviewEvents.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      },
      recruiter: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(interviewEvents)
    .innerJoin(candidates, eq(interviewEvents.candidateId, candidates.id))
    .leftJoin(jobs, eq(interviewEvents.jobId, jobs.id))
    .leftJoin(clients, eq(interviewEvents.clientId, clients.id))
    .leftJoin(users, eq(interviewEvents.recruiterId, users.id))
    .orderBy(desc(interviewEvents.eventDate));

    if (userId) {
      query.where(eq(interviewEvents.createdBy, userId));
    }

    return await query;
  }

  async getInterviewEvent(id: string): Promise<InterviewEventWithDetails | undefined> {
    const [event] = await db.select({
      id: interviewEvents.id,
      title: interviewEvents.title,
      description: interviewEvents.description,
      eventDate: interviewEvents.eventDate,
      eventType: interviewEvents.eventType,
      status: interviewEvents.status,
      candidateId: interviewEvents.candidateId,
      jobId: interviewEvents.jobId,
      clientId: interviewEvents.clientId,
      recruiterId: interviewEvents.recruiterId,
      recruiterName: interviewEvents.recruiterName,
      recruiterColor: interviewEvents.recruiterColor,
      location: interviewEvents.location,
      notes: interviewEvents.notes,
      metadata: interviewEvents.metadata,
      createdBy: interviewEvents.createdBy,
      createdAt: interviewEvents.createdAt,
      updatedAt: interviewEvents.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      },
      recruiter: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(interviewEvents)
    .innerJoin(candidates, eq(interviewEvents.candidateId, candidates.id))
    .leftJoin(jobs, eq(interviewEvents.jobId, jobs.id))
    .leftJoin(clients, eq(interviewEvents.clientId, clients.id))
    .leftJoin(users, eq(interviewEvents.recruiterId, users.id))
    .where(eq(interviewEvents.id, id));

    return event;
  }

  async createInterviewEvent(event: InsertInterviewEvent): Promise<InterviewEvent> {
    const [newEvent] = await db.insert(interviewEvents).values(event).returning();
    return newEvent;
  }

  async updateInterviewEvent(id: string, event: Partial<InsertInterviewEvent>): Promise<InterviewEvent> {
    const [updatedEvent] = await db
      .update(interviewEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(interviewEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteInterviewEvent(id: string): Promise<void> {
    await db.delete(interviewEvents).where(eq(interviewEvents.id, id));
  }

  async getUpcomingInterviewEvents(userId?: string): Promise<InterviewEventWithDetails[]> {
    const query = db.select({
      id: interviewEvents.id,
      title: interviewEvents.title,
      description: interviewEvents.description,
      eventDate: interviewEvents.eventDate,
      eventType: interviewEvents.eventType,
      status: interviewEvents.status,
      candidateId: interviewEvents.candidateId,
      jobId: interviewEvents.jobId,
      clientId: interviewEvents.clientId,
      recruiterId: interviewEvents.recruiterId,
      recruiterName: interviewEvents.recruiterName,
      recruiterColor: interviewEvents.recruiterColor,
      location: interviewEvents.location,
      notes: interviewEvents.notes,
      metadata: interviewEvents.metadata,
      createdBy: interviewEvents.createdBy,
      createdAt: interviewEvents.createdAt,
      updatedAt: interviewEvents.updatedAt,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        mobile: candidates.mobile,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
        jobCode: jobs.jobCode,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        contactName: clients.contactName,
      },
      recruiter: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(interviewEvents)
    .innerJoin(candidates, eq(interviewEvents.candidateId, candidates.id))
    .leftJoin(jobs, eq(interviewEvents.jobId, jobs.id))
    .leftJoin(clients, eq(interviewEvents.clientId, clients.id))
    .leftJoin(users, eq(interviewEvents.recruiterId, users.id))
    .where(and(
      eq(interviewEvents.status, 'scheduled'),
      sql`${interviewEvents.eventDate} >= ${new Date()}`
    ))
    .orderBy(asc(interviewEvents.eventDate));

    if (userId) {
      query.where(and(
        eq(interviewEvents.createdBy, userId),
        eq(interviewEvents.status, 'scheduled'),
        sql`${interviewEvents.eventDate} >= ${new Date()}`
      ));
    }

    return await query;
  }

  // RBAC Implementation
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(asc(roles.name));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByType(type: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.type, type));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: string, role: Partial<InsertRole>): Promise<Role> {
    const [updated] = await db
      .update(roles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(asc(permissions.resource), asc(permissions.action));
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission || undefined;
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [created] = await db.insert(permissions).values(permission).returning();
    return created;
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  async getUserWithRoles(id: string): Promise<UserWithRoles | undefined> {
    // Get user with roles using manual joins to avoid relation ambiguity
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        userRole: {
          id: userRoles.id,
          userId: userRoles.userId,
          roleId: userRoles.roleId,
          assignedBy: userRoles.assignedBy,
          assignedAt: userRoles.assignedAt,
          role: {
            id: roles.id,
            name: roles.name,
            type: roles.type,
            description: roles.description,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          }
        }
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.id, id));

    if (result.length === 0) return undefined;

    // Group by user and collect roles
    const user = result[0];
    const userWithRoles: UserWithRoles = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userRoles: result
        .filter(r => r.userRole && r.userRole.id !== null && r.userRole.role && r.userRole.role.id !== null)
        .map(r => ({
          id: r.userRole.id!,
          userId: r.userRole.userId!,
          roleId: r.userRole.roleId!,
          assignedBy: r.userRole.assignedBy!,
          assignedAt: r.userRole.assignedAt!,
          role: {
            ...r.userRole.role!,
            rolePermissions: [] // Will get permissions separately if needed
          }
        }))
    };

    // Get permissions for each role
    for (const userRole of userWithRoles.userRoles) {
      const rolePerms = await db
        .select({
          permission: {
            id: permissions.id,
            name: permissions.name,
            resource: permissions.resource,
            action: permissions.action,
            description: permissions.description
          }
        })
        .from(rolePermissions)
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, userRole.roleId));

      userRole.role.rolePermissions = rolePerms.map(rp => ({
        permission: rp.permission
      }));
    }

    return userWithRoles;
  }

  async getAllUsers(): Promise<UserWithRoles[]> {
    const allUsers = await db.select().from(users);
    const usersWithRoles: UserWithRoles[] = [];
    
    for (const user of allUsers) {
      const userWithRoles = await this.getUserWithRoles(user.id);
      if (userWithRoles) {
        usersWithRoles.push(userWithRoles);
      }
    }
    
    return usersWithRoles;
  }

  async assignUserRole(userRole: InsertUserRole): Promise<UserRole> {
    const [created] = await db.insert(userRoles).values(userRole).returning();
    return created;
  }

  async removeUserRole(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
    );
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async assignRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [created] = await db.insert(rolePermissions).values(rolePermission).returning();
    return created;
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    await db.delete(rolePermissions).where(
      and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
    );
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userWithRoles = await this.getUserWithRoles(userId);
    if (!userWithRoles) return false;

    // Check if user has any role that grants this permission
    for (const userRole of userWithRoles.userRoles) {
      const role = userRole.role;
      
      // Super admin has all permissions
      if (role.type === 'super_admin') return true;
      
      // Check role permissions
      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission;
        if (permission.resource === resource && permission.action === action) {
          return true;
        }
      }
    }

    return false;
  }

  async hasRole(userId: string, roleType: string): Promise<boolean> {
    const userWithRoles = await this.getUserWithRoles(userId);
    if (!userWithRoles) return false;

    return userWithRoles.userRoles.some(userRole => userRole.role.type === roleType);
  }
}

export const storage = new DatabaseStorage();
