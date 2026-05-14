<?php

namespace App\Http\Controllers;

use App\Models\KnowledgeBaseArticle;
use Illuminate\Http\Request;

class KnowledgeBaseController extends Controller
{
    public function index(Request $request)
    {
        $query = KnowledgeBaseArticle::with(['author:id,name', 'tags:id,name'])
            ->withCount('tickets as linked_tickets_count')
            ->orderByDesc('updated_at');

        if ($request->filled('search')) {
            $s = '%'.$request->search.'%';
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)->orWhere('content', 'like', $s);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        return response()->json($query->get()->map(function ($a) {
            return [
                'id'                   => $a->id,
                'title'                => $a->title,
                'category'             => $a->category,
                'status'               => $a->status,
                'author'               => $a->author?->name,
                'views'                => $a->view_count,
                'linked_tickets_count' => $a->linked_tickets_count,
                'tags'                 => $a->tags->pluck('name'),
                'updated_at'           => $a->updated_at,
                'created_at'           => $a->created_at,
            ];
        }));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'content'  => 'required|string',
            'category' => 'nullable|string|max:100',
            'status'   => 'in:Draft,Published,Archived',
        ]);

        $article = KnowledgeBaseArticle::create(array_merge($validated, [
            'author_id' => $request->user()->id,
            'status'    => $validated['status'] ?? 'Draft',
        ]));

        return response()->json($article->load('author'), 201);
    }

    public function show(string $id)
    {
        $article = KnowledgeBaseArticle::with(['author', 'tags'])->findOrFail($id);
        $article->increment('view_count');
        return response()->json($article);
    }

    public function update(Request $request, string $id)
    {
        $article = KnowledgeBaseArticle::findOrFail($id);
        $article->update($request->validate([
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'category' => 'nullable|string|max:100',
            'status'   => 'in:Draft,Published,Archived',
        ]));
        return response()->json($article->fresh(['author', 'tags']));
    }

    public function destroy(string $id)
    {
        KnowledgeBaseArticle::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
