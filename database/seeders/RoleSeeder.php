<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $activeSlugs = UserRole::values();
        Role::query()->whereNotIn('slug', $activeSlugs)->delete();

        foreach (UserRole::cases() as $role) {
            Role::query()->updateOrCreate(
                ['slug' => $role->value],
                [
                    'name' => $role->label(),
                    'description' => $role->description(),
                ],
            );
        }
    }
}
