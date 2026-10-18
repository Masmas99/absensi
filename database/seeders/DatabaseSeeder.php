<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $rolesBySlug = Role::query()->pluck('id', 'slug');

        $defaultUsers = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@absensi.test',
                'role' => UserRole::Superadmin,
            ],
            [
                'name' => 'Siswa Utama',
                'email' => 'siswa@absensi.test',
                'role' => UserRole::Siswa,
            ],
            [
                'name' => 'Budi Santoso',
                'email' => 'budi.siswa@absensi.test',
                'role' => UserRole::Siswa,
            ],
            [
                'name' => 'Siti Aminah',
                'email' => 'siti.siswa@absensi.test',
                'role' => UserRole::Siswa,
            ],
        ];

        foreach ($defaultUsers as $userData) {
            User::query()->updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'role' => $userData['role'],
                    'role_id' => $rolesBySlug[$userData['role']->value] ?? null,
                    'email_verified_at' => now(),
                    'password' => Hash::make('password'),
                ],
            );
        }

        $this->call(AttendanceSeeder::class);
    }
}
