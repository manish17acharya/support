<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketStatusHistory extends Model
{
    protected $table = 'ticket_status_history';

    const UPDATED_AT = null;

    protected $fillable = ['ticket_id', 'old_status_id', 'new_status_id', 'changed_by', 'note'];

    public function oldStatus() { return $this->belongsTo(TicketStatus::class, 'old_status_id'); }
    public function newStatus() { return $this->belongsTo(TicketStatus::class, 'new_status_id'); }
    public function changedBy() { return $this->belongsTo(User::class, 'changed_by'); }
}
