<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getPdo()->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'pgsql') {
            // PostgreSQL / YSQL compatible DDL
            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_statuses (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL, description VARCHAR(255) NULL, CONSTRAINT uq_ticket_statuses_name UNIQUE (name));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_priorities (id SERIAL PRIMARY KEY, name VARCHAR(20) NOT NULL, response_time_minutes INTEGER NOT NULL, resolution_time_minutes INTEGER NOT NULL, sort_order SMALLINT NOT NULL DEFAULT 0, CONSTRAINT uq_ticket_priorities_name UNIQUE (name));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_categories (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL, CONSTRAINT uq_ticket_categories_name UNIQUE (name));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS intake_channels (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL, CONSTRAINT uq_intake_channels_name UNIQUE (name));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS client_companies (id BIGSERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, primary_email VARCHAR(255) NULL, phone VARCHAR(50) NULL, is_vip BOOLEAN NOT NULL DEFAULT FALSE, notes TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);");

            DB::unprepared("CREATE TABLE IF NOT EXISTS client_contacts (id BIGSERIAL PRIMARY KEY, client_company_id BIGINT NOT NULL, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50) NULL, is_primary BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_client_contacts_email UNIQUE (email), CONSTRAINT fk_client_contacts_company FOREIGN KEY (client_company_id) REFERENCES client_companies (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, email_verified_at TIMESTAMP NULL, password VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'Client' CHECK (role IN ('Client','CSR','Bridge','Developer','QA','Admin')), client_company_id BIGINT NULL, client_contact_id BIGINT NULL, is_vip BOOLEAN NOT NULL DEFAULT FALSE, is_active BOOLEAN NOT NULL DEFAULT TRUE, remember_token VARCHAR(100) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_users_email UNIQUE (email), CONSTRAINT fk_users_company FOREIGN KEY (client_company_id) REFERENCES client_companies (id), CONSTRAINT fk_users_contact FOREIGN KEY (client_contact_id) REFERENCES client_contacts (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS tags (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, CONSTRAINT uq_tags_name UNIQUE (name));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS sprints (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned','Active','Completed')), notes TEXT NULL, created_by BIGINT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_sprints_created_by FOREIGN KEY (created_by) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS tickets (id BIGSERIAL PRIMARY KEY, ticket_id VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NOT NULL, status_id INTEGER NOT NULL, priority_id INTEGER NOT NULL, category_id INTEGER NOT NULL, intake_channel_id INTEGER NOT NULL, contact_email VARCHAR(255) NOT NULL, client_company_id BIGINT NULL, client_contact_id BIGINT NULL, raised_by_csr BOOLEAN NOT NULL DEFAULT FALSE, assigned_csr_id BIGINT NULL, bridge_person_id BIGINT NULL, assigned_developer_id BIGINT NULL, assigned_qa_id BIGINT NULL, sprint_id BIGINT NULL, linked_dev_task_id VARCHAR(100) NULL, sla_response_breached BOOLEAN NOT NULL DEFAULT FALSE, sla_resolution_breached BOOLEAN NOT NULL DEFAULT FALSE, sla_paused_at TIMESTAMP NULL, first_responded_at TIMESTAMP NULL, resolved_at TIMESTAMP NULL, deployed_at TIMESTAMP NULL, closed_at TIMESTAMP NULL, reopened_count INTEGER NOT NULL DEFAULT 0, csat_score SMALLINT NULL, csat_comment TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TIMESTAMP NULL, CONSTRAINT uq_tickets_ticket_id UNIQUE (ticket_id), CONSTRAINT fk_tickets_status FOREIGN KEY (status_id) REFERENCES ticket_statuses (id), CONSTRAINT fk_tickets_priority FOREIGN KEY (priority_id) REFERENCES ticket_priorities (id), CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES ticket_categories (id), CONSTRAINT fk_tickets_channel FOREIGN KEY (intake_channel_id) REFERENCES intake_channels (id), CONSTRAINT fk_tickets_company FOREIGN KEY (client_company_id) REFERENCES client_companies (id), CONSTRAINT fk_tickets_contact FOREIGN KEY (client_contact_id) REFERENCES client_contacts (id), CONSTRAINT fk_tickets_csr FOREIGN KEY (assigned_csr_id) REFERENCES users (id), CONSTRAINT fk_tickets_bridge FOREIGN KEY (bridge_person_id) REFERENCES users (id), CONSTRAINT fk_tickets_developer FOREIGN KEY (assigned_developer_id) REFERENCES users (id), CONSTRAINT fk_tickets_qa FOREIGN KEY (assigned_qa_id) REFERENCES users (id), CONSTRAINT fk_tickets_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id), CONSTRAINT chk_tickets_csat_score CHECK (csat_score IS NULL OR (csat_score BETWEEN 1 AND 5)));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_tag_map (ticket_id BIGINT NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (ticket_id, tag_id), CONSTRAINT fk_ttm_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, CONSTRAINT fk_ttm_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE);");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_comments (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, author_id BIGINT NOT NULL, content TEXT NOT NULL, comment_type VARCHAR(30) NOT NULL CHECK (comment_type IN ('Client_Facing','Internal_Note','System')), channel VARCHAR(20) NOT NULL DEFAULT 'Email' CHECK (channel IN ('Email','WhatsApp','Phone','Portal','Internal')), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_ticket_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_ticket_comments_author FOREIGN KEY (author_id) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_attachments (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, comment_id BIGINT NULL, file_name VARCHAR(255) NOT NULL, file_path VARCHAR(500) NOT NULL, file_size INTEGER NOT NULL, mime_type VARCHAR(100) NULL, uploaded_by BIGINT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_ticket_attachments_comment FOREIGN KEY (comment_id) REFERENCES ticket_comments (id), CONSTRAINT fk_ticket_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_emails (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, comment_id BIGINT NULL, message_id VARCHAR(255) NULL, in_reply_to VARCHAR(255) NULL, from_email VARCHAR(255) NOT NULL, to_email VARCHAR(255) NOT NULL, cc_emails TEXT NULL, subject VARCHAR(255) NOT NULL, body_html TEXT NULL, body_text TEXT NULL, direction VARCHAR(10) NOT NULL CHECK (direction IN ('Inbound','Outbound')), sent_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_ticket_emails_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_ticket_emails_comment FOREIGN KEY (comment_id) REFERENCES ticket_comments (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_sla_logs (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, sla_type VARCHAR(20) NOT NULL CHECK (sla_type IN ('First_Response','Resolution')), target_minutes INTEGER NOT NULL, start_time TIMESTAMP NOT NULL, end_time TIMESTAMP NULL, paused_at TIMESTAMP NULL, resumed_at TIMESTAMP NULL, paused_duration INTEGER NOT NULL DEFAULT 0, breached BOOLEAN NOT NULL DEFAULT FALSE, breached_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_sla_logs_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_status_history (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, old_status_id INTEGER NULL, new_status_id INTEGER NOT NULL, changed_by BIGINT NOT NULL, note VARCHAR(255) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_status_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_status_history_old FOREIGN KEY (old_status_id) REFERENCES ticket_statuses (id), CONSTRAINT fk_status_history_new FOREIGN KEY (new_status_id) REFERENCES ticket_statuses (id), CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_assignments (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, assigned_to BIGINT NOT NULL, role VARCHAR(20) NOT NULL CHECK (role IN ('CSR','Bridge','Developer','QA')), assigned_by BIGINT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_ticket_assignments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_ticket_assignments_to FOREIGN KEY (assigned_to) REFERENCES users (id), CONSTRAINT fk_ticket_assignments_by FOREIGN KEY (assigned_by) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS ticket_watchers (ticket_id BIGINT NOT NULL, user_id BIGINT NOT NULL, added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (ticket_id, user_id), CONSTRAINT fk_watchers_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, CONSTRAINT fk_watchers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE);");

            DB::unprepared("CREATE TABLE IF NOT EXISTS csat_surveys (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NOT NULL, token CHAR(64) NOT NULL, sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL, responded_at TIMESTAMP NULL, score SMALLINT NULL, comment VARCHAR(500) NULL, CONSTRAINT uq_csat_surveys_token UNIQUE (token), CONSTRAINT uq_csat_surveys_ticket UNIQUE (ticket_id), CONSTRAINT fk_csat_surveys_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT chk_csat_score CHECK (score IS NULL OR (score BETWEEN 1 AND 5)));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS sprint_tickets (sprint_id BIGINT NOT NULL, ticket_id BIGINT NOT NULL, added_by BIGINT NOT NULL, added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (sprint_id, ticket_id), CONSTRAINT fk_sprint_tickets_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id), CONSTRAINT fk_sprint_tickets_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_sprint_tickets_user FOREIGN KEY (added_by) REFERENCES users (id));");

            DB::unprepared("CREATE TABLE IF NOT EXISTS knowledge_base_articles (id BIGSERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, category VARCHAR(100) NULL, status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')), author_id BIGINT NOT NULL, approved_by BIGINT NULL, approved_at TIMESTAMP NULL, view_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_kb_articles_author FOREIGN KEY (author_id) REFERENCES users (id), CONSTRAINT fk_kb_articles_approver FOREIGN KEY (approved_by) REFERENCES users (id));");

            // Full-text search index for Postgres
            DB::unprepared("CREATE INDEX IF NOT EXISTS ft_kb_articles ON knowledge_base_articles USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))); ");

            DB::unprepared("CREATE TABLE IF NOT EXISTS kb_article_tag_map (article_id BIGINT NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (article_id, tag_id), CONSTRAINT fk_kb_tag_map_article FOREIGN KEY (article_id) REFERENCES knowledge_base_articles (id) ON DELETE CASCADE, CONSTRAINT fk_kb_tag_map_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE);");

            DB::unprepared("CREATE TABLE IF NOT EXISTS kb_article_ticket_map (article_id BIGINT NOT NULL, ticket_id BIGINT NOT NULL, linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (article_id, ticket_id), CONSTRAINT fk_kb_ticket_map_article FOREIGN KEY (article_id) REFERENCES knowledge_base_articles (id) ON DELETE CASCADE, CONSTRAINT fk_kb_ticket_map_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE);");

            DB::unprepared("CREATE TABLE IF NOT EXISTS audit_logs (id BIGSERIAL PRIMARY KEY, ticket_id BIGINT NULL, user_id BIGINT NOT NULL, action VARCHAR(255) NOT NULL, description TEXT NULL, old_values JSONB NULL, new_values JSONB NULL, ip_address VARCHAR(45) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_audit_logs_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id), CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id));");

            // Indexes (Postgres does not auto-create indexes on FK columns, unlike MySQL InnoDB)
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_client_companies_name ON client_companies (name);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_client_contacts_company ON client_contacts (client_company_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_users_company ON users (client_company_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints (status);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints (start_date, end_date);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets (category_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets (client_company_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_csr ON tickets (assigned_csr_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_bridge ON tickets (bridge_person_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_developer ON tickets (assigned_developer_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_qa ON tickets (assigned_qa_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_sprint ON tickets (sprint_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets (resolved_at);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON tickets (closed_at);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_tag_map_tag ON ticket_tag_map (tag_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_comments_author ON ticket_comments (author_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment ON ticket_attachments (comment_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_emails_ticket ON ticket_emails (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_emails_message_id ON ticket_emails (message_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_sla_logs_ticket ON ticket_sla_logs (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_sla_logs_breached ON ticket_sla_logs (breached);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_status_history_ticket ON ticket_status_history (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket ON ticket_assignments (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_ticket_assignments_user ON ticket_assignments (assigned_to);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON knowledge_base_articles (status);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_kb_tag_map_tag ON kb_article_tag_map (tag_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket ON audit_logs (ticket_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);");
            DB::unprepared("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);");

        } else {
            // MySQL / MariaDB DDL (original)
            DB::unprepared("SET FOREIGN_KEY_CHECKS = 0;");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_statuses` (
                `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(50)  NOT NULL,
                `description` VARCHAR(255) NULL,
                UNIQUE KEY `uq_ticket_statuses_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_priorities` (
                `id`                      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name`                    VARCHAR(20)  NOT NULL,
                `response_time_minutes`   INT UNSIGNED NOT NULL,
                `resolution_time_minutes` INT UNSIGNED NOT NULL,
                `sort_order`              TINYINT UNSIGNED NOT NULL DEFAULT 0,
                UNIQUE KEY `uq_ticket_priorities_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_categories` (
                `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(50)  NOT NULL,
                UNIQUE KEY `uq_ticket_categories_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `intake_channels` (
                `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(50)  NOT NULL,
                UNIQUE KEY `uq_intake_channels_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `client_companies` (
                `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name`          VARCHAR(255)    NOT NULL,
                `primary_email` VARCHAR(255)    NULL,
                `phone`         VARCHAR(50)     NULL,
                `is_vip`        BOOLEAN         NOT NULL DEFAULT FALSE,
                `notes`         TEXT            NULL,
                `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_client_companies_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `client_contacts` (
                `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `client_company_id` BIGINT UNSIGNED NOT NULL,
                `name`              VARCHAR(255)    NOT NULL,
                `email`             VARCHAR(255)    NOT NULL,
                `phone`             VARCHAR(50)     NULL,
                `is_primary`        BOOLEAN         NOT NULL DEFAULT FALSE,
                `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_client_contacts_email` (`email`),
                INDEX `idx_client_contacts_company` (`client_company_id`),
                CONSTRAINT `fk_client_contacts_company`
                    FOREIGN KEY (`client_company_id`) REFERENCES `client_companies` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `users` (
                `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name`              VARCHAR(255)    NOT NULL,
                `email`             VARCHAR(255)    NOT NULL,
                `email_verified_at` TIMESTAMP       NULL,
                `password`          VARCHAR(255)    NOT NULL,
                `role`              ENUM('Client','CSR','Bridge','Developer','QA','Admin') NOT NULL DEFAULT 'Client',
                `client_company_id` BIGINT UNSIGNED NULL,
                `client_contact_id` BIGINT UNSIGNED NULL,
                `is_vip`            BOOLEAN         NOT NULL DEFAULT FALSE,
                `is_active`         BOOLEAN         NOT NULL DEFAULT TRUE,
                `remember_token`    VARCHAR(100)    NULL,
                `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_users_email` (`email`),
                INDEX `idx_users_role` (`role`),
                INDEX `idx_users_company` (`client_company_id`),
                CONSTRAINT `fk_users_company`
                    FOREIGN KEY (`client_company_id`) REFERENCES `client_companies` (`id`),
                CONSTRAINT `fk_users_contact`
                    FOREIGN KEY (`client_contact_id`) REFERENCES `client_contacts` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `tags` (
                `id`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(100)    NOT NULL,
                UNIQUE KEY `uq_tags_name` (`name`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `sprints` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name`        VARCHAR(100)    NOT NULL,
                `start_date`  DATE            NOT NULL,
                `end_date`    DATE            NOT NULL,
                `status`      ENUM('Planned','Active','Completed') NOT NULL DEFAULT 'Planned',
                `notes`       TEXT            NULL,
                `created_by`  BIGINT UNSIGNED NOT NULL,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_sprints_status` (`status`),
                INDEX `idx_sprints_dates` (`start_date`, `end_date`),
                CONSTRAINT `fk_sprints_created_by`
                    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `tickets` (
                `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`               VARCHAR(50)     NOT NULL,
                `title`                   VARCHAR(255)    NOT NULL,
                `description`             TEXT            NOT NULL,
                `status_id`               INT UNSIGNED    NOT NULL,
                `priority_id`             INT UNSIGNED    NOT NULL,
                `category_id`             INT UNSIGNED    NOT NULL,
                `intake_channel_id`       INT UNSIGNED    NOT NULL,
                `contact_email`           VARCHAR(255)    NOT NULL,
                `client_company_id`       BIGINT UNSIGNED NULL,
                `client_contact_id`       BIGINT UNSIGNED NULL,
                `raised_by_csr`           BOOLEAN         NOT NULL DEFAULT FALSE,
                `assigned_csr_id`         BIGINT UNSIGNED NULL,
                `bridge_person_id`        BIGINT UNSIGNED NULL,
                `assigned_developer_id`   BIGINT UNSIGNED NULL,
                `assigned_qa_id`          BIGINT UNSIGNED NULL,
                `sprint_id`               BIGINT UNSIGNED NULL,
                `linked_dev_task_id`      VARCHAR(100)    NULL,
                `sla_response_breached`   BOOLEAN         NOT NULL DEFAULT FALSE,
                `sla_resolution_breached` BOOLEAN         NOT NULL DEFAULT FALSE,
                `sla_paused_at`           TIMESTAMP       NULL,
                `first_responded_at`      TIMESTAMP       NULL,
                `resolved_at`             TIMESTAMP       NULL,
                `deployed_at`             TIMESTAMP       NULL,
                `closed_at`               TIMESTAMP       NULL,
                `reopened_count`          INT UNSIGNED    NOT NULL DEFAULT 0,
                `csat_score`              TINYINT UNSIGNED NULL,
                `csat_comment`            TEXT             NULL,
                `created_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `deleted_at`              TIMESTAMP       NULL,
                UNIQUE KEY `uq_tickets_ticket_id` (`ticket_id`),
                INDEX `idx_tickets_status`      (`status_id`),
                INDEX `idx_tickets_priority`    (`priority_id`),
                INDEX `idx_tickets_category`    (`category_id`),
                INDEX `idx_tickets_company`     (`client_company_id`),
                INDEX `idx_tickets_csr`         (`assigned_csr_id`),
                INDEX `idx_tickets_bridge`      (`bridge_person_id`),
                INDEX `idx_tickets_developer`   (`assigned_developer_id`),
                INDEX `idx_tickets_qa`          (`assigned_qa_id`),
                INDEX `idx_tickets_sprint`      (`sprint_id`),
                INDEX `idx_tickets_created_at`  (`created_at`),
                INDEX `idx_tickets_resolved_at` (`resolved_at`),
                INDEX `idx_tickets_closed_at`   (`closed_at`),
                CONSTRAINT `fk_tickets_status`
                    FOREIGN KEY (`status_id`)            REFERENCES `ticket_statuses`  (`id`),
                CONSTRAINT `fk_tickets_priority`
                    FOREIGN KEY (`priority_id`)           REFERENCES `ticket_priorities` (`id`),
                CONSTRAINT `fk_tickets_category`
                    FOREIGN KEY (`category_id`)           REFERENCES `ticket_categories` (`id`),
                CONSTRAINT `fk_tickets_channel`
                    FOREIGN KEY (`intake_channel_id`)     REFERENCES `intake_channels`   (`id`),
                CONSTRAINT `fk_tickets_company`
                    FOREIGN KEY (`client_company_id`)     REFERENCES `client_companies`  (`id`),
                CONSTRAINT `fk_tickets_contact`
                    FOREIGN KEY (`client_contact_id`)     REFERENCES `client_contacts`   (`id`),
                CONSTRAINT `fk_tickets_csr`
                    FOREIGN KEY (`assigned_csr_id`)       REFERENCES `users`             (`id`),
                CONSTRAINT `fk_tickets_bridge`
                    FOREIGN KEY (`bridge_person_id`)      REFERENCES `users`             (`id`),
                CONSTRAINT `fk_tickets_developer`
                    FOREIGN KEY (`assigned_developer_id`) REFERENCES `users`             (`id`),
                CONSTRAINT `fk_tickets_qa`
                    FOREIGN KEY (`assigned_qa_id`)        REFERENCES `users`             (`id`),
                CONSTRAINT `fk_tickets_sprint`
                    FOREIGN KEY (`sprint_id`)             REFERENCES `sprints`           (`id`),
                CONSTRAINT `chk_tickets_csat_score`
                    CHECK (`csat_score` BETWEEN 1 AND 5)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_tag_map` (
                `ticket_id` BIGINT UNSIGNED NOT NULL,
                `tag_id`    BIGINT UNSIGNED NOT NULL,
                PRIMARY KEY (`ticket_id`, `tag_id`),
                INDEX `idx_ticket_tag_map_tag` (`tag_id`),
                CONSTRAINT `fk_ttm_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_ttm_tag`
                    FOREIGN KEY (`tag_id`)    REFERENCES `tags`    (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_comments` (
                `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`    BIGINT UNSIGNED NOT NULL,
                `author_id`    BIGINT UNSIGNED NOT NULL,
                `content`      TEXT            NOT NULL,
                `comment_type` ENUM('Client_Facing','Internal_Note','System') NOT NULL,
                `channel`      ENUM('Email','WhatsApp','Phone','Portal','Internal') NOT NULL DEFAULT 'Email',
                `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_ticket_comments_ticket` (`ticket_id`),
                INDEX `idx_ticket_comments_author` (`author_id`),
                CONSTRAINT `fk_ticket_comments_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
                CONSTRAINT `fk_ticket_comments_author`
                    FOREIGN KEY (`author_id`) REFERENCES `users`   (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_attachments` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`   BIGINT UNSIGNED NOT NULL,
                `comment_id`  BIGINT UNSIGNED NULL,
                `file_name`   VARCHAR(255)    NOT NULL,
                `file_path`   VARCHAR(500)    NOT NULL,
                `file_size`   INT UNSIGNED    NOT NULL,
                `mime_type`   VARCHAR(100)    NULL,
                `uploaded_by` BIGINT UNSIGNED NOT NULL,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_ticket_attachments_ticket`  (`ticket_id`),
                INDEX `idx_ticket_attachments_comment` (`comment_id`),
                CONSTRAINT `fk_ticket_attachments_ticket`
                    FOREIGN KEY (`ticket_id`)   REFERENCES `tickets`         (`id`),
                CONSTRAINT `fk_ticket_attachments_comment`
                    FOREIGN KEY (`comment_id`)  REFERENCES `ticket_comments` (`id`),
                CONSTRAINT `fk_ticket_attachments_uploader`
                    FOREIGN KEY (`uploaded_by`) REFERENCES `users`           (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_emails` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`   BIGINT UNSIGNED NOT NULL,
                `comment_id`  BIGINT UNSIGNED NULL,
                `message_id`  VARCHAR(255)    NULL,
                `in_reply_to` VARCHAR(255)    NULL,
                `from_email`  VARCHAR(255)    NOT NULL,
                `to_email`    VARCHAR(255)    NOT NULL,
                `cc_emails`   TEXT            NULL,
                `subject`     VARCHAR(255)    NOT NULL,
                `body_html`   MEDIUMTEXT      NULL,
                `body_text`   MEDIUMTEXT      NULL,
                `direction`   ENUM('Inbound','Outbound') NOT NULL,
                `sent_at`     TIMESTAMP       NULL,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_ticket_emails_ticket`     (`ticket_id`),
                INDEX `idx_ticket_emails_message_id` (`message_id`),
                CONSTRAINT `fk_ticket_emails_ticket`
                    FOREIGN KEY (`ticket_id`)  REFERENCES `tickets`         (`id`),
                CONSTRAINT `fk_ticket_emails_comment`
                    FOREIGN KEY (`comment_id`) REFERENCES `ticket_comments` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_sla_logs` (
                `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`       BIGINT UNSIGNED NOT NULL,
                `sla_type`        ENUM('First_Response','Resolution') NOT NULL,
                `target_minutes`  INT UNSIGNED    NOT NULL,
                `start_time`      TIMESTAMP       NOT NULL,
                `end_time`        TIMESTAMP       NULL,
                `paused_at`       TIMESTAMP       NULL,
                `resumed_at`      TIMESTAMP       NULL,
                `paused_duration` INT UNSIGNED    NOT NULL DEFAULT 0,
                `breached`        BOOLEAN         NOT NULL DEFAULT FALSE,
                `breached_at`     TIMESTAMP       NULL,
                `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_sla_logs_ticket`   (`ticket_id`),
                INDEX `idx_sla_logs_breached` (`breached`),
                CONSTRAINT `fk_sla_logs_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_status_history` (
                `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`     BIGINT UNSIGNED NOT NULL,
                `old_status_id` INT UNSIGNED    NULL,
                `new_status_id` INT UNSIGNED    NOT NULL,
                `changed_by`    BIGINT UNSIGNED NOT NULL,
                `note`          VARCHAR(255)    NULL,
                `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_status_history_ticket` (`ticket_id`),
                CONSTRAINT `fk_status_history_ticket`
                    FOREIGN KEY (`ticket_id`)     REFERENCES `tickets`         (`id`),
                CONSTRAINT `fk_status_history_old`
                    FOREIGN KEY (`old_status_id`) REFERENCES `ticket_statuses` (`id`),
                CONSTRAINT `fk_status_history_new`
                    FOREIGN KEY (`new_status_id`) REFERENCES `ticket_statuses` (`id`),
                CONSTRAINT `fk_status_history_user`
                    FOREIGN KEY (`changed_by`)    REFERENCES `users`           (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_assignments` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`   BIGINT UNSIGNED NOT NULL,
                `assigned_to` BIGINT UNSIGNED NOT NULL,
                `role`        ENUM('CSR','Bridge','Developer','QA') NOT NULL,
                `assigned_by` BIGINT UNSIGNED NOT NULL,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_ticket_assignments_ticket` (`ticket_id`),
                INDEX `idx_ticket_assignments_user`   (`assigned_to`),
                CONSTRAINT `fk_ticket_assignments_ticket`
                    FOREIGN KEY (`ticket_id`)   REFERENCES `tickets` (`id`),
                CONSTRAINT `fk_ticket_assignments_to`
                    FOREIGN KEY (`assigned_to`) REFERENCES `users`   (`id`),
                CONSTRAINT `fk_ticket_assignments_by`
                    FOREIGN KEY (`assigned_by`) REFERENCES `users`   (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `ticket_watchers` (
                `ticket_id` BIGINT UNSIGNED NOT NULL,
                `user_id`   BIGINT UNSIGNED NOT NULL,
                `added_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`ticket_id`, `user_id`),
                CONSTRAINT `fk_watchers_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_watchers_user`
                    FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `csat_surveys` (
                `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`    BIGINT UNSIGNED NOT NULL,
                `token`        CHAR(64)        NOT NULL,
                `sent_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `expires_at`   DATETIME        NOT NULL,
                `responded_at` TIMESTAMP       NULL,
                `score`        TINYINT UNSIGNED NULL,
                `comment`      VARCHAR(500)    NULL,
                UNIQUE KEY `uq_csat_surveys_token`  (`token`),
                UNIQUE KEY `uq_csat_surveys_ticket` (`ticket_id`),
                CONSTRAINT `fk_csat_surveys_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
                CONSTRAINT `chk_csat_score`
                    CHECK (`score` BETWEEN 1 AND 5)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `sprint_tickets` (
                `sprint_id` BIGINT UNSIGNED NOT NULL,
                `ticket_id` BIGINT UNSIGNED NOT NULL,
                `added_by`  BIGINT UNSIGNED NOT NULL,
                `added_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`sprint_id`, `ticket_id`),
                CONSTRAINT `fk_sprint_tickets_sprint`
                    FOREIGN KEY (`sprint_id`) REFERENCES `sprints`  (`id`),
                CONSTRAINT `fk_sprint_tickets_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`  (`id`),
                CONSTRAINT `fk_sprint_tickets_user`
                    FOREIGN KEY (`added_by`)  REFERENCES `users`    (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `knowledge_base_articles` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `title`       VARCHAR(255)    NOT NULL,
                `content`     MEDIUMTEXT      NOT NULL,
                `category`    VARCHAR(100)    NULL,
                `status`      ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Draft',
                `author_id`   BIGINT UNSIGNED NOT NULL,
                `approved_by` BIGINT UNSIGNED NULL,
                `approved_at` TIMESTAMP       NULL,
                `view_count`  INT UNSIGNED    NOT NULL DEFAULT 0,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_kb_articles_status` (`status`),
                FULLTEXT INDEX `ft_kb_articles` (`title`, `content`),
                CONSTRAINT `fk_kb_articles_author`
                    FOREIGN KEY (`author_id`)   REFERENCES `users` (`id`),
                CONSTRAINT `fk_kb_articles_approver`
                    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `kb_article_tag_map` (
                `article_id` BIGINT UNSIGNED NOT NULL,
                `tag_id`     BIGINT UNSIGNED NOT NULL,
                PRIMARY KEY (`article_id`, `tag_id`),
                INDEX `idx_kb_tag_map_tag` (`tag_id`),
                CONSTRAINT `fk_kb_tag_map_article`
                    FOREIGN KEY (`article_id`) REFERENCES `knowledge_base_articles` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_kb_tag_map_tag`
                    FOREIGN KEY (`tag_id`)     REFERENCES `tags`                    (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `kb_article_ticket_map` (
                `article_id` BIGINT UNSIGNED NOT NULL,
                `ticket_id`  BIGINT UNSIGNED NOT NULL,
                `linked_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`article_id`, `ticket_id`),
                CONSTRAINT `fk_kb_ticket_map_article`
                    FOREIGN KEY (`article_id`) REFERENCES `knowledge_base_articles` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_kb_ticket_map_ticket`
                    FOREIGN KEY (`ticket_id`)  REFERENCES `tickets`                 (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("
            CREATE TABLE IF NOT EXISTS `audit_logs` (
                `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `ticket_id`   BIGINT UNSIGNED NULL,
                `user_id`     BIGINT UNSIGNED NOT NULL,
                `action`      VARCHAR(255)    NOT NULL,
                `description` TEXT            NULL,
                `old_values`  JSON            NULL,
                `new_values`  JSON            NULL,
                `ip_address`  VARCHAR(45)     NULL,
                `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_audit_logs_ticket`     (`ticket_id`),
                INDEX `idx_audit_logs_user`       (`user_id`),
                INDEX `idx_audit_logs_action`     (`action`),
                INDEX `idx_audit_logs_created_at` (`created_at`),
                CONSTRAINT `fk_audit_logs_ticket`
                    FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
                CONSTRAINT `fk_audit_logs_user`
                    FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`)
            ) ENGINE=InnoDB;
        ");

            DB::unprepared("SET FOREIGN_KEY_CHECKS = 1;");
        }
        DB::table('ticket_statuses')->insertOrIgnore([
            ['name' => 'New',                  'description' => 'Ticket just created'],
            ['name' => 'Open',                 'description' => 'Assigned and being worked on'],
            ['name' => 'Waiting for Client',   'description' => 'Waiting on client response (SLA paused)'],
            ['name' => 'Resolved',             'description' => 'Solution provided'],
            ['name' => 'Escalated to Dev',     'description' => 'Needs developer attention'],
            ['name' => 'Under Review',         'description' => 'Being reviewed'],
            ['name' => 'Deferred to Sprint',   'description' => 'Scheduled for a sprint'],
            ['name' => 'In Development',       'description' => 'Developer is working on it'],
            ['name' => 'In QA/Testing',        'description' => 'QA is testing'],
            ['name' => 'Ready for Deployment', 'description' => 'Ready to deploy'],
            ['name' => 'Deployed',             'description' => 'Fix deployed to production'],
            ['name' => 'Closed',               'description' => 'Ticket closed'],
            ['name' => 'Reopened',             'description' => 'Ticket reopened after closing'],
        ]);

        DB::table('ticket_priorities')->insertOrIgnore([
            ['name' => 'Critical', 'response_time_minutes' => 30,  'resolution_time_minutes' => 240,  'sort_order' => 1],
            ['name' => 'High',     'response_time_minutes' => 60,  'resolution_time_minutes' => 480,  'sort_order' => 2],
            ['name' => 'Medium',   'response_time_minutes' => 240, 'resolution_time_minutes' => 1440, 'sort_order' => 3],
            ['name' => 'Low',      'response_time_minutes' => 480, 'resolution_time_minutes' => 2880, 'sort_order' => 4],
        ]);

        DB::table('ticket_categories')->insertOrIgnore([
            ['name' => 'Bug Report'],
            ['name' => 'Feature Request'],
            ['name' => 'Service Request'],
            ['name' => 'Complaint'],
            ['name' => 'General Inquiry'],
            ['name' => 'Other'],
        ]);

        DB::table('intake_channels')->insertOrIgnore([
            ['name' => 'Email'],
            ['name' => 'Web Form'],
            ['name' => 'Phone'],
            ['name' => 'WhatsApp'],
            ['name' => 'Walk-in'],
        ]);
    }

    public function down(): void
    {
        $driver = DB::getPdo()->getAttribute(PDO::ATTR_DRIVER_NAME);

        $tables = [
            'audit_logs', 'kb_article_ticket_map', 'kb_article_tag_map',
            'knowledge_base_articles', 'sprint_tickets', 'csat_surveys',
            'ticket_watchers', 'ticket_assignments', 'ticket_status_history',
            'ticket_sla_logs', 'ticket_emails', 'ticket_attachments',
            'ticket_comments', 'ticket_tag_map', 'tickets', 'sprints',
            'tags', 'users', 'client_contacts', 'client_companies',
            'intake_channels', 'ticket_categories', 'ticket_priorities', 'ticket_statuses',
        ];

        if ($driver === 'pgsql') {
            foreach ($tables as $table) {
                DB::unprepared("DROP TABLE IF EXISTS {$table} CASCADE;");
            }
        } else {
            DB::unprepared("SET FOREIGN_KEY_CHECKS = 0;");
            foreach ($tables as $table) {
                DB::unprepared("DROP TABLE IF EXISTS `{$table}`;");
            }
            DB::unprepared("SET FOREIGN_KEY_CHECKS = 1;");
        }
    }
};
