import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const crmOrdersTable = pgTable("crm_orders", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  workType: text("work_type").notNull(),
  university: text("university"),
  price: numeric("price", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'refunded'
  deliveryStatus: text("delivery_status").notNull().default("new"), // 'new', 'in_progress', 'completed', 'cancelled'
  assignedTo: text("assigned_to"), // Email or name of assignee
  notes: text("notes"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const crmTeamMembersTable = pgTable("crm_team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("writer"), // 'writer', 'reviewer', 'admin'
  specialization: text("specialization"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCrmOrderSchema = createInsertSchema(crmOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrmOrder = z.infer<typeof insertCrmOrderSchema>;
export type CrmOrder = typeof crmOrdersTable.$inferSelect;

export const insertCrmTeamMemberSchema = createInsertSchema(crmTeamMembersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCrmTeamMember = z.infer<typeof insertCrmTeamMemberSchema>;
export type CrmTeamMember = typeof crmTeamMembersTable.$inferSelect;
