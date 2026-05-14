<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'Client','CSR','Bridge','Developer','QA','Admin','SuperAdmin','Manager','Supervisor'
        ) NOT NULL DEFAULT 'Client'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'Client','CSR','Bridge','Developer','QA','Admin'
        ) NOT NULL DEFAULT 'Client'");
    }
};
