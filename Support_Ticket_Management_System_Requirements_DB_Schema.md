\-- \=============================================================================  
\-- SUPPORT TICKET MANAGEMENT SYSTEM (STMS)  
\-- MySQL Schema — Version 2.0  
\-- Based on SRS v1.0 (April 2026\)  
\-- \=============================================================================

SET FOREIGN\_KEY\_CHECKS \= 0;  
SET NAMES utf8mb4;

\-- \=============================================================================  
\-- SECTION 1: LOOKUP / REFERENCE TABLES  
\-- \=============================================================================

CREATE TABLE \`ticket\_statuses\` (  
    \`id\`   INT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\` VARCHAR(50)  NOT NULL,  
    \`description\` VARCHAR(255) NULL,  
    UNIQUE KEY \`uq\_ticket\_statuses\_name\` (\`name\`)  
) ENGINE=InnoDB COMMENT='Valid lifecycle statuses for tickets';

\-- Seed data (application layer should insert these on first run):  
\-- New | Open | Waiting for Client | Resolved | Escalated to Dev  
\-- Under Review | Deferred to Sprint | In Development | In QA/Testing  
\-- Ready for Deployment | Deployed | Closed | Reopened

\-- \---------------------------------------------------------------------------

CREATE TABLE \`ticket\_priorities\` (  
    \`id\`                      INT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\`                    VARCHAR(20)  NOT NULL,  
    \`response\_time\_minutes\`   INT UNSIGNED NOT NULL COMMENT 'SLA: first response target',  
    \`resolution\_time\_minutes\` INT UNSIGNED NOT NULL COMMENT 'SLA: full resolution target',  
    \`sort\_order\`              TINYINT UNSIGNED NOT NULL DEFAULT 0,  
    UNIQUE KEY \`uq\_ticket\_priorities\_name\` (\`name\`)  
) ENGINE=InnoDB COMMENT='Priority levels with SLA targets (Critical/High/Medium/Low)';

\-- \---------------------------------------------------------------------------

CREATE TABLE \`ticket\_categories\` (  
    \`id\`   INT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\` VARCHAR(50)  NOT NULL,  
    UNIQUE KEY \`uq\_ticket\_categories\_name\` (\`name\`)  
) ENGINE=InnoDB COMMENT='Bug Report | Feature Request | Service Request | Complaint | General Inquiry | Other';

\-- \---------------------------------------------------------------------------

CREATE TABLE \`intake\_channels\` (  
    \`id\`   INT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\` VARCHAR(50)  NOT NULL,  
    UNIQUE KEY \`uq\_intake\_channels\_name\` (\`name\`)  
) ENGINE=InnoDB COMMENT='Email | Web Form | Phone | WhatsApp | Walk-in';

\-- \=============================================================================  
\-- SECTION 2: COMPANIES & CONTACTS  
\-- \=============================================================================

CREATE TABLE \`client\_companies\` (  
    \`id\`            BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\`          VARCHAR(255)    NOT NULL,  
    \`primary\_email\` VARCHAR(255)    NULL,  
    \`phone\`         VARCHAR(50)     NULL,  
    \`is\_vip\`        BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'VIP flag enables WhatsApp channel',  
    \`notes\`         TEXT            NULL,  
    \`created\_at\`    TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`    TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    INDEX \`idx\_client\_companies\_name\` (\`name\`)  
) ENGINE=InnoDB COMMENT='Client organisations';

\-- \---------------------------------------------------------------------------

CREATE TABLE \`client\_contacts\` (  
    \`id\`                BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`client\_company\_id\` BIGINT UNSIGNED NOT NULL,  
    \`name\`              VARCHAR(255)    NOT NULL,  
    \`email\`             VARCHAR(255)    NOT NULL,  
    \`phone\`             VARCHAR(50)     NULL,  
    \`is\_primary\`        BOOLEAN         NOT NULL DEFAULT FALSE,  
    \`created\_at\`        TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`        TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    UNIQUE KEY \`uq\_client\_contacts\_email\` (\`email\`),  
    INDEX \`idx\_client\_contacts\_company\` (\`client\_company\_id\`),  
    CONSTRAINT \`fk\_client\_contacts\_company\`  
        FOREIGN KEY (\`client\_company\_id\`) REFERENCES \`client\_companies\` (\`id\`)  
) ENGINE=InnoDB COMMENT='Individual contacts within a client company';

\-- \=============================================================================  
\-- SECTION 3: USERS  
\-- \=============================================================================

CREATE TABLE \`users\` (  
    \`id\`                BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\`              VARCHAR(255)    NOT NULL,  
    \`email\`             VARCHAR(255)    NOT NULL,  
    \`email\_verified\_at\` TIMESTAMP       NULL,  
    \`password\`          VARCHAR(255)    NOT NULL,  
    \`role\`              ENUM(  
                            'Client',  
                            'CSR',  
                            'Bridge',  
                            'Developer',  
                            'QA',  
                            'Admin'  
                        )               NOT NULL DEFAULT 'Client',  
    \`client\_company\_id\` BIGINT UNSIGNED NULL     COMMENT 'Populated for Client-role users only',  
    \`client\_contact\_id\` BIGINT UNSIGNED NULL     COMMENT 'Links portal login to a client\_contacts record',  
    \`is\_vip\`            BOOLEAN         NOT NULL DEFAULT FALSE,  
    \`is\_active\`         BOOLEAN         NOT NULL DEFAULT TRUE,  
    \`remember\_token\`    VARCHAR(100)    NULL,  
    \`created\_at\`        TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`        TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    UNIQUE KEY \`uq\_users\_email\` (\`email\`),  
    INDEX \`idx\_users\_role\` (\`role\`),  
    INDEX \`idx\_users\_company\` (\`client\_company\_id\`),  
    CONSTRAINT \`fk\_users\_company\`  
        FOREIGN KEY (\`client\_company\_id\`) REFERENCES \`client\_companies\` (\`id\`),  
    CONSTRAINT \`fk\_users\_contact\`  
        FOREIGN KEY (\`client\_contact\_id\`) REFERENCES \`client\_contacts\` (\`id\`)  
) ENGINE=InnoDB COMMENT='All system users across all roles';

\-- \=============================================================================  
\-- SECTION 4: TAGS  
\-- \=============================================================================

CREATE TABLE \`tags\` (  
    \`id\`   BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\` VARCHAR(100)    NOT NULL,  
    UNIQUE KEY \`uq\_tags\_name\` (\`name\`)  
) ENGINE=InnoDB;

\-- \=============================================================================  
\-- SECTION 5: SPRINTS  
\-- \=============================================================================

CREATE TABLE \`sprints\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`name\`        VARCHAR(100)    NOT NULL COMMENT 'e.g. Sprint 14 / Q2-W3',  
    \`start\_date\`  DATE            NOT NULL,  
    \`end\_date\`    DATE            NOT NULL,  
    \`status\`      ENUM('Planned','Active','Completed') NOT NULL DEFAULT 'Planned',  
    \`notes\`       TEXT            NULL,  
    \`created\_by\`  BIGINT UNSIGNED NOT NULL,  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    INDEX \`idx\_sprints\_status\` (\`status\`),  
    INDEX \`idx\_sprints\_dates\` (\`start\_date\`, \`end\_date\`),  
    CONSTRAINT \`fk\_sprints\_created\_by\`  
        FOREIGN KEY (\`created\_by\`) REFERENCES \`users\` (\`id\`)  
) ENGINE=InnoDB COMMENT='Development sprints for sprint-deferred tickets (SRS §8.2)';

\-- \=============================================================================  
\-- SECTION 6: TICKETS  
\-- \=============================================================================

CREATE TABLE \`tickets\` (  
    \`id\`                   BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`            VARCHAR(50)     NOT NULL COMMENT 'SUP-YYYY-MMDD-NNN format',

    \-- Core content  
    \`title\`                VARCHAR(255)    NOT NULL,  
    \`description\`          TEXT            NOT NULL,

    \-- Classification  
    \`status\_id\`            INT UNSIGNED    NOT NULL,  
    \`priority\_id\`          INT UNSIGNED    NOT NULL,  
    \`category\_id\`          INT UNSIGNED    NOT NULL,  
    \`intake\_channel\_id\`    INT UNSIGNED    NOT NULL,

    \-- Client linkage  
    \`contact\_email\`        VARCHAR(255)    NOT NULL COMMENT 'Primary address for email threading',  
    \`client\_company\_id\`    BIGINT UNSIGNED NULL,  
    \`client\_contact\_id\`    BIGINT UNSIGNED NULL,  
    \`raised\_by\_csr\`        BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'TRUE \= CSR raised on behalf of client',

    \-- Staff assignment  
    \`assigned\_csr\_id\`      BIGINT UNSIGNED NULL,  
    \`bridge\_person\_id\`     BIGINT UNSIGNED NULL,  
    \`assigned\_developer\_id\` BIGINT UNSIGNED NULL,  
    \`assigned\_qa\_id\`       BIGINT UNSIGNED NULL,

    \-- Sprint linkage (SRS §8.2)  
    \`sprint\_id\`            BIGINT UNSIGNED NULL COMMENT 'Set when ticket is Deferred to Sprint',

    \-- Development task linkage (SRS §8.1)  
    \`linked\_dev\_task\_id\`   VARCHAR(100)    NULL COMMENT 'External PM system task reference',

    \-- SLA state (summary — detail in ticket\_sla\_logs)  
    \`sla\_response\_breached\`   BOOLEAN      NOT NULL DEFAULT FALSE,  
    \`sla\_resolution\_breached\` BOOLEAN      NOT NULL DEFAULT FALSE,  
    \`sla\_paused\_at\`           TIMESTAMP    NULL     COMMENT 'Non-null while waiting for client',

    \-- Key lifecycle timestamps (needed for auto-close & reporting without full history scan)  
    \`first\_responded\_at\`   TIMESTAMP       NULL,  
    \`resolved\_at\`          TIMESTAMP       NULL COMMENT 'Set when status → Resolved',  
    \`deployed\_at\`          TIMESTAMP       NULL COMMENT 'Set when status → Deployed',  
    \`closed\_at\`            TIMESTAMP       NULL,  
    \`reopened\_count\`       INT UNSIGNED    NOT NULL DEFAULT 0,

    \-- CSAT (SRS §7.2) — detail in csat\_surveys table  
    \`csat\_score\`           TINYINT UNSIGNED NULL,  
    \`csat\_comment\`         TEXT             NULL,

    \`created\_at\`           TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`           TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    \`deleted\_at\`           TIMESTAMP       NULL COMMENT 'Soft delete; tickets are never hard-deleted',

    UNIQUE KEY \`uq\_tickets\_ticket\_id\` (\`ticket\_id\`),  
    INDEX \`idx\_tickets\_status\`     (\`status\_id\`),  
    INDEX \`idx\_tickets\_priority\`   (\`priority\_id\`),  
    INDEX \`idx\_tickets\_category\`   (\`category\_id\`),  
    INDEX \`idx\_tickets\_company\`    (\`client\_company\_id\`),  
    INDEX \`idx\_tickets\_csr\`        (\`assigned\_csr\_id\`),  
    INDEX \`idx\_tickets\_bridge\`     (\`bridge\_person\_id\`),  
    INDEX \`idx\_tickets\_developer\`  (\`assigned\_developer\_id\`),  
    INDEX \`idx\_tickets\_qa\`         (\`assigned\_qa\_id\`),  
    INDEX \`idx\_tickets\_sprint\`     (\`sprint\_id\`),  
    INDEX \`idx\_tickets\_created\_at\` (\`created\_at\`),  
    INDEX \`idx\_tickets\_resolved\_at\`(\`resolved\_at\`),  
    INDEX \`idx\_tickets\_closed\_at\`  (\`closed\_at\`),

    CONSTRAINT \`fk\_tickets\_status\`  
        FOREIGN KEY (\`status\_id\`)          REFERENCES \`ticket\_statuses\`   (\`id\`),  
    CONSTRAINT \`fk\_tickets\_priority\`  
        FOREIGN KEY (\`priority\_id\`)        REFERENCES \`ticket\_priorities\`  (\`id\`),  
    CONSTRAINT \`fk\_tickets\_category\`  
        FOREIGN KEY (\`category\_id\`)        REFERENCES \`ticket\_categories\`  (\`id\`),  
    CONSTRAINT \`fk\_tickets\_channel\`  
        FOREIGN KEY (\`intake\_channel\_id\`)  REFERENCES \`intake\_channels\`    (\`id\`),  
    CONSTRAINT \`fk\_tickets\_company\`  
        FOREIGN KEY (\`client\_company\_id\`)  REFERENCES \`client\_companies\`   (\`id\`),  
    CONSTRAINT \`fk\_tickets\_contact\`  
        FOREIGN KEY (\`client\_contact\_id\`)  REFERENCES \`client\_contacts\`    (\`id\`),  
    CONSTRAINT \`fk\_tickets\_csr\`  
        FOREIGN KEY (\`assigned\_csr\_id\`)    REFERENCES \`users\`              (\`id\`),  
    CONSTRAINT \`fk\_tickets\_bridge\`  
        FOREIGN KEY (\`bridge\_person\_id\`)   REFERENCES \`users\`              (\`id\`),  
    CONSTRAINT \`fk\_tickets\_developer\`  
        FOREIGN KEY (\`assigned\_developer\_id\`) REFERENCES \`users\`           (\`id\`),  
    CONSTRAINT \`fk\_tickets\_qa\`  
        FOREIGN KEY (\`assigned\_qa\_id\`)     REFERENCES \`users\`              (\`id\`),  
    CONSTRAINT \`fk\_tickets\_sprint\`  
        FOREIGN KEY (\`sprint\_id\`)          REFERENCES \`sprints\`            (\`id\`),  
    CONSTRAINT \`chk\_tickets\_csat\_score\`  
        CHECK (\`csat\_score\` BETWEEN 1 AND 5\)

) ENGINE=InnoDB COMMENT='Core ticket table — one row per support issue';

\-- \=============================================================================  
\-- SECTION 7: TICKET TAG MAP  
\-- \=============================================================================

CREATE TABLE \`ticket\_tag\_map\` (  
    \`ticket\_id\` BIGINT UNSIGNED NOT NULL,  
    \`tag\_id\`    BIGINT UNSIGNED NOT NULL,  
    PRIMARY KEY (\`ticket\_id\`, \`tag\_id\`),           \-- composite PK (was broken in v1)  
    INDEX \`idx\_ticket\_tag\_map\_tag\` (\`tag\_id\`),  
    CONSTRAINT \`fk\_ttm\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE,  
    CONSTRAINT \`fk\_ttm\_tag\`  
        FOREIGN KEY (\`tag\_id\`)    REFERENCES \`tags\`    (\`id\`) ON DELETE CASCADE  
) ENGINE=InnoDB COMMENT='Many-to-many: tickets ↔ tags';

\-- \=============================================================================  
\-- SECTION 8: TICKET COMMENTS  
\-- \=============================================================================

CREATE TABLE \`ticket\_comments\` (  
    \`id\`               BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`        BIGINT UNSIGNED NOT NULL,  
    \`author\_id\`        BIGINT UNSIGNED NOT NULL,  
    \`content\`          TEXT            NOT NULL,  
    \`comment\_type\`     ENUM(  
                           'Client\_Facing',  \-- visible to client, triggers email  
                           'Internal\_Note',  \-- staff-only, never sent to client  
                           'System'          \-- auto-generated (status changes, SLA alerts)  
                       )               NOT NULL,  
    \`channel\`          ENUM(  
                           'Email',  
                           'WhatsApp',  
                           'Phone',  
                           'Portal',  
                           'Internal'  
                       )               NOT NULL DEFAULT 'Email'  
                       COMMENT 'Communication channel this comment was delivered via',  
    \`created\_at\`       TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_ticket\_comments\_ticket\` (\`ticket\_id\`),  
    INDEX \`idx\_ticket\_comments\_author\` (\`author\_id\`),  
    CONSTRAINT \`fk\_ticket\_comments\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)  REFERENCES \`tickets\` (\`id\`),  
    CONSTRAINT \`fk\_ticket\_comments\_author\`  
        FOREIGN KEY (\`author\_id\`)  REFERENCES \`users\`   (\`id\`)  
) ENGINE=InnoDB COMMENT='All comments: client-facing replies, internal notes, and system messages';

\-- \=============================================================================  
\-- SECTION 9: TICKET ATTACHMENTS  
\-- \=============================================================================

CREATE TABLE \`ticket\_attachments\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`   BIGINT UNSIGNED NOT NULL,  
    \`comment\_id\`  BIGINT UNSIGNED NULL     COMMENT 'Null if attached directly to ticket, not a comment',  
    \`file\_name\`   VARCHAR(255)    NOT NULL,  
    \`file\_path\`   VARCHAR(500)    NOT NULL,  
    \`file\_size\`   INT UNSIGNED    NOT NULL COMMENT 'Bytes; max 20 MB enforced at application layer',  
    \`mime\_type\`   VARCHAR(100)    NULL,  
    \`uploaded\_by\` BIGINT UNSIGNED NOT NULL,  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_ticket\_attachments\_ticket\`  (\`ticket\_id\`),  
    INDEX \`idx\_ticket\_attachments\_comment\` (\`comment\_id\`),  
    CONSTRAINT \`fk\_ticket\_attachments\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)  REFERENCES \`tickets\`         (\`id\`),  
    CONSTRAINT \`fk\_ticket\_attachments\_comment\`  
        FOREIGN KEY (\`comment\_id\`) REFERENCES \`ticket\_comments\` (\`id\`),  
    CONSTRAINT \`fk\_ticket\_attachments\_uploader\`  
        FOREIGN KEY (\`uploaded\_by\`) REFERENCES \`users\`          (\`id\`)  
) ENGINE=InnoDB COMMENT='Files attached to tickets or to specific comments';

\-- \=============================================================================  
\-- SECTION 10: EMAIL THREADING  
\-- \=============================================================================

CREATE TABLE \`ticket\_emails\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`   BIGINT UNSIGNED NOT NULL,  
    \`comment\_id\`  BIGINT UNSIGNED NULL     COMMENT 'Links outbound email to the comment that triggered it',  
    \`message\_id\`  VARCHAR(255)    NULL     COMMENT 'RFC 2822 Message-ID header for thread matching',  
    \`in\_reply\_to\` VARCHAR(255)    NULL     COMMENT 'RFC 2822 In-Reply-To for threading',  
    \`from\_email\`  VARCHAR(255)    NOT NULL,  
    \`to\_email\`    VARCHAR(255)    NOT NULL,  
    \`cc\_emails\`   TEXT            NULL     COMMENT 'Comma-separated CC addresses',  
    \`subject\`     VARCHAR(255)    NOT NULL,  
    \`body\_html\`   MEDIUMTEXT      NULL,  
    \`body\_text\`   MEDIUMTEXT      NULL,  
    \`direction\`   ENUM('Inbound','Outbound') NOT NULL,  
    \`sent\_at\`     TIMESTAMP       NULL     COMMENT 'Null until delivery confirmed',  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_ticket\_emails\_ticket\`     (\`ticket\_id\`),  
    INDEX \`idx\_ticket\_emails\_message\_id\` (\`message\_id\`),  
    CONSTRAINT \`fk\_ticket\_emails\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)  REFERENCES \`tickets\`         (\`id\`),  
    CONSTRAINT \`fk\_ticket\_emails\_comment\`  
        FOREIGN KEY (\`comment\_id\`) REFERENCES \`ticket\_comments\` (\`id\`)  
) ENGINE=InnoDB COMMENT='Full email thread log for every ticket (SRS §5.1)';

\-- \=============================================================================  
\-- SECTION 11: SLA TRACKING  
\-- \=============================================================================

CREATE TABLE \`ticket\_sla\_logs\` (  
    \`id\`              BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`       BIGINT UNSIGNED NOT NULL,  
    \`sla\_type\`        ENUM('First\_Response','Resolution') NOT NULL,  
    \`target\_minutes\`  INT UNSIGNED    NOT NULL COMMENT 'Copied from ticket\_priorities at ticket creation',  
    \`start\_time\`      TIMESTAMP       NOT NULL,  
    \`end\_time\`        TIMESTAMP       NULL     COMMENT 'Null until SLA is met or breached',  
    \`paused\_at\`       TIMESTAMP       NULL,  
    \`resumed\_at\`      TIMESTAMP       NULL,  
    \`paused\_duration\` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Total seconds paused (Waiting for Client)',  
    \`breached\`        BOOLEAN         NOT NULL DEFAULT FALSE,  
    \`breached\_at\`     TIMESTAMP       NULL,  
    \`created\_at\`      TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_sla\_logs\_ticket\`  (\`ticket\_id\`),  
    INDEX \`idx\_sla\_logs\_breached\`(\`breached\`),  
    CONSTRAINT \`fk\_sla\_logs\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`)  
) ENGINE=InnoDB COMMENT='SLA timer state — one row per SLA type per ticket (SRS §6)';

\-- \=============================================================================  
\-- SECTION 12: STATUS HISTORY  
\-- \=============================================================================

CREATE TABLE \`ticket\_status\_history\` (  
    \`id\`            BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`     BIGINT UNSIGNED NOT NULL,  
    \`old\_status\_id\` INT UNSIGNED    NULL     COMMENT 'Null for the initial New status',  
    \`new\_status\_id\` INT UNSIGNED    NOT NULL,  
    \`changed\_by\`    BIGINT UNSIGNED NOT NULL,  
    \`note\`          VARCHAR(255)    NULL     COMMENT 'Optional reason for the transition',  
    \`created\_at\`    TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_status\_history\_ticket\` (\`ticket\_id\`),  
    CONSTRAINT \`fk\_status\_history\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)     REFERENCES \`tickets\`         (\`id\`),  
    CONSTRAINT \`fk\_status\_history\_old\`  
        FOREIGN KEY (\`old\_status\_id\`) REFERENCES \`ticket\_statuses\` (\`id\`),  
    CONSTRAINT \`fk\_status\_history\_new\`  
        FOREIGN KEY (\`new\_status\_id\`) REFERENCES \`ticket\_statuses\` (\`id\`),  
    CONSTRAINT \`fk\_status\_history\_user\`  
        FOREIGN KEY (\`changed\_by\`)    REFERENCES \`users\`           (\`id\`)  
) ENGINE=InnoDB COMMENT='Immutable log of every ticket status transition';

\-- \=============================================================================  
\-- SECTION 13: ASSIGNMENT HISTORY  
\-- \=============================================================================

CREATE TABLE \`ticket\_assignments\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`   BIGINT UNSIGNED NOT NULL,  
    \`assigned\_to\` BIGINT UNSIGNED NOT NULL,  
    \`role\`        ENUM('CSR','Bridge','Developer','QA') NOT NULL,  
    \`assigned\_by\` BIGINT UNSIGNED NOT NULL,  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_ticket\_assignments\_ticket\`  (\`ticket\_id\`),  
    INDEX \`idx\_ticket\_assignments\_user\`    (\`assigned\_to\`),  
    CONSTRAINT \`fk\_ticket\_assignments\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)   REFERENCES \`tickets\` (\`id\`),  
    CONSTRAINT \`fk\_ticket\_assignments\_to\`  
        FOREIGN KEY (\`assigned\_to\`) REFERENCES \`users\`   (\`id\`),  
    CONSTRAINT \`fk\_ticket\_assignments\_by\`  
        FOREIGN KEY (\`assigned\_by\`) REFERENCES \`users\`   (\`id\`)  
) ENGINE=InnoDB COMMENT='Full assignment history — who was assigned, by whom, and when';

\-- \=============================================================================  
\-- SECTION 14: TICKET WATCHERS  
\-- (Supports "notify CSR \+ Bridge Person on event X" SRS requirements)  
\-- \=============================================================================

CREATE TABLE \`ticket\_watchers\` (  
    \`ticket\_id\`  BIGINT UNSIGNED NOT NULL,  
    \`user\_id\`    BIGINT UNSIGNED NOT NULL,  
    \`added\_at\`   TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    PRIMARY KEY (\`ticket\_id\`, \`user\_id\`),  
    CONSTRAINT \`fk\_watchers\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE,  
    CONSTRAINT \`fk\_watchers\_user\`  
        FOREIGN KEY (\`user\_id\`)   REFERENCES \`users\`   (\`id\`) ON DELETE CASCADE  
) ENGINE=InnoDB COMMENT='Users who receive notifications on any ticket event (SRS §5.1.2)';

\-- \=============================================================================  
\-- SECTION 15: CSAT SURVEYS  
\-- (Secure no-login token link, 14-day expiry — SRS §7.2)  
\-- \=============================================================================

CREATE TABLE \`csat\_surveys\` (  
    \`id\`           BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`    BIGINT UNSIGNED NOT NULL,  
    \`token\`        CHAR(64)        NOT NULL COMMENT 'Cryptographically random UUID/token for no-login survey URL',  
    \`sent\_at\`      TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`expires\_at\`   TIMESTAMP       NOT NULL COMMENT 'Defaults to 14 days after sent\_at',  
    \`responded\_at\` TIMESTAMP       NULL,  
    \`score\`        TINYINT UNSIGNED NULL,  
    \`comment\`      VARCHAR(500)    NULL,  
    UNIQUE KEY \`uq\_csat\_surveys\_token\`  (\`token\`),  
    UNIQUE KEY \`uq\_csat\_surveys\_ticket\` (\`ticket\_id\`) COMMENT 'One active survey per ticket',  
    CONSTRAINT \`fk\_csat\_surveys\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`),  
    CONSTRAINT \`chk\_csat\_score\`  
        CHECK (\`score\` BETWEEN 1 AND 5\)  
) ENGINE=InnoDB COMMENT='CSAT survey tokens and responses — no login required (SRS §7.2)';

\-- \=============================================================================  
\-- SECTION 16: SPRINT — TICKET LINKAGE  
\-- \=============================================================================

CREATE TABLE \`sprint\_tickets\` (  
    \`sprint\_id\`  BIGINT UNSIGNED NOT NULL,  
    \`ticket\_id\`  BIGINT UNSIGNED NOT NULL,  
    \`added\_by\`   BIGINT UNSIGNED NOT NULL,  
    \`added\_at\`   TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    PRIMARY KEY (\`sprint\_id\`, \`ticket\_id\`),  
    CONSTRAINT \`fk\_sprint\_tickets\_sprint\`  
        FOREIGN KEY (\`sprint\_id\`) REFERENCES \`sprints\` (\`id\`),  
    CONSTRAINT \`fk\_sprint\_tickets\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`),  
    CONSTRAINT \`fk\_sprint\_tickets\_user\`  
        FOREIGN KEY (\`added\_by\`)  REFERENCES \`users\`   (\`id\`)  
) ENGINE=InnoDB COMMENT='Tickets scheduled into development sprints (SRS §8.2)';

\-- \=============================================================================  
\-- SECTION 17: KNOWLEDGE BASE  
\-- \=============================================================================

CREATE TABLE \`knowledge\_base\_articles\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`title\`       VARCHAR(255)    NOT NULL,  
    \`content\`     MEDIUMTEXT      NOT NULL COMMENT 'Rich text (HTML or Markdown)',  
    \`category\`    VARCHAR(100)    NULL,  
    \`status\`      ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Draft',  
    \`author\_id\`   BIGINT UNSIGNED NOT NULL,  
    \`approved\_by\` BIGINT UNSIGNED NULL     COMMENT 'Admin who approved the article',  
    \`approved\_at\` TIMESTAMP       NULL,  
    \`view\_count\`  INT UNSIGNED    NOT NULL DEFAULT 0,  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    \`updated\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
    INDEX \`idx\_kb\_articles\_status\`  (\`status\`),  
    FULLTEXT INDEX \`ft\_kb\_articles\` (\`title\`, \`content\`) COMMENT 'Full-text search (SRS §9.2)',  
    CONSTRAINT \`fk\_kb\_articles\_author\`  
        FOREIGN KEY (\`author\_id\`)   REFERENCES \`users\` (\`id\`),  
    CONSTRAINT \`fk\_kb\_articles\_approver\`  
        FOREIGN KEY (\`approved\_by\`) REFERENCES \`users\` (\`id\`)  
) ENGINE=InnoDB COMMENT='Internal knowledge base articles (SRS §9)';

\-- \---------------------------------------------------------------------------

CREATE TABLE \`kb\_article\_tag\_map\` (  
    \`article\_id\` BIGINT UNSIGNED NOT NULL,  
    \`tag\_id\`     BIGINT UNSIGNED NOT NULL,  
    PRIMARY KEY (\`article\_id\`, \`tag\_id\`),          \-- composite PK (was broken in v1)  
    INDEX \`idx\_kb\_tag\_map\_tag\` (\`tag\_id\`),  
    CONSTRAINT \`fk\_kb\_tag\_map\_article\`  
        FOREIGN KEY (\`article\_id\`) REFERENCES \`knowledge\_base\_articles\` (\`id\`) ON DELETE CASCADE,  
    CONSTRAINT \`fk\_kb\_tag\_map\_tag\`  
        FOREIGN KEY (\`tag\_id\`)     REFERENCES \`tags\`                    (\`id\`) ON DELETE CASCADE  
) ENGINE=InnoDB COMMENT='Many-to-many: KB articles ↔ tags';

\-- \---------------------------------------------------------------------------

CREATE TABLE \`kb\_article\_ticket\_map\` (  
    \`article\_id\` BIGINT UNSIGNED NOT NULL,  
    \`ticket\_id\`  BIGINT UNSIGNED NOT NULL,  
    \`linked\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    PRIMARY KEY (\`article\_id\`, \`ticket\_id\`),  
    CONSTRAINT \`fk\_kb\_ticket\_map\_article\`  
        FOREIGN KEY (\`article\_id\`) REFERENCES \`knowledge\_base\_articles\` (\`id\`) ON DELETE CASCADE,  
    CONSTRAINT \`fk\_kb\_ticket\_map\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`)  REFERENCES \`tickets\`                 (\`id\`) ON DELETE CASCADE  
) ENGINE=InnoDB COMMENT='Related Ticket IDs for KB articles (SRS §9.2)';

\-- \=============================================================================  
\-- SECTION 18: AUDIT LOG  
\-- \=============================================================================

CREATE TABLE \`audit\_logs\` (  
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO\_INCREMENT PRIMARY KEY,  
    \`ticket\_id\`   BIGINT UNSIGNED NULL     COMMENT 'Null for non-ticket system actions',  
    \`user\_id\`     BIGINT UNSIGNED NOT NULL,  
    \`action\`      VARCHAR(255)    NOT NULL COMMENT 'e.g. ticket.status\_changed, ticket.comment\_added',  
    \`description\` TEXT            NULL,  
    \`old\_values\`  JSON            NULL,  
    \`new\_values\`  JSON            NULL,  
    \`ip\_address\`  VARCHAR(45)     NULL     COMMENT 'IPv4 or IPv6 of actor',  
    \`created\_at\`  TIMESTAMP       NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    INDEX \`idx\_audit\_logs\_ticket\`     (\`ticket\_id\`),  
    INDEX \`idx\_audit\_logs\_user\`       (\`user\_id\`),  
    INDEX \`idx\_audit\_logs\_action\`     (\`action\`),  
    INDEX \`idx\_audit\_logs\_created\_at\` (\`created\_at\`),  
    CONSTRAINT \`fk\_audit\_logs\_ticket\`  
        FOREIGN KEY (\`ticket\_id\`) REFERENCES \`tickets\` (\`id\`),  
    CONSTRAINT \`fk\_audit\_logs\_user\`  
        FOREIGN KEY (\`user\_id\`)   REFERENCES \`users\`   (\`id\`)  
) ENGINE=InnoDB COMMENT='Immutable audit trail — 3-year retention required (SRS §11.5)';

\-- \=============================================================================  
\-- SECTION 19: RE-ENABLE FK CHECKS  
\-- \=============================================================================

SET FOREIGN\_KEY\_CHECKS \= 1;

\-- \=============================================================================  
\-- END OF SCHEMA  
\-- STMS v2.0 — Tables: 23 | Based on SRS v1.0 (April 2026\)  
\-- \=============================================================================

