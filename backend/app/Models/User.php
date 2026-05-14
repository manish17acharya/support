<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role',
        'client_company_id', 'client_contact_id',
        'is_vip', 'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_vip'            => 'boolean',
            'is_active'         => 'boolean',
        ];
    }

    public function company()
    {
        return $this->belongsTo(\App\Models\ClientCompany::class, 'client_company_id');
    }

    public function assignedTickets()
    {
        return $this->hasMany(\App\Models\Ticket::class, 'assigned_csr_id');
    }
}
