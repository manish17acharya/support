<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function index()
    {
        $now    = Carbon::now();
        $week   = $now->copy()->startOfWeek();
        $lastWeekStart = $week->copy()->subWeek();
        $lastWeekEnd   = $week->copy()->subSecond();
        $days30 = $now->copy()->subDays(30);
        $days7  = $now->copy()->subDays(7);

        $terminalIds = TicketStatus::whereIn('name', ['Resolved', 'Deployed', 'Closed'])->pluck('id');

        // Ticket volume
        $ticketsThisWeek = Ticket::where('created_at', '>=', $week)->count();
        $ticketsLastWeek = Ticket::whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])->count();

        // SLA compliance (last 7d resolved — not breached / total)
        $resolvedLast7d = Ticket::whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)->count();
        $slaBreachLast7d = Ticket::whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)
            ->where('sla_resolution_breached', true)->count();
        $slaCompliance = $resolvedLast7d > 0
            ? round((($resolvedLast7d - $slaBreachLast7d) / $resolvedLast7d) * 100, 1)
            : 100;

        // FCR rate last 7d
        $fcrCount = Ticket::whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)
            ->where('reopened_count', 0)->count();
        $fcrRate = $resolvedLast7d > 0 ? (int) round(($fcrCount / $resolvedLast7d) * 100) : null;

        // CSAT (last 30d)
        $csatAvg = Ticket::whereNotNull('csat_score')->where('updated_at', '>=', $days30)->avg('csat_score');
        $csatResponses = Ticket::whereNotNull('csat_score')->where('updated_at', '>=', $days30)->count();
        $totalClosed30d = Ticket::whereIn('status_id', $terminalIds)->where('resolved_at', '>=', $days30)->count();
        $csatRate = $totalClosed30d > 0 ? (int) round(($csatResponses / $totalClosed30d) * 100) : 0;

        // Avg resolution (last 7d)
        $avgResolutionMin = Ticket::whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)
            ->whereNotNull('resolved_at')
            ->selectRaw('COALESCE(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)), 0) as v')
            ->value('v');
        $avgResolutionHours = $avgResolutionMin ? round($avgResolutionMin / 60, 1) : null;

        // Open by priority
        $openTickets = Ticket::whereNotIn('status_id', $terminalIds)
            ->with('priority:id,name')
            ->get(['priority_id']);
        $openByPriority = $openTickets->groupBy(fn($t) => $t->priority?->name ?? 'Medium')
            ->map->count();
        $openByPriority = [
            'Critical' => $openByPriority['Critical'] ?? 0,
            'High'     => $openByPriority['High']     ?? 0,
            'Medium'   => $openByPriority['Medium']   ?? 0,
            'Low'      => $openByPriority['Low']       ?? 0,
        ];

        // By channel (last 7d)
        $byChannel = Ticket::where('created_at', '>=', $days7)
            ->with('intakeChannel:id,name')
            ->get(['intake_channel_id'])
            ->groupBy(fn($t) => $t->intakeChannel?->name ?? 'Other')
            ->map->count()
            ->sortDesc()
            ->map(fn($v, $k) => ['name' => $k, 'value' => $v])
            ->values();

        // Daily trend: last 7 days Mon→Sun (or just last 7 calendar days)
        $trendLabels = [];
        $daily       = [];
        $resolved    = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->startOfDay();
            $trendLabels[] = $day->format('D');
            $daily[]    = Ticket::whereDate('created_at', $day)->count();
            $resolved[] = Ticket::whereIn('status_id', $terminalIds)->whereDate('resolved_at', $day)->count();
        }

        // CSR leaderboard (this week)
        $csrs = User::where('role', 'CSR')->where('is_active', true)->get();
        $leaderboard = $csrs->map(function ($u) use ($terminalIds, $week, $days7) {
            $handled = Ticket::where('assigned_csr_id', $u->id)
                ->whereIn('status_id', $terminalIds)
                ->where('resolved_at', '>=', $week)->count();

            $fcrWeek = $handled > 0
                ? Ticket::where('assigned_csr_id', $u->id)
                    ->whereIn('status_id', $terminalIds)
                    ->where('resolved_at', '>=', $week)
                    ->where('reopened_count', 0)->count()
                : 0;

            $slaHits = $handled > 0
                ? Ticket::where('assigned_csr_id', $u->id)
                    ->whereIn('status_id', $terminalIds)
                    ->where('resolved_at', '>=', $week)
                    ->where('sla_resolution_breached', false)->count()
                : 0;

            $csat = Ticket::where('assigned_csr_id', $u->id)
                ->whereNotNull('csat_score')
                ->where('updated_at', '>=', $week)
                ->avg('csat_score');

            return [
                'id'      => $u->id,
                'name'    => $u->name,
                'email'   => $u->email,
                'handled' => $handled,
                'fcr'     => $handled > 0 ? (int) round(($fcrWeek / $handled) * 100) : 0,
                'csat'    => $csat ? round((float)$csat, 1) : null,
                'slaHits' => $slaHits,
            ];
        })->sortByDesc('handled')->values();

        return response()->json([
            'ticketsThisWeek'     => $ticketsThisWeek,
            'ticketsLastWeek'     => $ticketsLastWeek,
            'fcrRate'             => $fcrRate,
            'slaCompliance'       => $slaCompliance,
            'csat'                => $csatAvg ? round((float)$csatAvg, 2) : null,
            'csatResponses'       => $csatResponses,
            'csatRate'            => $csatRate,
            'avgResolutionHours'  => $avgResolutionHours,
            'openByPriority'      => $openByPriority,
            'byChannel'           => $byChannel,
            'daily'               => $daily,
            'resolved'            => $resolved,
            'trendLabels'         => $trendLabels,
            'csrLeaderboard'      => $leaderboard,
        ]);
    }
}
