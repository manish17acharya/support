<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketComment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'ticket_id',
        'author_id',
        'content',
        'comment_type',
        'channel',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
