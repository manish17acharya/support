<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnowledgeBaseArticle extends Model
{
    protected $table = 'knowledge_base_articles';

    protected $fillable = ['title', 'content', 'category', 'status', 'author_id', 'approved_by', 'approved_at', 'view_count'];

    public function author()  { return $this->belongsTo(User::class, 'author_id'); }
    public function tags()    { return $this->belongsToMany(Tag::class, 'kb_article_tag_map', 'article_id', 'tag_id'); }
    public function tickets() { return $this->belongsToMany(Ticket::class, 'kb_article_ticket_map', 'article_id', 'ticket_id'); }
}
