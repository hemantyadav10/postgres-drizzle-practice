import { db } from "./index.js";
import {
  projectMembers,
  projects,
  tasks,
  userProfiles,
  users,
} from "./schema.js";

async function seed() {
  // Seed users
  console.log("Seeding users...");
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        email: "john@example.com",
        fullName: "John Doe",
        passwordHash: "hash1",
      },
      {
        email: "jane@example.com",
        fullName: "Jane Smith",
        passwordHash: "hash2",
      },
      {
        email: "bob@example.com",
        fullName: "Bob Wilson",
        passwordHash: "hash3",
      },
      {
        email: "alice@example.com",
        fullName: "Alice Brown",
        passwordHash: "hash4",
      },
    ])
    .returning();

  const userMap = new Map(insertedUsers.map((u) => [u.email, u]));

  const getUser = (email: string) => {
    const user = userMap.get(email);
    if (!user) throw new Error(`User not found: ${email}`);
    return user;
  };

  // Seed user_profiles
  console.log("Seeding user profiles...");
  const bios: Record<string, string> = {
    "john@example.com": "Project Manager with 5 years experience",
    "jane@example.com": "Senior Developer",
    "bob@example.com": "UX Designer",
    "alice@example.com": "Business Analyst",
  };

  await db.insert(userProfiles).values(
    insertedUsers.map((u, i) => ({
      userId: u.id,
      avatarUrl: `https://example.com/avatar${i + 1}.jpg`,
      bio: bios[u.email],
      phone: `+123456789${i + 1}`,
    })),
  );

  // Seed projects
  console.log("Seeding projects...");
  const insertedProjects = await db
    .insert(projects)
    .values([
      {
        name: "Website Redesign",
        description: "Complete overhaul of company website",
        status: "active" as const,
        ownerId: getUser("john@example.com").id,
      },
      {
        name: "Mobile App Development",
        description: "New mobile app for customers",
        status: "active" as const,
        ownerId: getUser("john@example.com").id,
      },
      {
        name: "Database Migration",
        description: "Migrate legacy database to new system",
        status: "active" as const,
        ownerId: getUser("john@example.com").id,
      },
    ])
    .returning();

  const projectMap = new Map(insertedProjects.map((p) => [p.name, p]));

  const getProject = (name: string) => {
    const project = projectMap.get(name);
    if (!project) throw new Error(`Project not found: ${name}`);
    return project;
  };

  // Seed tasks
  console.log("Seeding tasks...");
  await db.insert(tasks).values([
    {
      projectId: getProject("Website Redesign").id,
      title: "Design Homepage",
      description: "Create new homepage design",
      priority: 1,
      status: "pending" as const,
      dueDate: "2024-04-01",
      assignedTo: getUser("bob@example.com").id,
    },
    {
      projectId: getProject("Website Redesign").id,
      title: "Implement Frontend",
      description: "Implement the frontend design",
      priority: 2,
      status: "pending" as const,
      dueDate: "2024-04-10",
      assignedTo: getUser("jane@example.com").id,
    },
    {
      projectId: getProject("Mobile App Development").id,
      title: "User Authentication",
      description: "Implement user authentication flow",
      priority: 1,
      status: "pending" as const,
      dueDate: "2024-04-05",
      assignedTo: getUser("jane@example.com").id,
    },
    {
      projectId: getProject("Database Migration").id,
      title: "Data Analysis",
      description: "Analyze current database structure",
      priority: 2,
      status: "completed" as const,
      dueDate: "2024-03-25",
      assignedTo: getUser("alice@example.com").id,
    },
    {
      projectId: getProject("Database Migration").id,
      title: "Migration Script",
      description: "Write data migration scripts",
      priority: 1,
      status: "in_progress" as const,
      dueDate: "2024-04-20",
      assignedTo: getUser("jane@example.com").id,
    },
  ]);

  // Seed project_members
  console.log("Seeding project members...");
  await db.insert(projectMembers).values([
    {
      projectId: getProject("Website Redesign").id,
      userId: getUser("john@example.com").id,
      role: "owner" as const,
    },
    {
      projectId: getProject("Website Redesign").id,
      userId: getUser("jane@example.com").id,
      role: "member" as const,
    },
    {
      projectId: getProject("Website Redesign").id,
      userId: getUser("bob@example.com").id,
      role: "member" as const,
    },
    {
      projectId: getProject("Mobile App Development").id,
      userId: getUser("jane@example.com").id,
      role: "owner" as const,
    },
    {
      projectId: getProject("Mobile App Development").id,
      userId: getUser("bob@example.com").id,
      role: "admin" as const,
    },
    {
      projectId: getProject("Mobile App Development").id,
      userId: getUser("alice@example.com").id,
      role: "member" as const,
    },
    {
      projectId: getProject("Database Migration").id,
      userId: getUser("john@example.com").id,
      role: "owner" as const,
    },
    {
      projectId: getProject("Database Migration").id,
      userId: getUser("jane@example.com").id,
      role: "member" as const,
    },
    {
      projectId: getProject("Database Migration").id,
      userId: getUser("alice@example.com").id,
      role: "admin" as const,
    },
  ]);

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
