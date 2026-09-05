<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'owner', 403);

        return User::query()->select('id', 'name', 'email', 'role', 'created_at')->oldest()->get();
    }

    public function assignees(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['owner', 'manager'], true), 403);

        return User::query()->select('id', 'name', 'email')->oldest()->get();
    }

    public function update(Request $request, User $user)
    {
        abort_unless($request->user()->role === 'owner', 403);

        $data = $request->validate([
            'role' => ['required', Rule::in(['owner', 'manager', 'employee'])],
        ]);

        if ($user->is($request->user()) && $data['role'] !== 'owner') {
            return response()->json(['message' => 'The workspace owner cannot remove their own owner role.'], 422);
        }

        if ($user->role === 'owner' && $data['role'] !== 'owner' && User::where('role', 'owner')->count() === 1) {
            return response()->json(['message' => 'Promote another owner before changing the only owner.'], 422);
        }

        $user->update($data);

        return $user->only(['id', 'name', 'email', 'role']);
    }

    public function invite(Request $request)
    {
        abort_unless($request->user()->role === 'owner', 403);
        $data = $request->validate(['email' => 'required|email', 'role' => ['required', Rule::in(['manager', 'employee'])]]);
        $token = Str::random(64);
        \DB::table('team_invitations')->insert(['invited_by' => $request->user()->id, 'email' => $data['email'], 'role' => $data['role'], 'token' => $token, 'expires_at' => now()->addDays(7), 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['message' => 'Invitation created.', 'token' => $token, 'expires_at' => now()->addDays(7)], 201);
    }
}
