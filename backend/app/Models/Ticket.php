<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ticket_id', 'title', 'description',
        'status_id', 'priority_id', 'category_id', 'intake_channel_id',
        'contact_email', 'client_company_id', 'client_contact_id', 'raised_by_csr',
        'assigned_csr_id', 'bridge_person_id', 'assigned_developer_id', 'assigned_qa_id',
        'sprint_id', 'linked_dev_task_id',
        'sla_response_breached', 'sla_resolution_breached', 'sla_paused_at',
        'first_responded_at', 'resolved_at', 'deployed_at', 'closed_at', 'reopened_count',
        'csat_score', 'csat_comment',
    ];

    protected function casts(): array
    {
        return [
            'raised_by_csr'           => 'boolean',
            'sla_response_breached'   => 'boolean',
            'sla_resolution_breached' => 'boolean',
            'sla_paused_at'           => 'datetime',
            'first_responded_at'      => 'datetime',
            'resolved_at'             => 'datetime',
            'deployed_at'             => 'datetime',
            'closed_at'               => 'datetime',
        ];
    }

    public function status()         { return $this->belongsTo(TicketStatus::class, 'status_id'); }
    public function priority()       { return $this->belongsTo(TicketPriority::class, 'priority_id'); }
    public function category()       { return $this->belongsTo(TicketCategory::class, 'category_id'); }
    public function company()        { return $this->belongsTo(ClientCompany::class, 'client_company_id'); }
    public function intakeChannel()  { return $this->belongsTo(\App\Models\IntakeChannel::class, 'intake_channel_id'); }
    public function assignedCsr()   { return $this->belongsTo(User::class, 'assigned_csr_id'); }
    public function bridgePerson()  { return $this->belongsTo(User::class, 'bridge_person_id'); }
    public function developer()     { return $this->belongsTo(User::class, 'assigned_developer_id'); }
    public function qa()            { return $this->belongsTo(User::class, 'assigned_qa_id'); }
    public function comments()      { return $this->hasMany(TicketComment::class); }
    public function statusHistory() { return $this->hasMany(TicketStatusHistory::class); }
    public function tags()          { return $this->belongsToMany(Tag::class, 'ticket_tag_map'); }
    public function sprint()        { return $this->belongsTo(Sprint::class); }
}
