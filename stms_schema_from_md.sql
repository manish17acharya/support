-- =============================================================================
-- SUPPORT TICKET MANAGEMENT SYSTEM (STMS)
-- MySQL Schema — Version 2.0
-- Based on SRS v1.0 (April 2026)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- =============================================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES
-- =============================================================================

CREATE TABLE `ticket_statuses` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(50)  NOT NULL,
    `description` VARCHAR(255) NULL,
    UNIQUE KEY `uq_ticket_statuses_name` (`name`)
) ENGINE=InnoDB COMMENT='Valid lifecycle statuses for tickets';

-- Seed data (application layer should insert these on first run):
-- New | Open | Waiting for Client | Resolved | Escalated to Dev
-- Under Review | Deferred to Sprint | In Development | In QA/Testing
-- Ready for Deployment | Deployed | Closed | Reopened

-- ---------------------------------------------------------------------------

CREATE TABLE `ticket_priorities` (
    `id`                      INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`                    VARCHAR(20)      NOT NULL,
    `response_time_minutes`   INT UNSIGNED     NOT NULL COMMENT 'SLA: first response target',
    `resolution_time_minutes` INT UNSIGNED     NOT NULL COMMENT 'SLA: full resolution target',
    `sort_order`              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY `uq_ticket_priorities_name` (`name`)
) ENGINE=InnoDB COMMENT='Priority levels with SLA targets (Critical/High/Medium/Low)';

-- ---------------------------------------------------------------------------

CREATE TABLE `ticket_categories` (
    `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50)  NOT NULL,
    UNIQUE KEY `uq_ticket_categories_name` (`name`)
) ENGINE=InnoDB COMMENT='Bug Report | Feature Request | Service Request | Complaint | General Inquiry | Other';

-- ---------------------------------------------------------------------------

CREATE TABLE `intake_channels` (
    `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50)  NOT NULL,
    UNIQUE KEY `uq_intake_channels_name` (`name`)
) ENGINE=InnoDB COMMENT='Email | Web Form | Phone | WhatsApp | Walk-in';

-- =============================================================================
-- SECTION 2: COMPANIES & CONTACTS
-- =============================================================================

CREATE TABLE `client_companies` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`          VARCHAR(255)    NOT NULL,
    `primary_email` VARCHAR(255)    NULL,
    `phone`         VARCHAR(50)     NULL,
    `is_vip`        BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'VIP flag enables WhatsApp channel',
    `notes`         TEXT            NULL,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_client_companies_name` (`name`)
) ENGINE=InnoDB COMMENT='Client organisations';

-- ---------------------------------------------------------------------------

CREATE TABLE `client_contacts` (
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
) ENGINE=InnoDB COMMENT='Individual contacts within a client company';

-- =============================================================================
-- SECTION 3: USERS
-- =============================================================================

CREATE TABLE `users` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`              VARCHAR(255)    NOT NULL,
    `email`             VARCHAR(255)    NOT NULL,
    `email_verified_at` TIMESTAMP       NULL,
    `password`          VARCHAR(255)    NOT NULL,
    `role`              ENUM(
                            'Client',
                            'CSR',
                            'Bridge',
                            'Developer',
                            'QA',
                            'Admin'
                        )               NOT NULL DEFAULT 'Client',
    `client_company_id` BIGINT UNSIGNED NULL     COMMENT 'Populated for Client-role users only',
    `client_contact_id` BIGINT UNSIGNED NULL     COMMENT 'Links portal login to a client_contacts record',
    `is_vip`            BOOLEAN         NOT NULL DEFAULT FALSE,
    `is_active`         BOOLEAN         NOT NULL DEFAULT TRUE,
    `remember_token`    VARCHAR(100)    NULL,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_users_email` (`email`),
    INDEX `idx_users_role`    (`role`),
    INDEX `idx_users_company` (`client_company_id`),
    CONSTRAINT `fk_users_company`
        FOREIGN KEY (`client_company_id`) REFERENCES `client_companies` (`id`),
    CONSTRAINT `fk_users_contact`
        FOREIGN KEY (`client_contact_id`) REFERENCES `client_contacts`  (`id`)
) ENGINE=InnoDB COMMENT='All system users across all roles';

-- =============================================================================
-- SECTION 4: TAGS
-- =============================================================================

CREATE TABLE `tags` (
    `id`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100)    NOT NULL,
    UNIQUE KEY `uq_tags_name` (`name`)
) ENGINE=InnoDB;

-- =============================================================================
-- SECTION 5: SPRINTS
-- =============================================================================

CREATE TABLE `sprints` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name`       VARCHAR(100)    NOT NULL COMMENT 'e.g. Sprint 14 / Q2-W3',
    `start_date` DATE            NOT NULL,
    `end_date`   DATE            NOT NULL,
    `status`     ENUM('Planned','Active','Completed') NOT NULL DEFAULT 'Planned',
    `notes`      TEXT            NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sprints_status` (`status`),
    INDEX `idx_sprints_dates`  (`start_date`, `end_date`),
    CONSTRAINT `fk_sprints_created_by`
        FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB COMMENT='Development sprints for sprint-deferred tickets (SRS §8.2)';

-- =============================================================================
-- SECTION 6: TICKETS
-- =============================================================================

CREATE TABLE `tickets` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` VARCHAR(50)     NOT NULL COMMENT 'SUP-YYYY-MMDD-NNN format',

    -- Core content
    `title`       VARCHAR(255) NOT NULL,
    `description` TEXT         NOT NULL,

    -- Classification
    `status_id`         INT UNSIGNED NOT NULL,
    `priority_id`       INT UNSIGNED NOT NULL,
    `category_id`       INT UNSIGNED NOT NULL,
    `intake_channel_id` INT UNSIGNED NOT NULL,

    -- Client linkage
    `contact_email`     VARCHAR(255)    NOT NULL COMMENT 'Primary address for email threading',
    `reply_to_email`    VARCHAR(255)    NULL     COMMENT 'Per-ticket inbound reply-to alias for email threading (e.g. ticket-001@support.company.com)',
    `client_company_id` BIGINT UNSIGNED NULL,
    `client_contact_id` BIGINT UNSIGNED NULL,
    `raised_by_csr`     BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'TRUE = CSR raised on behalf of client',

    -- Staff assignment
    `assigned_csr_id`       BIGINT UNSIGNED NULL,
    `bridge_person_id`      BIGINT UNSIGNED NULL,
    `assigned_developer_id` BIGINT UNSIGNED NULL,
    `assigned_qa_id`        BIGINT UNSIGNED NULL,

    -- Sprint linkage (SRS §8.2)
    `sprint_id` BIGINT UNSIGNED NULL COMMENT 'Set when ticket is Deferred to Sprint',

    -- Development task linkage (SRS §8.1)
    `linked_dev_task_id` VARCHAR(100) NULL COMMENT 'External PM system task reference',

    -- SLA state (summary — detail in ticket_sla_logs)
    `sla_response_breached`   BOOLEAN   NOT NULL DEFAULT FALSE,
    `sla_resolution_breached` BOOLEAN   NOT NULL DEFAULT FALSE,
    `sla_paused_at`           TIMESTAMP NULL     COMMENT 'Non-null while waiting for client',

    -- Key lifecycle timestamps
    `first_responded_at` TIMESTAMP    NULL,
    `resolved_at`        TIMESTAMP    NULL COMMENT 'Set when status → Resolved',
    `deployed_at`        TIMESTAMP    NULL COMMENT 'Set when status → Deployed',
    `closed_at`                   TIMESTAMP    NULL,
    `auto_close_warning_sent_at`  TIMESTAMP    NULL COMMENT 'Set when Day 2 auto-close reminder email is sent (§7.3)',
    `reopened_count`              INT UNSIGNED NOT NULL DEFAULT 0,

    -- CSAT (SRS §7.2) — detail in csat_surveys table
    `csat_score`   TINYINT UNSIGNED NULL,
    `csat_comment` TEXT             NULL,

    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL COMMENT 'Soft delete; tickets are never hard-deleted',

    UNIQUE KEY `uq_tickets_ticket_id`   (`ticket_id`),
    INDEX `idx_tickets_status`          (`status_id`),
    INDEX `idx_tickets_priority`        (`priority_id`),
    INDEX `idx_tickets_category`        (`category_id`),
    INDEX `idx_tickets_company`         (`client_company_id`),
    INDEX `idx_tickets_csr`             (`assigned_csr_id`),
    INDEX `idx_tickets_bridge`          (`bridge_person_id`),
    INDEX `idx_tickets_developer`       (`assigned_developer_id`),
    INDEX `idx_tickets_qa`              (`assigned_qa_id`),
    INDEX `idx_tickets_sprint`          (`sprint_id`),
    INDEX `idx_tickets_created_at`      (`created_at`),
    INDEX `idx_tickets_resolved_at`     (`resolved_at`),
    INDEX `idx_tickets_closed_at`       (`closed_at`),

    CONSTRAINT `fk_tickets_status`
        FOREIGN KEY (`status_id`)             REFERENCES `ticket_statuses`  (`id`),
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

) ENGINE=InnoDB COMMENT='Core ticket table — one row per support issue';

-- =============================================================================
-- SECTION 7: TICKET TAG MAP
-- =============================================================================

CREATE TABLE `ticket_tag_map` (
    `ticket_id` BIGINT UNSIGNED NOT NULL,
    `tag_id`    BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`ticket_id`, `tag_id`),
    INDEX `idx_ticket_tag_map_tag` (`tag_id`),
    CONSTRAINT `fk_ttm_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ttm_tag`
        FOREIGN KEY (`tag_id`)    REFERENCES `tags`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Many-to-many: tickets ↔ tags';

-- =============================================================================
-- SECTION 8: TICKET COMMENTS
-- =============================================================================

CREATE TABLE `ticket_comments` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`    BIGINT UNSIGNED NOT NULL,
    `author_id`    BIGINT UNSIGNED NOT NULL,
    `content`      TEXT            NOT NULL,
    `comment_type` ENUM(
                       'Client_Facing',
                       'Internal_Note',
                       'System'
                   )               NOT NULL,
    `channel`      ENUM(
                       'Email',
                       'WhatsApp',
                       'Phone',
                       'Portal',
                       'Internal'
                   )               NOT NULL DEFAULT 'Email'
                   COMMENT 'Communication channel this comment was delivered via',
    `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ticket_comments_ticket` (`ticket_id`),
    INDEX `idx_ticket_comments_author` (`author_id`),
    CONSTRAINT `fk_ticket_comments_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
    CONSTRAINT `fk_ticket_comments_author`
        FOREIGN KEY (`author_id`) REFERENCES `users`   (`id`)
) ENGINE=InnoDB COMMENT='All comments: client-facing replies, internal notes, and system messages';

-- =============================================================================
-- SECTION 9: TICKET ATTACHMENTS
-- =============================================================================

CREATE TABLE `ticket_attachments` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`   BIGINT UNSIGNED NOT NULL,
    `comment_id`  BIGINT UNSIGNED NULL     COMMENT 'Null if attached directly to ticket, not a comment',
    `file_name`   VARCHAR(255)    NOT NULL,
    `file_path`   VARCHAR(500)    NOT NULL,
    `file_size`   INT UNSIGNED    NOT NULL COMMENT 'Bytes; max 20 MB enforced at application layer',
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
) ENGINE=InnoDB COMMENT='Files attached to tickets or to specific comments';

-- =============================================================================
-- SECTION 10: EMAIL THREADING
-- =============================================================================

CREATE TABLE `ticket_emails` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`   BIGINT UNSIGNED NOT NULL,
    `comment_id`  BIGINT UNSIGNED NULL     COMMENT 'Links outbound email to the comment that triggered it',
    `message_id`  VARCHAR(255)    NULL     COMMENT 'RFC 2822 Message-ID header for thread matching',
    `in_reply_to` VARCHAR(255)    NULL     COMMENT 'RFC 2822 In-Reply-To for threading',
    `from_email`  VARCHAR(255)    NOT NULL,
    `to_email`    VARCHAR(255)    NOT NULL,
    `cc_emails`   TEXT            NULL     COMMENT 'Comma-separated CC addresses',
    `subject`     VARCHAR(255)    NOT NULL,
    `body_html`   MEDIUMTEXT      NULL,
    `body_text`   MEDIUMTEXT      NULL,
    `direction`   ENUM('Inbound','Outbound') NOT NULL,
    `sent_at`     TIMESTAMP       NULL     COMMENT 'Null until delivery confirmed',
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ticket_emails_ticket`     (`ticket_id`),
    INDEX `idx_ticket_emails_message_id` (`message_id`),
    CONSTRAINT `fk_ticket_emails_ticket`
        FOREIGN KEY (`ticket_id`)  REFERENCES `tickets`         (`id`),
    CONSTRAINT `fk_ticket_emails_comment`
        FOREIGN KEY (`comment_id`) REFERENCES `ticket_comments` (`id`)
) ENGINE=InnoDB COMMENT='Full email thread log for every ticket (SRS §5.1)';

-- =============================================================================
-- SECTION 11: SLA TRACKING
-- =============================================================================

CREATE TABLE `ticket_sla_logs` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`       BIGINT UNSIGNED NOT NULL,
    `sla_type`        ENUM('First_Response','Resolution') NOT NULL,
    `target_minutes`  INT UNSIGNED    NOT NULL COMMENT 'Copied from ticket_priorities at ticket creation',
    `start_time`      TIMESTAMP       NOT NULL,
    `end_time`        TIMESTAMP       NULL     COMMENT 'Null until SLA is met or breached',
    `paused_at`       TIMESTAMP       NULL,
    `resumed_at`      TIMESTAMP       NULL,
    `paused_duration` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Total seconds paused (Waiting for Client)',
    `breached`        BOOLEAN         NOT NULL DEFAULT FALSE,
    `breached_at`     TIMESTAMP       NULL,
    `warned_75pct_at` TIMESTAMP       NULL COMMENT 'Timestamp when 75% SLA elapsed warning was sent',
    `warned_90pct_at` TIMESTAMP       NULL COMMENT 'Timestamp when 90% SLA elapsed warning was sent',
    `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sla_logs_ticket`   (`ticket_id`),
    INDEX `idx_sla_logs_breached` (`breached`),
    CONSTRAINT `fk_sla_logs_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
) ENGINE=InnoDB COMMENT='SLA timer state — one row per SLA type per ticket (SRS §6)';

-- =============================================================================
-- SECTION 12: STATUS HISTORY
-- =============================================================================

CREATE TABLE `ticket_status_history` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`     BIGINT UNSIGNED NOT NULL,
    `old_status_id` INT UNSIGNED    NULL     COMMENT 'Null for the initial New status',
    `new_status_id` INT UNSIGNED    NOT NULL,
    `changed_by`    BIGINT UNSIGNED NOT NULL,
    `note`          VARCHAR(255)    NULL     COMMENT 'Optional reason for the transition',
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
) ENGINE=InnoDB COMMENT='Immutable log of every ticket status transition';

-- =============================================================================
-- SECTION 13: ASSIGNMENT HISTORY
-- =============================================================================

CREATE TABLE `ticket_assignments` (
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
) ENGINE=InnoDB COMMENT='Full assignment history — who was assigned, by whom, and when';

-- =============================================================================
-- SECTION 14: TICKET WATCHERS
-- =============================================================================

CREATE TABLE `ticket_watchers` (
    `ticket_id` BIGINT UNSIGNED NOT NULL,
    `user_id`   BIGINT UNSIGNED NOT NULL,
    `added_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`ticket_id`, `user_id`),
    CONSTRAINT `fk_watchers_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_watchers_user`
        FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Users who receive notifications on any ticket event (SRS §5.1.2)';

-- =============================================================================
-- SECTION 15: CSAT SURVEYS
-- (Secure no-login token link, 14-day expiry — SRS §7.2)
-- =============================================================================

CREATE TABLE `csat_surveys` (
    `id`           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`    BIGINT UNSIGNED  NOT NULL,
    `token`        CHAR(64)         NOT NULL COMMENT 'Cryptographically random UUID/token for no-login survey URL',
    `sent_at`      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at`   TIMESTAMP        NOT NULL COMMENT 'Defaults to 14 days after sent_at',
    `responded_at` TIMESTAMP        NULL,
    `score`        TINYINT UNSIGNED NULL,
    `comment`      VARCHAR(500)     NULL,
    UNIQUE KEY `uq_csat_surveys_token`  (`token`),
    UNIQUE KEY `uq_csat_surveys_ticket` (`ticket_id`) COMMENT 'One active survey per ticket',
    CONSTRAINT `fk_csat_surveys_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
    CONSTRAINT `chk_csat_score`
        CHECK (`score` BETWEEN 1 AND 5)
) ENGINE=InnoDB COMMENT='CSAT survey tokens and responses — no login required (SRS §7.2)';

-- =============================================================================
-- SECTION 16: SPRINT — TICKET LINKAGE
-- =============================================================================

CREATE TABLE `sprint_tickets` (
    `sprint_id` BIGINT UNSIGNED NOT NULL,
    `ticket_id` BIGINT UNSIGNED NOT NULL,
    `added_by`  BIGINT UNSIGNED NOT NULL,
    `added_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`sprint_id`, `ticket_id`),
    CONSTRAINT `fk_sprint_tickets_sprint`
        FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`),
    CONSTRAINT `fk_sprint_tickets_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
    CONSTRAINT `fk_sprint_tickets_user`
        FOREIGN KEY (`added_by`)  REFERENCES `users`   (`id`)
) ENGINE=InnoDB COMMENT='Tickets scheduled into development sprints (SRS §8.2)';

-- =============================================================================
-- SECTION 17: KNOWLEDGE BASE
-- =============================================================================

CREATE TABLE `knowledge_base_articles` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `title`       VARCHAR(255)    NOT NULL,
    `content`     MEDIUMTEXT      NOT NULL COMMENT 'Rich text (HTML or Markdown)',
    `category`    VARCHAR(100)    NULL,
    `status`      ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Draft',
    `author_id`   BIGINT UNSIGNED NOT NULL,
    `approved_by` BIGINT UNSIGNED NULL     COMMENT 'Admin who approved the article',
    `approved_at` TIMESTAMP       NULL,
    `view_count`  INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_kb_articles_status` (`status`),
    FULLTEXT INDEX `ft_kb_articles` (`title`, `content`) COMMENT 'Full-text search (SRS §9.2)',
    CONSTRAINT `fk_kb_articles_author`
        FOREIGN KEY (`author_id`)   REFERENCES `users` (`id`),
    CONSTRAINT `fk_kb_articles_approver`
        FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB COMMENT='Internal knowledge base articles (SRS §9)';

-- ---------------------------------------------------------------------------

CREATE TABLE `kb_article_tag_map` (
    `article_id` BIGINT UNSIGNED NOT NULL,
    `tag_id`     BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`article_id`, `tag_id`),
    INDEX `idx_kb_tag_map_tag` (`tag_id`),
    CONSTRAINT `fk_kb_tag_map_article`
        FOREIGN KEY (`article_id`) REFERENCES `knowledge_base_articles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_kb_tag_map_tag`
        FOREIGN KEY (`tag_id`)     REFERENCES `tags`                    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Many-to-many: KB articles ↔ tags';

-- ---------------------------------------------------------------------------

CREATE TABLE `kb_article_ticket_map` (
    `article_id` BIGINT UNSIGNED NOT NULL,
    `ticket_id`  BIGINT UNSIGNED NOT NULL,
    `linked_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`article_id`, `ticket_id`),
    CONSTRAINT `fk_kb_ticket_map_article`
        FOREIGN KEY (`article_id`) REFERENCES `knowledge_base_articles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_kb_ticket_map_ticket`
        FOREIGN KEY (`ticket_id`)  REFERENCES `tickets`                 (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Related Ticket IDs for KB articles (SRS §9.2)';

-- =============================================================================
-- SECTION 18: AUDIT LOG
-- =============================================================================

CREATE TABLE `audit_logs` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id`   BIGINT UNSIGNED NULL     COMMENT 'Null for non-ticket system actions',
    `user_id`     BIGINT UNSIGNED NOT NULL,
    `actor_name`  VARCHAR(255)    NOT NULL COMMENT 'Snapshot of user name at time of action (immutable record)',
    `actor_role`  VARCHAR(50)     NOT NULL COMMENT 'Snapshot of user role at time of action (immutable record)',
    `action`      VARCHAR(255)    NOT NULL COMMENT 'e.g. ticket.status_changed, ticket.comment_added',
    `description` TEXT            NULL,
    `old_values`  JSON            NULL,
    `new_values`  JSON            NULL,
    `ip_address`  VARCHAR(45)     NULL     COMMENT 'IPv4 or IPv6 of actor',
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_logs_ticket`     (`ticket_id`),
    INDEX `idx_audit_logs_user`       (`user_id`),
    INDEX `idx_audit_logs_action`     (`action`),
    INDEX `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
    CONSTRAINT `fk_audit_logs_user`
        FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`)
) ENGINE=InnoDB COMMENT='Immutable audit trail — 3-year retention required (SRS §11.5)';

-- =============================================================================
-- SECTION 19: STATUS TRANSITION RULES
-- Enforces valid status transitions per SRS §4.4
-- =============================================================================

CREATE TABLE `status_transitions` (
    `from_status_id` INT UNSIGNED NOT NULL,
    `to_status_id`   INT UNSIGNED NOT NULL,
    `allowed_roles`  SET('Client','CSR','Bridge','Developer','QA','Admin') NOT NULL,
    PRIMARY KEY (`from_status_id`, `to_status_id`),
    CONSTRAINT `fk_st_from`
        FOREIGN KEY (`from_status_id`) REFERENCES `ticket_statuses` (`id`),
    CONSTRAINT `fk_st_to`
        FOREIGN KEY (`to_status_id`)   REFERENCES `ticket_statuses` (`id`)
) ENGINE=InnoDB COMMENT='Allowed ticket status transitions and which roles may perform them (SRS §4.4)';

-- =============================================================================
-- SECTION 20: RE-ENABLE FK CHECKS
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- END OF SCHEMA
-- STMS v2.1 — Tables: 24 | Based on SRS v1.0 (April 2026)
-- =============================================================================
