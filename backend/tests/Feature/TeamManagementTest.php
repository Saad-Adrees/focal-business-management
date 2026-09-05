<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeamManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_and_update_team_roles(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $employee = User::factory()->create(['role' => 'employee']);
        Sanctum::actingAs($owner);

        $this->getJson('/api/team')->assertOk()->assertJsonCount(2);
        $this->patchJson('/api/team/' . $employee->id, ['role' => 'manager'])
            ->assertOk()
            ->assertJsonPath('role', 'manager');
    }

    public function test_employee_cannot_manage_team(): void
    {
        $employee = User::factory()->create(['role' => 'employee']);
        Sanctum::actingAs($employee);

        $this->getJson('/api/team')->assertForbidden();
    }
}
