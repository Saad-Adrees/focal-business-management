<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['client_id', 'name', 'description', 'status', 'due_date'];
    protected $casts = ['due_date' => 'date'];
    public function client()
    {
        return $this->belongsTo(Client::class);
    }
    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}
