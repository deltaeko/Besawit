CREATE INDEX "payables_status_due_date_idx" ON "payables" USING btree ("status","due_date");
--> statement-breakpoint
CREATE INDEX "receivables_status_due_date_idx" ON "receivables" USING btree ("status","due_date");
