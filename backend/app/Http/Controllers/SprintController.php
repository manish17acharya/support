<?php

namespace App\Http\Controllers;

use App\Models\Sprint;
use Illuminate\Http\Request;

class SprintController extends Controller
{
    public function index()
    {
        return response()->json(
            Sprint::withCount('tickets')
                ->orderByDesc('start_date')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
            'status'     => 'sometimes|in:Planned,Active,Completed',
            'notes'      => 'nullable|string',
        ]);
        return response()->json(
            Sprint::create(array_merge($validated, ['created_by' => $request->user()->id])),
            201
        );
    }

    public function show(Sprint $sprint)
    {
        return response()->json($sprint->loadCount('tickets'));
    }

    public function update(Request $request, Sprint $sprint)
    {
        $validated = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'start_date' => 'sometimes|date',
            'end_date'   => 'sometimes|date',
            'status'     => 'sometimes|in:Planned,Active,Completed',
            'notes'      => 'nullable|string',
        ]);
        $sprint->update($validated);
        return response()->json($sprint->fresh());
    }

    public function destroy(Sprint $sprint)
    {
        $sprint->delete();
        return response()->json(null, 204);
    }
}
