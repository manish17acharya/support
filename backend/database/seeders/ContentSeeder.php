<?php

namespace Database\Seeders;

use App\Models\ClientCompany;
use App\Models\KnowledgeBaseArticle;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        // Companies
        $companies = [
            ['name' => 'Northwind Retail',     'primary_email' => 'support@northwind.example',  'is_vip' => true],
            ['name' => 'Helios Logistics',     'primary_email' => 'ops@helioslog.example',      'is_vip' => true],
            ['name' => 'Verdant Labs',         'primary_email' => 'it@verdantlabs.example',     'is_vip' => false],
            ['name' => 'Aurora Financial',     'primary_email' => 'service@aurorafin.example',  'is_vip' => true],
            ['name' => 'Pinecrest Health',     'primary_email' => 'tech@pinecrest.example',     'is_vip' => false],
            ['name' => 'Riverbend Studios',    'primary_email' => 'support@riverbend.example',  'is_vip' => false],
            ['name' => 'Cobalt Manufacturing', 'primary_email' => 'it@cobaltmfg.example',       'is_vip' => true],
        ];

        foreach ($companies as $data) {
            ClientCompany::firstOrCreate(['name' => $data['name']], $data);
        }

        // KB articles (seeded by admin user)
        $author = User::where('role', 'Admin')->first()
            ?? User::where('is_active', true)->first();

        if (!$author) return;

        $articles = [
            [
                'title'    => 'Resetting two-factor authentication for a client',
                'category' => 'Auth & SSO',
                'status'   => 'Published',
                'view_count' => 1284,
                'tags'     => ['auth'],
                'content'  => "Step-by-step guide for resetting 2FA for a locked-out client.\n\n1. Verify identity via backup email\n2. Disable TOTP in admin panel\n3. Re-send setup link\n4. Confirm client can log in",
            ],
            [
                'title'    => 'Reproducing the PayPal IPN timeout — checklist',
                'category' => 'Checkout',
                'status'   => 'Published',
                'view_count' => 312,
                'tags'     => ['checkout'],
                'content'  => "Checklist for reproducing PayPal IPN timeout issues:\n\n- Check TLS certificate expiry\n- Verify IPN endpoint response time (<3s)\n- Check PayPal sandbox vs production URL\n- Review gateway logs for 502s",
            ],
            [
                'title'    => 'How to export full month of orders (workaround)',
                'category' => 'Reports',
                'status'   => 'Published',
                'view_count' => 892,
                'tags'     => [],
                'content'  => "The export button truncates at 10k rows. Workaround:\n\n1. Filter by week (4 separate exports)\n2. Combine CSV files locally\n3. Vote for the bug in the backlog: ticket #ESC-004",
            ],
            [
                'title'    => 'Mobile app crash signatures — known causes',
                'category' => 'Mobile',
                'status'   => 'Published',
                'view_count' => 564,
                'tags'     => [],
                'content'  => "Known crash patterns:\n\n- Cold start crash on Android 14: missing permission check in SplashActivity\n- iOS Safari 2FA redirect: WKWebView cookie handling\n- Push notification crash: null FCM token on fresh install",
            ],
            [
                'title'    => 'Triggering a manual SLA recalculation',
                'category' => 'Operations',
                'status'   => 'Draft',
                'view_count' => 0,
                'tags'     => [],
                'content'  => "Draft: process for manually recalculating SLA timers when the clock was paused incorrectly.",
            ],
            [
                'title'    => 'Migrating a tenant from US-East to EU-West',
                'category' => 'Migrations',
                'status'   => 'Published',
                'view_count' => 145,
                'tags'     => [],
                'content'  => "Migration runbook:\n\n1. Export tenant data\n2. Provision EU-West environment\n3. Run data migration script\n4. Update DNS\n5. Validate GDPR data residency",
            ],
        ];

        foreach ($articles as $data) {
            $tags = $data['tags'];
            unset($data['tags']);

            $article = KnowledgeBaseArticle::firstOrCreate(
                ['title' => $data['title']],
                array_merge($data, ['author_id' => $author->id])
            );

            if (!empty($tags)) {
                $tagIds = [];
                foreach ($tags as $tagName) {
                    $tag = Tag::firstOrCreate(['name' => $tagName]);
                    $tagIds[] = $tag->id;
                }
                $article->tags()->syncWithoutDetaching($tagIds);
            }
        }
    }
}
