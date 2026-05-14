<?php

namespace App\Http\Controllers;

use App\Models\ClientCompany;
use App\Models\TicketStatus;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index()
    {
        $terminalIds = TicketStatus::whereIn('name', ['Resolved', 'Deployed', 'Closed'])->pluck('id');

        $companies = ClientCompany::withCount([
            'contacts',
            'tickets as open_tickets_count' => function ($q) use ($terminalIds) {
                $q->whereNotIn('status_id', $terminalIds)->whereNull('deleted_at');
            },
            'tickets as lifetime_tickets_count' => function ($q) {
                $q->whereNull('deleted_at');
            },
        ])
        ->withAvg(['tickets as csat_avg' => function ($q) {
            $q->whereNotNull('csat_score')->whereNull('deleted_at');
        }], 'csat_score')
        ->orderBy('name')
        ->get()
        ->map(function ($c) {
            return [
                'id'                    => $c->id,
                'name'                  => $c->name,
                'primary_email'         => $c->primary_email,
                'is_vip'                => $c->is_vip,
                'contacts_count'        => $c->contacts_count,
                'open_tickets_count'    => $c->open_tickets_count,
                'lifetime_tickets_count'=> $c->lifetime_tickets_count,
                'csat_avg'              => $c->csat_avg ? round((float)$c->csat_avg, 1) : null,
            ];
        });

        return response()->json($companies);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'primary_email' => 'nullable|email|max:255',
            'phone'         => 'nullable|string|max:50',
            'is_vip'        => 'boolean',
            'notes'         => 'nullable|string',
        ]);

        $company = ClientCompany::create($validated);
        return response()->json($company, 201);
    }

    public function show(string $id)
    {
        return response()->json(ClientCompany::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $company = ClientCompany::findOrFail($id);
        $company->update($request->validate([
            'name'          => 'sometimes|string|max:255',
            'primary_email' => 'nullable|email|max:255',
            'phone'         => 'nullable|string|max:50',
            'is_vip'        => 'boolean',
            'notes'         => 'nullable|string',
        ]));
        return response()->json($company->fresh());
    }

    public function destroy(string $id)
    {
        ClientCompany::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
