<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketStatus;
use App\Models\TicketStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $query = Ticket::with(['status', 'priority', 'category', 'assignedCsr', 'company', 'intakeChannel', 'sprint'])
            ->withCount('comments')
            ->orderByDesc('created_at');

        if ($request->filled('status'))   $query->where('status_id', $request->status);
        if ($request->filled('priority')) $query->where('priority_id', $request->priority);
        if ($request->filled('csr'))      $query->where('assigned_csr_id', $request->csr);
        if ($request->filled('search'))   $query->where('title', 'like', '%'.$request->search.'%');

        // Multi-status filter: comma-separated DB status names
        if ($request->filled('statuses')) {
            $names = array_map('trim', explode(',', $request->statuses));
            $ids   = \App\Models\TicketStatus::whereIn('name', $names)->pluck('id');
            $query->whereIn('status_id', $ids);
        }
        if ($request->filled('developer_id'))  $query->where('assigned_developer_id', $request->developer_id);
        if ($request->filled('qa_id'))          $query->where('assigned_qa_id',         $request->qa_id);
        if ($request->filled('sprint_id'))      $query->where('sprint_id',              $request->sprint_id);
        if ($request->filled('company_id'))     $query->where('client_company_id',      $request->company_id);
        if ($request->filled('category_id'))    $query->where('category_id',            $request->category_id);
        if ($request->filled('created_after'))  $query->whereDate('created_at', '>=',   $request->created_after);
        if ($request->filled('created_before')) $query->whereDate('created_at', '<=',   $request->created_before);

        return response()->json($query->paginate($request->get('per_page', 25)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'             => 'required|string|max:255',
            'description'       => 'required|string',
            'priority_id'       => 'required|integer|exists:ticket_priorities,id',
            'category_id'       => 'required|integer|exists:ticket_categories,id',
            'intake_channel_id' => 'required|integer|exists:intake_channels,id',
            'contact_email'     => 'nullable|email',
            'client_company_id' => 'nullable|integer|exists:client_companies,id',
        ]);

        $status = TicketStatus::where('name', 'New')->firstOrFail();
        $date   = now();
        $seq    = str_pad(Ticket::whereDate('created_at', $date)->count() + 1, 3, '0', STR_PAD_LEFT);

        // Auto-set contact_email and client_company_id from authenticated client
        $authUser = $request->user();
        if ($authUser->role === 'Client') {
            $validated['contact_email']     = $validated['contact_email'] ?? $authUser->email;
            $validated['client_company_id'] = $validated['client_company_id'] ?? $authUser->client_company_id;
        }

        // Ensure contact_email is never null (DB has NOT NULL constraint)
        if (empty($validated['contact_email'])) {
            $validated['contact_email'] = $authUser->email ?? 'noreply@stms.local';
        }

        $ticket = Ticket::create(array_merge($validated, [
            'ticket_id' => 'SUP-'.$date->format('Y-md').'-'.$seq,
            'status_id' => $status->id,
        ]));

        TicketStatusHistory::create([
            'ticket_id'     => $ticket->id,
            'new_status_id' => $status->id,
            'changed_by'    => $request->user()->id,
        ]);

        return response()->json($ticket->load(['status', 'priority', 'category']), 201);
    }

    public function show(Ticket $ticket)
    {
        return response()->json(
            $ticket->load(['status', 'priority', 'category', 'company', 'intakeChannel',
                'assignedCsr', 'bridgePerson', 'developer', 'qa',
                'comments.author', 'tags', 'statusHistory.changedBy'])
        );
    }

    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'priority_id' => 'sometimes|integer|exists:ticket_priorities,id',
            'category_id' => 'sometimes|integer|exists:ticket_categories,id',
            'sprint_id'   => 'nullable|integer|exists:sprints,id',
        ]);

        $ticket->update($validated);
        return response()->json($ticket->fresh(['status', 'priority', 'category']));
    }

    public function destroy(Ticket $ticket)
    {
        $ticket->delete();
        return response()->json(null, 204);
    }

    public function addComment(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'content'      => 'required|string',
            'comment_type' => 'required|in:Client_Facing,Internal_Note',
            'channel'      => 'sometimes|in:Email,WhatsApp,Phone,Portal,Internal',
        ]);

        $comment = TicketComment::create(array_merge($validated, [
            'ticket_id' => $ticket->id,
            'author_id' => $request->user()->id,
            'channel'   => $validated['channel'] ?? 'Portal',
        ]));

        if (! $ticket->first_responded_at && $validated['comment_type'] === 'Client_Facing') {
            $ticket->update(['first_responded_at' => now()]);
        }

        return response()->json($comment->load('author'), 201);
    }

    public function updateStatus(Request $request, Ticket $ticket)
    {
        $request->validate([
            'status_id' => 'required|integer|exists:ticket_statuses,id',
            'note'      => 'nullable|string|max:255',
        ]);

        TicketStatusHistory::create([
            'ticket_id'     => $ticket->id,
            'old_status_id' => $ticket->status_id,
            'new_status_id' => $request->status_id,
            'changed_by'    => $request->user()->id,
            'note'          => $request->note,
        ]);

        $updates = ['status_id' => $request->status_id];
        $status  = TicketStatus::find($request->status_id);

        if ($status->name === 'Resolved')        $updates['resolved_at'] = now();
        if ($status->name === 'Deployed')         $updates['deployed_at'] = now();
        if ($status->name === 'Closed')           $updates['closed_at']   = now();
        if ($status->name === 'Waiting for Client') $updates['sla_paused_at'] = now();
        if ($ticket->status?->name === 'Waiting for Client') $updates['sla_paused_at'] = null;

        $ticket->update($updates);
        return response()->json($ticket->fresh('status'));
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $request->validate([
            'role'    => 'required|in:csr,bridge,developer,qa',
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $field = match ($request->role) {
            'csr'       => 'assigned_csr_id',
            'bridge'    => 'bridge_person_id',
            'developer' => 'assigned_developer_id',
            'qa'        => 'assigned_qa_id',
        };

        $ticket->update([$field => $request->user_id]);
        return response()->json($ticket->fresh(['assignedCsr', 'bridgePerson', 'developer', 'qa']));
    }

    public function rate(Request $request, Ticket $ticket)
    {
        $request->validate([
            'csat_score'   => 'required|integer|min:1|max:5',
            'csat_comment' => 'nullable|string|max:1000',
        ]);

        $ticket->update([
            'csat_score'   => $request->csat_score,
            'csat_comment' => $request->csat_comment,
        ]);

        return response()->json([
            'csat_score'   => $ticket->csat_score,
            'csat_comment' => $ticket->csat_comment,
        ]);
    }
}
