<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure roles table has superadmin, siswa
        DB::table('roles')->whereIn('slug', ['hr_admin', 'manager', 'employee', 'guru'])->delete();

        DB::table('roles')->updateOrInsert(
            ['slug' => 'superadmin'],
            [
                'name' => 'Super Admin',
                'description' => 'Akses penuh ke konfigurasi sistem, pengaturan GPS presensi, dan penyedia sesi QR Code resmi.',
                'updated_at' => now(),
            ]
        );

        DB::table('roles')->updateOrInsert(
            ['slug' => 'siswa'],
            [
                'name' => 'User / Siswa',
                'description' => 'Melakukan presensi masuk dan pulang sekolah / kantor dengan scan QR Code yang divalidasi sesuai lokasi GPS.',
                'updated_at' => now(),
            ]
        );

        // 2. Map existing users
        $siswaRoleId = DB::table('roles')->where('slug', 'siswa')->value('id');
        $superadminRoleId = DB::table('roles')->where('slug', 'superadmin')->value('id');

        DB::table('users')
            ->whereIn('role', ['hr_admin', 'manager', 'employee', 'guru'])
            ->update([
                'role' => 'siswa',
                'role_id' => $siswaRoleId,
            ]);

        DB::table('users')
            ->where('role', 'superadmin')
            ->update([
                'role_id' => $superadminRoleId,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
