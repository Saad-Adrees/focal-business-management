<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_cannot_create_a_client(): void
    {
        $employee = User::factory()->create(['role' => 'employee']);
        Sanctum::actingAs($employee);

        $this->postJson('/api/clients', ['name' => 'Blocked Client'])->assertForbidden();
    }

    public function test_manager_cannot_delete_a_client(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $client = $manager->clients()->create(['name' => 'Manager Client']);
        Sanctum::actingAs($manager);

        $this->deleteJson('/api/clients/' . $client->id)->assertForbidden();
    }
}
