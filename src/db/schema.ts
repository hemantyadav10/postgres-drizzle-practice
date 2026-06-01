import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Enums ===================================================

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "archived",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

// helper function for primary key definition
const primaryKeyId = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);

// common timestamp fields for all tables
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};

// Tables ===================================================

// users table
export const users = pgTable(
  "users",
  {
    id: primaryKeyId(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_created_at").on(table.createdAt.desc()),
  ],
);

// user_profiles table (one-to-one relation with users table)
export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  phone: text("phone"),
  ...timestamps,
});

// projects table
export const projects = pgTable(
  "projects",
  {
    id: primaryKeyId(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_projects_owner_id").on(table.ownerId),
    index("idx_projects_created_at").on(table.createdAt),
  ],
);

// tasks table (one-to-many relation with projects table)
export const tasks = pgTable(
  "tasks",
  {
    id: primaryKeyId(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: integer("priority").default(1),
    status: taskStatusEnum("status").default("pending"),
    dueDate: date("due_date"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    check(
      "priority_check",
      sql`${table.priority} >= 1 AND ${table.priority} <= 5`,
    ),
    index("idx_tasks_project_id").on(table.projectId),
    index("idx_tasks_assigned_to").on(table.assignedTo),
    index("idx_tasks_created_at").on(table.createdAt.desc()),
    index("idx_tasks_status").on(table.status),
  ],
);

// project-members table (many-to-many relation between users and projects)
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("idx_project_members_user_id").on(table.userId),
    index("idx_project_members_project_id").on(table.projectId),
  ],
);

// Relations ===================================================

// relations for the users table
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  projects: many(projects),
  tasks: many(tasks),
}));

// relations for the projects table
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  tasks: many(tasks),
  members: many(projectMembers),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
}));
