<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\TicketStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user    = $request->user();
        $now     = Carbon::now();
        $today   = $now->copy()->startOfDay();
        $week    = $now->copy()->startOfWeek();
        $days7   = $now->copy()->subDays(7);
        $days30  = $now->copy()->subDays(30);

        $terminalIds     = TicketStatus::whereIn('name', ['Resolved', 'Deployed', 'Closed'])->pluck('id');
        $escalatedId     = TicketStatus::where('name', 'Escalated to Dev')->value('id');
        $newStatusId     = TicketStatus::where('name', 'New')->value('id');
        $waitingStatusId = TicketStatus::where('name', 'Waiting for Client')->value('id');

        // My active tickets (assigned to me, not closed)
        $myTickets = Ticket::with(['status', 'priority', 'category', 'assignedCsr', 'company', 'intakeChannel'])
            ->withCount('comments')
            ->where('assigned_csr_id', $user->id)
            ->whereNotIn('status_id', $terminalIds)
            ->orderByDesc('created_at')
            ->get();

        // New unassigned queue
        $newQueue = Ticket::with(['status', 'priority', 'category', 'company', 'intakeChannel'])
            ->where('status_id', $newStatusId)
            ->whereNull('assigned_csr_id')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Stat: avg first response today
        $avgResponseTodayMin = (int) round(
            Ticket::where('assigned_csr_id', $user->id)
                ->whereNotNull('first_responded_at')
                ->whereDate('first_responded_at', $today)
                ->selectRaw('COALESCE(AVG(TIMESTAMPDIFF(MINUTE, created_at, first_responded_at)), 0) as v')
                ->value('v') ?? 0
        );

        // Stat: avg first response last 7 days (for delta comparison)
        $avgResponse7dMin = (int) round(
            Ticket::where('assigned_csr_id', $user->id)
                ->whereNotNull('first_responded_at')
                ->where('first_responded_at', '>=', $days7)
                ->selectRaw('COALESCE(AVG(TIMESTAMPDIFF(MINUTE, created_at, first_responded_at)), 0) as v')
                ->value('v') ?? 0
        );

        // Stat: FCR rate last 7d (resolved without reopening / total resolved)
        $resolvedIn7d = Ticket::where('assigned_csr_id', $user->id)
            ->whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)
            ->count();
        $fcrCount = Ticket::where('assigned_csr_id', $user->id)
            ->whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $days7)
            ->where('reopened_count', 0)
            ->count();
        $fcrRate = $resolvedIn7d > 0 ? (int) round(($fcrCount / $resolvedIn7d) * 100) : null;

        // Stat: CSAT average last 30d
        $csat30d = Ticket::where('assigned_csr_id', $user->id)
            ->whereNotNull('csat_score')
            ->where('updated_at', '>=', $days30)
            ->avg('csat_score');

        // Stat: tickets handled this week
        $weekHandled = Ticket::where('assigned_csr_id', $user->id)
            ->whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $week)
            ->count();

        // Stat: avg resolution time this week (minutes)
        $weekAvgResolutionMin = Ticket::where('assigned_csr_id', $user->id)
            ->whereIn('status_id', $terminalIds)
            ->where('resolved_at', '>=', $week)
            ->whereNotNull('resolved_at')
            ->selectRaw('COALESCE(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)), 0) as v')
            ->value('v');

        // Stat: escalations this week (tickets I owned that were escalated)
        $weekEscalations = $escalatedId
            ? TicketStatusHistory::join('tickets', 'ticket_status_history.ticket_id', '=', 'tickets.id')
                ->where('ticket_status_history.new_status_id', $escalatedId)
                ->where('ticket_status_history.created_at', '>=', $week)
                ->where('tickets.assigned_csr_id', $user->id)
                ->count()
            : 0;

        return response()->json([
            'user_name' => $user->name,
            'stats' => [
                'open_count'                   => $myTickets->count(),
                'sla_breached_count'            => $myTickets->where('sla_resolution_breached', true)->count(),
                'awaiting_reply_count'          => $myTickets->where('status_id', $waitingStatusId)->count(),
                'avg_first_response_today_min'  => $avgResponseTodayMin ?: null,
                'avg_first_response_7d_min'     => $avgResponse7dMin    ?: null,
                'fcr_rate_7d'                   => $fcrRate,
                'csat_30d'                      => $csat30d ? round((float) $csat30d, 1) : null,
                'week_handled'                  => $weekHandled,
                'week_avg_resolution_min'        => $weekAvgResolutionMin ? (int) round($weekAvgResolutionMin) : null,
                'week_escalations'              => $weekEscalations,
            ],
            'my_tickets' => $myTickets,
            'new_queue'  => $newQueue,
        ]);
    }
}
