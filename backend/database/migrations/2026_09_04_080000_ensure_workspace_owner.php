<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!DB::table('users')->where('role', 'owner')->exists()) {
            DB::table('users')->orderBy('id')->limit(1)->update(['role' => 'owner']);
        }
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'owner')->update(['role' => 'employee']);
    }
};
