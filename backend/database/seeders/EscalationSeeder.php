<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Sprint;
use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\TicketPriority;
use App\Models\TicketCategory;
use App\Models\IntakeChannel;
use Illuminate\Database\Seeder;

class EscalationSeeder extends Seeder
{
    public function run(): void
    {
        // Additional team users
        $bridge = User::firstOrCreate(['email' => 'bridge@stms.local'], [
            'name' => 'Bridge Person', 'password' => bcrypt('password'),
            'role' => 'Bridge', 'is_active' => true,
        ]);
        $dev1 = User::firstOrCreate(['email' => 'dev1@stms.local'], [
            'name' => 'Leo Dev', 'password' => bcrypt('password'),
            'role' => 'Developer', 'is_active' => true,
        ]);
        $dev2 = User::firstOrCreate(['email' => 'dev2@stms.local'], [
            'name' => 'Sara Dev', 'password' => bcrypt('password'),
            'role' => 'Developer', 'is_active' => true,
        ]);
        $qa = User::firstOrCreate(['email' => 'qa@stms.local'], [
            'name' => 'QA Engineer', 'password' => bcrypt('password'),
            'role' => 'QA', 'is_active' => true,
        ]);
        $csr = User::where('email', 'csr@stms.local')->first();

        // Sprints
        $s29 = Sprint::firstOrCreate(['name' => 'Sprint 29'], [
            'start_date' => '2026-04-07', 'end_date' => '2026-04-20',
            'status' => 'Completed', 'created_by' => $bridge->id,
        ]);
        $s30 = Sprint::firstOrCreate(['name' => 'Sprint 30'], [
            'start_date' => '2026-04-21', 'end_date' => '2026-05-04',
            'status' => 'Completed', 'created_by' => $bridge->id,
        ]);
        $s31 = Sprint::firstOrCreate(['name' => 'Sprint 31'], [
            'start_date' => '2026-05-05', 'end_date' => '2026-05-18',
            'status' => 'Active', 'created_by' => $bridge->id,
        ]);
        $s32 = Sprint::firstOrCreate(['name' => 'Sprint 32'], [
            'start_date' => '2026-05-19', 'end_date' => '2026-06-01',
            'status' => 'Planned', 'created_by' => $bridge->id,
        ]);

        // Lookup IDs
        $st  = TicketStatus::pluck('id', 'name');
        $pri = TicketPriority::pluck('id', 'name');
        $cat = TicketCategory::first();
        $ch  = IntakeChannel::first();

        $defs = [
            ['title' => 'Payment gateway timeout on checkout',            'status' => 'Escalated to Dev',      'pri' => 'Critical', 'dev' => null,       'qa' => null,     'sprint' => null],
            ['title' => 'CSV export missing columns for enterprise plan',  'status' => 'Escalated to Dev',      'pri' => 'High',     'dev' => null,       'qa' => null,     'sprint' => null],
            ['title' => 'SSO login fails with SAML 2.0 providers',        'status' => 'Under Review',          'pri' => 'Critical', 'dev' => $dev1->id,  'qa' => null,     'sprint' => null],
            ['title' => 'Bulk invoice PDF generation slow on large sets',  'status' => 'Deferred to Sprint',   'pri' => 'Medium',   'dev' => null,       'qa' => null,     'sprint' => $s32->id],
            ['title' => 'Fix PayPal IPN timeout after TLS rotation',       'status' => 'In Development',       'pri' => 'High',     'dev' => $dev1->id,  'qa' => null,     'sprint' => $s31->id],
            ['title' => 'Webhook retry queue stuck after Redis restart',   'status' => 'In Development',       'pri' => 'High',     'dev' => $dev2->id,  'qa' => null,     'sprint' => $s31->id],
            ['title' => 'Date picker shows wrong month on mobile Safari',  'status' => 'In QA/Testing',        'pri' => 'Medium',   'dev' => $dev1->id,  'qa' => $qa->id,  'sprint' => $s31->id],
            ['title' => '2FA backup codes not invalidated after use',      'status' => 'In QA/Testing',        'pri' => 'High',     'dev' => $dev2->id,  'qa' => $qa->id,  'sprint' => $s31->id],
            ['title' => 'Dark mode contrast below WCAG AA on action buttons', 'status' => 'Ready for Deployment', 'pri' => 'Low',  'dev' => $dev1->id,  'qa' => $qa->id,  'sprint' => $s31->id],
        ];

        foreach ($defs as $i => $def) {
            $statusId   = $st[$def['status']]  ?? null;
            $priorityId = $pri[$def['pri']] ?? null;
            if (!$statusId || !$priorityId) continue;

            Ticket::firstOrCreate(
                ['title' => $def['title']],
                [
                    'ticket_id'             => 'ESC-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                    'description'           => 'Escalated ticket seeded for development testing.',
                    'status_id'             => $statusId,
                    'priority_id'           => $priorityId,
                    'category_id'           => $cat?->id,
                    'intake_channel_id'     => $ch?->id,
                    'contact_email'         => 'client' . ($i + 1) . '@example.com',
                    'assigned_csr_id'       => $csr?->id,
                    'bridge_person_id'      => $bridge->id,
                    'assigned_developer_id' => $def['dev'],
                    'assigned_qa_id'        => $def['qa'],
                    'sprint_id'             => $def['sprint'],
                ]
            );
        }
    }
}
