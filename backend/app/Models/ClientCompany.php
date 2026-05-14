<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientCompany extends Model
{
    protected $table = 'client_companies';

    protected $fillable = ['name', 'primary_email', 'phone', 'is_vip', 'notes'];

    protected function casts(): array
    {
        return ['is_vip' => 'boolean'];
    }

    public function contacts() { return $this->hasMany(ClientContact::class, 'client_company_id'); }
    public function tickets()  { return $this->hasMany(Ticket::class, 'client_company_id'); }
}
