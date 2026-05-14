<?php

namespace App\Http\Controllers;

use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $terminalIds = TicketStatus::whereIn('name', ['Resolved', 'Deployed', 'Closed'])->pluck('id');

        $q = User::select('id', 'name', 'email', 'role', 'is_active', 'created_at')
            ->withCount([
                'assignedTickets as active_tickets_count' => function ($query) use ($terminalIds) {
                    $query->whereNotIn('status_id', $terminalIds)->whereNull('deleted_at');
                },
            ])
            ->orderBy('name');

        if ($request->filled('role')) {
            $q->where('role', $request->role);
        }

        if ($request->filled('include_inactive')) {
            // show all
        } else {
            $q->where('is_active', true);
        }

        return response()->json($q->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'role'     => 'required|in:Client,CSR,Bridge,Developer,QA,Admin,SuperAdmin,Manager,Supervisor',
        ]);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'role'      => $validated['role'],
            'is_active' => true,
        ]);

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'is_active' => $user->is_active,
        ], 201);
    }

    public function show(string $id)
    {
        $user = User::findOrFail($id);
        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $id,
            'password'  => ['sometimes', Password::min(8)],
            'role'      => 'sometimes|in:Client,CSR,Bridge,Developer,QA,Admin,SuperAdmin,Manager,Supervisor',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'is_active' => $user->is_active,
        ]);
    }

    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);
        return response()->json(null, 204);
    }
}
