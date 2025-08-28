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
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, ilike, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Candidate operations
  getCandidates(limit?: number, offset?: number, search?: string): Promise<{ candidates: Candidate[]; total: number }>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;
  findCandidateByMobileOrId(mobile?: string, nationalId?: string): Promise<Candidate | undefined>;
  addCandidateEvent(event: InsertCandidateEvent): Promise<CandidateEvent>;
  getCandidateEvents(candidateId: string): Promise<CandidateEvent[]>;

  // Reminder operations
  getReminders(userId?: string): Promise<ReminderWithDetails[]>;
  getReminder(id: string): Promise<ReminderWithDetails | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  getDueReminders(userId?: string): Promise<ReminderWithDetails[]>;

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
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Candidate operations
  async getCandidates(limit = 50, offset = 0, search?: string): Promise<{ candidates: Candidate[]; total: number }> {
    const searchCondition = search 
      ? sql`${candidates.firstName} || ' ' || ${candidates.lastName} ILIKE ${`%${search}%`} OR ${candidates.email} ILIKE ${`%${search}%`} OR ${candidates.profession} ILIKE ${`%${search}%`}`
      : undefined;

    const candidateResults = await db
      .select()
      .from(candidates)
      .where(searchCondition)
      .orderBy(desc(candidates.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResults = await db
      .select({ count: count() })
      .from(candidates)
      .where(searchCondition);

    return {
      candidates: candidateResults,
      total: totalResults[0].count
    };
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
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
    // יצירת קוד משרה אוטומטי בן 7 ספרות
    let jobCode: string;
    let isUnique = false;
    
    while (!isUnique) {
      // יצירת קוד בן 7 ספרות (אותיות גדולות ומספרים)
      jobCode = Array.from({ length: 7 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      ).join('');
      
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
    const [newApplication] = await db.insert(jobApplications).values(application).returning();
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
}

export const storage = new DatabaseStorage();
