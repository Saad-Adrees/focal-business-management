<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = ['client_id', 'number', 'amount', 'status', 'due_date', 'notes'];
    protected $casts = ['amount' => 'decimal:2', 'due_date' => 'date'];
    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
