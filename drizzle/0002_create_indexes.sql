CREATE INDEX "idx_project_members_user_id" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_project_id" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_projects_owner_id" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_projects_created_at" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assigned_to" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_at" ON "tasks" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at" DESC NULLS LAST);