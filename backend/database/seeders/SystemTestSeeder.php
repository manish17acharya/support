<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

/**
 * SystemTestSeeder
 *
 * Creates the required test data to reach system targets:
 *   - 5 CSR users total
 *   - 1 Bridge person (already exists)
 *   - 3 Developers
 *   - 2 QA users
 *   - 15 Client users
 *   - 10 clients with at least 1 active ticket
 *   - 3 escalated tickets
 *   - 23 solved/resolved tickets
 *
 * Run: php artisan db:seed --class=SystemTestSeeder
 */
class SystemTestSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('SystemTestSeeder: Starting...');

        // ---------- Lookup IDs ----------
        $statusIds = DB::table('ticket_statuses')->pluck('id', 'name');
        $priorityIds = DB::table('ticket_priorities')->pluck('id', 'name');
        $categoryIds = DB::table('ticket_categories')->pluck('id', 'name');
        $channelIds  = DB::table('intake_channels')->pluck('id', 'name');

        $resolvedId = $statusIds['Resolved'];
        $closedId   = $statusIds['Closed'];
        $newId      = $statusIds['New'];
        $openId     = $statusIds['Open'];
        $escalatedId = $statusIds['Escalated to Dev'];

        // ---------- Ensure required staff users exist ----------
        $staffUsers = [
            ['email' => 'csr2@stms.local',   'name' => 'CSR Agent 2',     'role' => 'CSR'],
            ['email' => 'csr3@stms.local',   'name' => 'CSR Agent 3',     'role' => 'CSR'],
            ['email' => 'csr4@stms.local',   'name' => 'CSR Agent 4',     'role' => 'CSR'],
            ['email' => 'csr5@stms.local',   'name' => 'CSR Agent 5',     'role' => 'CSR'],
            ['email' => 'dev3@stms.local',   'name' => 'Dev Engineer 3',  'role' => 'Developer'],
            ['email' => 'qa2@stms.local',    'name' => 'QA Engineer 2',   'role' => 'QA'],
        ];

        foreach ($staffUsers as $u) {
            DB::table('users')->updateOrInsert(
                ['email' => $u['email']],
                [
                    'name'       => $u['name'],
                    'password'   => Hash::make('password'),
                    'role'       => $u['role'],
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Get key user IDs
        $csrId    = DB::table('users')->where('email', 'csr@stms.local')->value('id');
        $bridgeId = DB::table('users')->where('email', 'bridge@stms.local')->value('id');
        $dev1Id   = DB::table('users')->where('email', 'dev1@stms.local')->value('id');
        $dev2Id   = DB::table('users')->where('email', 'dev2@stms.local')->value('id');
        $qaId     = DB::table('users')->where('email', 'qa@stms.local')->value('id');
        $adminId  = DB::table('users')->where('email', 'admin@stms.local')->value('id');

        // ---------- Ensure 15 client users exist ----------
        $clientEmails = [];
        for ($i = 1; $i <= 15; $i++) {
            $email = "client{$i}@stms.test";
            $clientEmails[] = $email;

            // Create company if needed
            $companyId = DB::table('client_companies')
                ->where('name', "Company {$i} Ltd")
                ->value('id');

            if (!$companyId) {
                $companyId = DB::table('client_companies')->insertGetId([
                    'name'          => "Company {$i} Ltd",
                    'primary_email' => $email,
                    'is_vip'        => false,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            DB::table('users')->updateOrInsert(
                ['email' => $email],
                [
                    'name'              => "Client User {$i}",
                    'password'          => Hash::make('password'),
                    'role'              => 'Client',
                    'client_company_id' => $companyId,
                    'is_active'         => true,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]
            );
        }

        // ---------- Build resolved tickets to reach target of 23 ----------
        $existingResolved = DB::table('tickets')
            ->whereIn('status_id', [$resolvedId, $closedId])
            ->whereNull('deleted_at')
            ->count();

        $this->command->info("Existing resolved/closed tickets: {$existingResolved}");
        $needed = max(0, 23 - $existingResolved);
        $this->command->info("Need to create: {$needed} resolved tickets");

        $resolvedTitles = [
            'Login page returns 404 after deployment',
            'Email notifications delayed by 2+ hours',
            'Export CSV file has corrupted characters',
            'Search returns no results for valid queries',
            'Invoice PDF missing company logo',
            'Two-factor authentication code not delivered',
            'Dashboard charts not loading on IE11',
            'Password strength indicator broken',
            'User profile photo upload fails silently',
            'Bulk delete action not working for >50 items',
            'Timezone offset incorrect in reports',
            'API token expired but no renewal prompt',
            'Mobile push notifications not arriving',
            'Data grid pagination resets on filter change',
            'Webhook endpoint returning 403 after SSL renewal',
            'CSV import silently skipping malformed rows',
            'Scheduled report emails arriving at wrong time',
            'User session expires immediately after login',
            'Color-blind mode not applying to pie charts',
            'Audit log missing entries for bulk operations',
            'Comment attachments not scanning for viruses',
            'SSO redirect loop on SAML assertion error',
            'Rate limiting threshold incorrect for Enterprise plan',
        ];

        $descriptions = [
            'Client reported the issue and it was reproduced in staging environment.',
            'Root cause identified as misconfiguration in email queue settings.',
            'Issue traced to character encoding in export module.',
            'Fixed by rebuilding full-text search index after schema change.',
            'Template path updated after recent file system reorganization.',
            'Fixed by correcting SMTP server configuration for OTP emails.',
            'Applied polyfill for deprecated browser APIs.',
            'JavaScript validation library updated to latest version.',
            'File permission issue on upload directory resolved.',
            'Database query timeout fixed with index optimization.',
            'Server timezone configuration updated across all services.',
            'Token refresh logic corrected in authentication middleware.',
            'Push notification certificate renewed and re-uploaded.',
            'State management bug fixed in React data grid component.',
            'SSL certificate chain updated and webhook endpoint verified.',
            'CSV parser updated to handle quoted fields with special chars.',
            'Cron job timezone setting corrected in production server.',
            'Session cookie expiry configuration corrected.',
            'Color palette updated across all chart components.',
            'Audit event hook added for bulk operation endpoints.',
            'Antivirus integration re-enabled after firewall policy update.',
            'SAML assertion parser fixed for edge-case attribute mapping.',
            'Rate limiting middleware updated with correct plan thresholds.',
        ];

        $csrIds = [$csrId];
        $allCsrs = DB::table('users')->where('role', 'CSR')->where('is_active', true)->pluck('id')->toArray();
        if (!empty($allCsrs)) {
            $csrIds = $allCsrs;
        }

        for ($i = 0; $i < $needed; $i++) {
            $daysAgo   = rand(2, 30);
            $createdAt = Carbon::now()->subDays($daysAgo)->subHours(rand(1, 8));
            $resolvedAt = $createdAt->copy()->addHours(rand(2, 48));
            $closedAt   = $resolvedAt->copy()->addHours(rand(1, 24));

            $priorityId = $priorityIds->random();
            $categoryId = $categoryIds->random();
            $channelId  = $channelIds->random();
            $csrAssigned = $csrIds[array_rand($csrIds)];
            $clientEmail = $clientEmails[array_rand($clientEmails)];

            // Determine status - mix of Resolved and Closed
            $useStatus = ($i % 3 === 0) ? $resolvedId : $closedId;
            $useClosedAt = ($useStatus === $closedId) ? $closedAt->format('Y-m-d H:i:s') : null;

            $ticketNum = str_pad(DB::table('tickets')
                ->whereDate('created_at', $createdAt->toDateString())
                ->count() + 1, 3, '0', STR_PAD_LEFT);

            $ticketIdStr = 'SUP-' . $createdAt->format('Y-md') . '-' . $ticketNum;

            // Avoid duplicate ticket_id
            if (DB::table('tickets')->where('ticket_id', $ticketIdStr)->exists()) {
                $ticketIdStr .= '-R' . ($i + 1);
            }

            $titleIdx = $i % count($resolvedTitles);
            $descIdx  = $i % count($descriptions);

            $ticketId = DB::table('tickets')->insertGetId([
                'ticket_id'               => $ticketIdStr,
                'title'                   => $resolvedTitles[$titleIdx],
                'description'             => 'Client reported: ' . $resolvedTitles[$titleIdx],
                'status_id'               => $useStatus,
                'priority_id'             => $priorityId,
                'category_id'             => $categoryId,
                'intake_channel_id'       => $channelId,
                'contact_email'           => $clientEmail,
                'assigned_csr_id'         => $csrAssigned,
                'bridge_person_id'        => $bridgeId,
                'assigned_developer_id'   => $dev1Id,
                'raised_by_csr'           => false,
                'sla_response_breached'   => false,
                'sla_resolution_breached' => false,
                'first_responded_at'      => $createdAt->copy()->addMinutes(rand(15, 120))->format('Y-m-d H:i:s'),
                'resolved_at'             => $resolvedAt->format('Y-m-d H:i:s'),
                'deployed_at'             => $resolvedAt->copy()->subHours(1)->format('Y-m-d H:i:s'),
                'closed_at'               => $useClosedAt,
                'reopened_count'          => 0,
                'csat_score'              => rand(3, 5),
                'csat_comment'            => $descriptions[$descIdx],
                'created_at'              => $createdAt->format('Y-m-d H:i:s'),
                'updated_at'              => ($useStatus === $closedId ? $closedAt : $resolvedAt)->format('Y-m-d H:i:s'),
            ]);

            // Add status history entries
            DB::table('ticket_status_history')->insert([
                ['ticket_id' => $ticketId, 'old_status_id' => null,     'new_status_id' => $newId,     'changed_by' => $adminId, 'created_at' => $createdAt->format('Y-m-d H:i:s')],
                ['ticket_id' => $ticketId, 'old_status_id' => $newId,   'new_status_id' => $openId,    'changed_by' => $csrAssigned, 'created_at' => $createdAt->copy()->addMinutes(10)->format('Y-m-d H:i:s')],
                ['ticket_id' => $ticketId, 'old_status_id' => $openId,  'new_status_id' => $resolvedId,'changed_by' => $csrAssigned, 'created_at' => $resolvedAt->format('Y-m-d H:i:s')],
            ]);

            if ($useStatus === $closedId) {
                DB::table('ticket_status_history')->insert([
                    ['ticket_id' => $ticketId, 'old_status_id' => $resolvedId, 'new_status_id' => $closedId, 'changed_by' => $adminId, 'created_at' => $closedAt->format('Y-m-d H:i:s')],
                ]);
            }

            // Add a resolution comment
            DB::table('ticket_comments')->insert([
                'ticket_id'    => $ticketId,
                'author_id'    => $csrAssigned,
                'content'      => 'Issue resolved: ' . $descriptions[$descIdx],
                'comment_type' => 'Client_Facing',
                'channel'      => 'Portal',
                'created_at'   => $resolvedAt->format('Y-m-d H:i:s'),
            ]);
        }

        $this->command->info("Created {$needed} resolved tickets.");

        // ---------- Ensure 10 clients have active tickets ----------
        // Check which of clients 1-10 already have active tickets
        $activeStatusIds = DB::table('ticket_statuses')
            ->whereNotIn('name', ['Resolved', 'Closed', 'Deployed'])
            ->pluck('id')
            ->toArray();

        for ($i = 1; $i <= 10; $i++) {
            $clientEmail = "client{$i}@stms.test";
            $clientUser  = DB::table('users')->where('email', $clientEmail)->first();
            if (!$clientUser) continue;

            $hasActive = DB::table('tickets')
                ->where('contact_email', $clientEmail)
                ->whereIn('status_id', $activeStatusIds)
                ->whereNull('deleted_at')
                ->exists();

            if (!$hasActive) {
                $createdAt = Carbon::now()->subHours(rand(1, 48));
                $ticketNum = str_pad(DB::table('tickets')
                    ->whereDate('created_at', $createdAt->toDateString())
                    ->count() + 1, 3, '0', STR_PAD_LEFT);
                $ticketIdStr = 'SUP-' . $createdAt->format('Y-md') . '-' . $ticketNum;

                if (DB::table('tickets')->where('ticket_id', $ticketIdStr)->exists()) {
                    $ticketIdStr .= '-C' . $i;
                }

                $ticketId = DB::table('tickets')->insertGetId([
                    'ticket_id'               => $ticketIdStr,
                    'title'                   => "Support request from Client {$i}",
                    'description'             => "Client {$i} needs assistance with their account.",
                    'status_id'               => $openId,
                    'priority_id'             => $priorityIds['Medium'],
                    'category_id'             => $categoryIds['General Inquiry'],
                    'intake_channel_id'       => $channelIds['Email'],
                    'contact_email'           => $clientEmail,
                    'client_company_id'       => $clientUser->client_company_id,
                    'assigned_csr_id'         => $csrId,
                    'raised_by_csr'           => false,
                    'sla_response_breached'   => false,
                    'sla_resolution_breached' => false,
                    'created_at'              => $createdAt->format('Y-m-d H:i:s'),
                    'updated_at'              => $createdAt->format('Y-m-d H:i:s'),
                ]);

                DB::table('ticket_status_history')->insert([
                    'ticket_id'     => $ticketId,
                    'old_status_id' => null,
                    'new_status_id' => $openId,
                    'changed_by'    => $adminId,
                    'created_at'    => $createdAt->format('Y-m-d H:i:s'),
                ]);

                $this->command->info("Created active ticket for {$clientEmail}");
            }
        }

        // ---------- Ensure 3 escalated tickets ----------
        $escCount = DB::table('tickets')
            ->whereIn('status_id', [
                $statusIds['Escalated to Dev'],
                $statusIds['Under Review'],
                $statusIds['Deferred to Sprint'],
            ])
            ->whereNull('deleted_at')
            ->count();

        $this->command->info("Existing escalated tickets: {$escCount}");

        $escNeeded = max(0, 3 - $escCount);
        for ($i = 0; $i < $escNeeded; $i++) {
            $createdAt = Carbon::now()->subDays(rand(1, 5));
            $ticketNum = str_pad(DB::table('tickets')
                ->whereDate('created_at', $createdAt->toDateString())
                ->count() + 1, 3, '0', STR_PAD_LEFT);
            $ticketIdStr = 'ESC-NEW-' . ($i + 1);

            if (DB::table('tickets')->where('ticket_id', $ticketIdStr)->exists()) {
                $ticketIdStr .= '-' . time();
            }

            $escStatuses = ['Escalated to Dev', 'Under Review', 'Deferred to Sprint'];
            $escStatus   = $statusIds[$escStatuses[$i % 3]];
            $clientEmail = $clientEmails[array_rand($clientEmails)];

            $ticketId = DB::table('tickets')->insertGetId([
                'ticket_id'               => $ticketIdStr,
                'title'                   => 'Critical escalation: ' . $escStatuses[$i % 3],
                'description'             => 'This ticket was escalated due to complexity.',
                'status_id'               => $escStatus,
                'priority_id'             => $priorityIds['High'],
                'category_id'             => $categoryIds['Bug Report'],
                'intake_channel_id'       => $channelIds['Email'],
                'contact_email'           => $clientEmail,
                'assigned_csr_id'         => $csrId,
                'bridge_person_id'        => $bridgeId,
                'raised_by_csr'           => false,
                'sla_response_breached'   => false,
                'sla_resolution_breached' => false,
                'created_at'              => $createdAt->format('Y-m-d H:i:s'),
                'updated_at'              => $createdAt->format('Y-m-d H:i:s'),
            ]);

            DB::table('ticket_status_history')->insert([
                ['ticket_id' => $ticketId, 'old_status_id' => null,   'new_status_id' => $newId,   'changed_by' => $adminId, 'created_at' => $createdAt->format('Y-m-d H:i:s')],
                ['ticket_id' => $ticketId, 'old_status_id' => $newId, 'new_status_id' => $escStatus,'changed_by' => $csrId,   'created_at' => $createdAt->copy()->addMinutes(30)->format('Y-m-d H:i:s')],
            ]);
        }

        $this->command->info('SystemTestSeeder: Complete.');
    }
}
