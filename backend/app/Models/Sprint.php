<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sprint extends Model
{
    protected $fillable = ['name', 'start_date', 'end_date', 'status', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d'];
    }

    public function tickets()  { return $this->hasMany(Ticket::class); }
    public function creator()  { return $this->belongsTo(User::class, 'created_by'); }
}
