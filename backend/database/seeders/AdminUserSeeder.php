<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['email' => 'superadmin@stms.local', 'name' => 'Super Admin',      'role' => 'SuperAdmin'],
            ['email' => 'admin@stms.local',       'name' => 'STMS Admin',       'role' => 'Admin'],
            ['email' => 'manager@stms.local',     'name' => 'Demo Manager',     'role' => 'Manager'],
            ['email' => 'supervisor@stms.local',  'name' => 'Demo Supervisor',  'role' => 'Supervisor'],
            ['email' => 'csr@stms.local',         'name' => 'Demo CSR',         'role' => 'CSR'],
            ['email' => 'bridge@stms.local',      'name' => 'Demo Bridge',      'role' => 'Bridge'],
            ['email' => 'dev1@stms.local',        'name' => 'Dev One',          'role' => 'Developer'],
            ['email' => 'dev2@stms.local',        'name' => 'Dev Two',          'role' => 'Developer'],
            ['email' => 'qa@stms.local',          'name' => 'QA Engineer',      'role' => 'QA'],
        ];

        foreach ($accounts as $account) {
            \App\Models\User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name'      => $account['name'],
                    'password'  => bcrypt('password'),
                    'role'      => $account['role'],
                    'is_active' => true,
                ]
            );
        }
    }
}
