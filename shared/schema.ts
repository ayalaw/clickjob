import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const jobStatusEnum = pgEnum('job_status', ['active', 'paused', 'closed']);
export const applicationStatusEnum = pgEnum('application_status', ['submitted', 'reviewed', 'interview', 'rejected', 'accepted']);
export const rejectionReasonEnum = pgEnum('rejection_reason', ['lack_of_experience', 'geographic_mismatch', 'salary_demands', 'qualifications_mismatch', 'other']);
export const emailStatusEnum = pgEnum('email_status', ['pending', 'sent', 'failed', 'delivered', 'bounced']);

// Message templates table
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  content: text("content").notNull(),
  icon: varchar("icon").default("💬"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  mobile: varchar("mobile"), // נייד
  phone: varchar("phone"), // טלפון נ'
  phone2: varchar("phone2"), // טלפון נ' 2
  nationalId: varchar("national_id"), // תעודת זהות
  city: varchar("city").notNull(), // עיר*
  street: varchar("street"), // רחוב
  houseNumber: varchar("house_number"), // מס' בית
  zipCode: varchar("zip_code"), // מיקוד
  address: text("address"), // כתובת מלאה (נשאר לתאימות לאחור)
  gender: varchar("gender"), // מין
  maritalStatus: varchar("marital_status"), // מצב משפחתי
  drivingLicense: varchar("driving_license"), // רישיון נהיגה
  receptionArea: varchar("reception_area"), // איזור קליטה אופטימליות (מוסר)
  profession: varchar("profession"),
  experience: integer("experience"), // years of experience
  achievements: text("achievements"), // הישגים
  recruitmentSource: varchar("recruitment_source"), // מקור גיוס
  expectedSalary: integer("expected_salary"),
  cvPath: varchar("cv_path"), // file path for uploaded CV
  cvContent: text("cv_content"), // extracted text content from CV for searching
  status: text("status").default('pending'),
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  tags: text("tags").array(), // array of tags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Indexes for optimized search performance
  index("candidates_name_idx").on(table.firstName, table.lastName),
  index("candidates_email_idx").on(table.email),
  index("candidates_profession_idx").on(table.profession),
  index("candidates_city_idx").on(table.city),
  index("candidates_status_idx").on(table.status),
  index("candidates_created_at_idx").on(table.createdAt),
  // Full-text search index for CV content
  sql`CREATE INDEX IF NOT EXISTS candidates_cv_content_gin_idx ON candidates USING gin(to_tsvector('english', cv_content))`,
]);

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  address: text("address"),
  website: varchar("website"),
  industry: varchar("industry"),
  commissionRate: integer("commission_rate"), // percentage
  paymentTerms: varchar("payment_terms"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobCode: varchar("job_code", { length: 7 }).unique(), // קוד משרה בן 7 ספרות
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  location: varchar("location"),
  salaryRange: varchar("salary_range"),
  jobType: varchar("job_type"), // full-time, part-time, contract
  isRemote: boolean("is_remote").default(false),
  status: jobStatusEnum("status").default('active'),
  priority: varchar("priority").default('medium'), // low, medium, high
  deadline: timestamp("deadline"),
  clientId: varchar("client_id").references(() => clients.id),
  positions: integer("positions").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Indexes for optimized search performance
  index("jobs_job_code_idx").on(table.jobCode),
  index("jobs_title_idx").on(table.title),
  index("jobs_status_idx").on(table.status),
  index("jobs_client_id_idx").on(table.clientId),
  index("jobs_priority_idx").on(table.priority),
  index("jobs_created_at_idx").on(table.createdAt),
]);

// Job Applications (many-to-many between candidates and jobs)
export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  status: applicationStatusEnum("status").default('submitted'),
  appliedAt: timestamp("applied_at").defaultNow(),
  interviewDate: timestamp("interview_date"),
  notes: text("notes"),
  clientFeedback: text("client_feedback"),
  reviewerFeedback: text("reviewer_feedback"), // חוות דעת המגייס
  rejectionReason: rejectionReasonEnum("rejection_reason"), // סיבת פסילה
  reviewedAt: timestamp("reviewed_at"), // תאריך הסקירה
  sentToClient: boolean("sent_to_client").default(false), // האם נשלח ללקוח
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: varchar("priority").default('medium'), // low, medium, high
  isCompleted: boolean("is_completed").default(false),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  clientId: varchar("client_id").references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table for tracking candidate interactions
export const candidateEvents = pgTable("candidate_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  eventType: varchar("event_type").notNull(), // email_application, phone_call, interview, status_change, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // additional data as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  reminderDate: timestamp("reminder_date").notNull(),
  priority: varchar("priority").default('medium'), // low, medium, high
  isCompleted: boolean("is_completed").default(false),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  clientId: varchar("client_id").references(() => clients.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(jobApplications),
  tasks: many(tasks),
  events: many(candidateEvents),
  reminders: many(reminders),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  jobs: many(jobs),
  tasks: many(tasks),
  reminders: many(reminders),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  client: one(clients, {
    fields: [jobs.clientId],
    references: [clients.id],
  }),
  applications: many(jobApplications),
  tasks: many(tasks),
  reminders: many(reminders),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  candidate: one(candidates, {
    fields: [jobApplications.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  candidate: one(candidates, {
    fields: [tasks.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [tasks.jobId],
    references: [jobs.id],
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
}));

export const candidateEventsRelations = relations(candidateEvents, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateEvents.candidateId],
    references: [candidates.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  candidate: one(candidates, {
    fields: [reminders.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [reminders.jobId],
    references: [jobs.id],
  }),
  client: one(clients, {
    fields: [reminders.clientId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [reminders.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  appliedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Email table for tracking sent emails
export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  from: varchar("from").notNull(),
  to: varchar("to").notNull(),
  cc: varchar("cc"),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  isHtml: boolean("is_html").default(true),
  status: emailStatusEnum("status").default('pending'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  clientId: varchar("client_id").references(() => clients.id),
  sentBy: varchar("sent_by").references(() => users.id),
  errorMessage: text("error_message"),
  attachments: text("attachments").array(), // array of file paths
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emails);
export const insertCandidateEventSchema = createInsertSchema(candidateEvents).omit({
  id: true,
  createdAt: true,
});
export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertCandidateEvent = z.infer<typeof insertCandidateEventSchema>;
export type CandidateEvent = typeof candidateEvents.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type ReminderWithDetails = Reminder & { candidate?: Candidate; job?: JobWithClient; client?: Client; };
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type JobWithClient = Job & { client: Client };
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type JobApplicationWithDetails = JobApplication & { candidate: Candidate; job: JobWithClient };
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type TaskWithDetails = Task & { candidate?: Candidate; job?: JobWithClient; client?: Client };
