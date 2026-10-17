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
                'name' => 'Superadmin Absensi',
                'email' => 'superadmin@absensi.test',
                'role' => UserRole::Superadmin,
            ],
            [
                'name' => 'HR Admin',
                'email' => 'hr@absensi.test',
                'role' => UserRole::HrAdmin,
            ],
            [
                'name' => 'Manager Divisi',
                'email' => 'manager@absensi.test',
                'role' => UserRole::Manager,
            ],
            [
                'name' => 'Karyawan',
                'email' => 'karyawan@absensi.test',
                'role' => UserRole::Employee,
            ],
            [
                'name' => 'Budi Santoso',
                'email' => 'budi.karyawan@absensi.test',
                'role' => UserRole::Employee,
            ],
            [
                'name' => 'Siti Aminah',
                'email' => 'siti.karyawan@absensi.test',
                'role' => UserRole::Employee,
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
