<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared("SET FOREIGN_KEY_CHECKS = 0;");

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
                    FOREIGN KEY (`tag_id`)     REFERENCES `tags` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

        DB::unprepared("
            CREATE TABLE IF NOT EXISTS `kb_article_ticket_map` (
                `article_id` BIGINT UNSIGNED NOT NULL,
                `ticket_id`  BIGINT UNSIGNED NOT NULL,
                `linked_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`article_id`, `ticket_id`),
                CONSTRAINT `fk_kb_ticket_map_article`
                    FOREIGN KEY (`article_id`) REFERENCES `knowledge_base_articles` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_kb_ticket_map_ticket`
                    FOREIGN KEY (`ticket_id`)  REFERENCES `tickets` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        ");

        DB::unprepared("SET FOREIGN_KEY_CHECKS = 1;");
    }

    public function down(): void
    {
        DB::unprepared("SET FOREIGN_KEY_CHECKS = 0;");
        DB::unprepared("DROP TABLE IF EXISTS `kb_article_ticket_map`;");
        DB::unprepared("DROP TABLE IF EXISTS `kb_article_tag_map`;");
        DB::unprepared("DROP TABLE IF EXISTS `knowledge_base_articles`;");
        DB::unprepared("SET FOREIGN_KEY_CHECKS = 1;");
    }
};
