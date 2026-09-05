<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvitationAndAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_team_invitation(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        Sanctum::actingAs($owner);

        $this->postJson('/api/team/invitations', ['email' => 'new@example.com', 'role' => 'employee'])
            ->assertCreated()
            ->assertJsonStructure(['token', 'expires_at']);
    }

    public function test_employee_cannot_create_team_invitation(): void
    {
        $employee = User::factory()->create(['role' => 'employee']);
        Sanctum::actingAs($employee);

        $this->postJson('/api/team/invitations', ['email' => 'new@example.com', 'role' => 'employee'])
            ->assertForbidden();
    }
}
