<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => UserRole::Employee->label(),
            'slug' => UserRole::Employee->value,
            'description' => UserRole::Employee->description(),
        ];
    }

    /**
     * Set the role state from a UserRole enum case.
     */
    public function forRole(UserRole $role): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $role->label(),
            'slug' => $role->value,
            'description' => $role->description(),
        ]);
    }
}
