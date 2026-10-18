<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AttendanceQrSession;
use App\Models\SchoolSetting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['web', 'auth', 'role:superadmin'])
            ->get('/_test/superadmin-only', fn () => response()->json(['ok' => true]));
    }

    public function test_role_seeder_creates_both_roles(): void
    {
        $this->seed(RoleSeeder::class);

        $this->assertDatabaseCount('roles', 2);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::Superadmin->value,
            'name' => 'Super Admin',
        ]);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::Siswa->value,
            'name' => 'User / Siswa',
        ]);
        $this->assertDatabaseMissing('roles', [
            'slug' => 'guru',
        ]);
    }

    public function test_database_seeder_creates_default_users(): void
    {
        $this->seed(DatabaseSeeder::class);

        $superadmin = User::where('email', 'superadmin@absensi.test')->firstOrFail();
        $siswa = User::where('email', 'siswa@absensi.test')->firstOrFail();

        $this->assertTrue($superadmin->isSuperadmin());
        $this->assertSame('Super Admin', $superadmin->roleLabel());
        $this->assertNotNull($superadmin->role_id);

        $this->assertTrue($siswa->isSiswa());
        $this->assertSame('User / Siswa', $siswa->roleLabel());

        $this->assertNull(User::where('email', 'guru@absensi.test')->first());
    }

    public function test_new_user_defaults_to_siswa_role(): void
    {
        $user = User::factory()->create();

        $this->assertSame(UserRole::Siswa, $user->role);
        $this->assertTrue($user->isSiswa());
        $this->assertSame('User / Siswa', $user->role_label);
    }

    public function test_role_middleware_restricts_superadmin_routes(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();

        $this->actingAs($superadmin)->get('/_test/superadmin-only')->assertOk();
        $this->actingAs($siswa)->get('/_test/superadmin-only')->assertForbidden();
    }

    public function test_dashboard_accessible_for_both_roles(): void
    {
        $this->seed(DatabaseSeeder::class);

        $superadmin = User::where('email', 'superadmin@absensi.test')->firstOrFail();
        $siswa = User::where('email', 'siswa@absensi.test')->firstOrFail();

        $this->actingAs($superadmin)->get(route('dashboard'))->assertOk();
        $this->actingAs($siswa)->get(route('dashboard'))->assertOk();
    }

    public function test_siswa_can_check_in_within_gps_radius_using_qr(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();

        // School/Office setting center coordinate: -6.2088, 106.8456 (Radius 100m)
        SchoolSetting::current()->update([
            'latitude' => -6.2088000,
            'longitude' => 106.8456000,
            'radius_meters' => 100,
            'check_in_start' => '00:00:00',
            'check_in_end' => '23:59:00',
            'late_threshold' => '23:59:59',
            'check_out_start' => '00:00:00',
            'check_out_end' => '23:59:59',
            'enable_gps_validation' => true,
        ]);

        $qrSession = AttendanceQrSession::factory()->create([
            'date' => now()->toDateString(),
            'token' => 'ABSEN-TEST-VALID',
            'is_active' => true,
            'created_by' => $superadmin->id,
        ]);

        // Very close coordinate (~10 meters away)
        $this->actingAs($siswa)
            ->post(route('attendance.check-in'), [
                'qr_token' => $qrSession->token,
                'latitude' => -6.2088500,
                'longitude' => 106.8456500,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $siswa->id,
            'status' => 'present',
        ]);

        $attendance = $siswa->attendances()->first();
        $this->assertNotNull($attendance?->check_in);
        $this->assertNotNull($attendance?->distance_meters);
        $this->assertLessThanOrEqual(100, $attendance->distance_meters);

        // Check out at same location
        $this->actingAs($siswa)
            ->post(route('attendance.check-out'), [
                'qr_token' => $qrSession->token,
                'latitude' => -6.2088500,
                'longitude' => 106.8456500,
            ])
            ->assertRedirect();

        $attendance->refresh();
        $this->assertNotNull($attendance->check_out);
    }

    public function test_check_in_is_rejected_when_outside_gps_radius(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();

        SchoolSetting::current()->update([
            'latitude' => -6.2088000,
            'longitude' => 106.8456000,
            'radius_meters' => 100,
            'enable_gps_validation' => true,
        ]);

        $qrSession = AttendanceQrSession::factory()->create([
            'date' => now()->toDateString(),
            'token' => 'ABSEN-TEST-VALID',
            'is_active' => true,
            'created_by' => $superadmin->id,
        ]);

        // Coordinate far away (e.g. Bandung / several kilometers away)
        $this->actingAs($siswa)
            ->post(route('attendance.check-in'), [
                'qr_token' => $qrSession->token,
                'latitude' => -6.9175000,
                'longitude' => 107.6191000,
            ])
            ->assertSessionHasErrors('location');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_check_in_is_rejected_when_gps_is_missing_and_validation_is_enabled(): void
    {
        $siswa = User::factory()->siswa()->create();

        SchoolSetting::current()->update([
            'enable_gps_validation' => true,
        ]);

        $qrSession = AttendanceQrSession::factory()->create([
            'date' => now()->toDateString(),
            'token' => 'ABSEN-TEST-VALID',
            'is_active' => true,
        ]);

        $this->actingAs($siswa)
            ->post(route('attendance.check-in'), [
                'qr_token' => $qrSession->token,
            ])
            ->assertSessionHasErrors('location');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_superadmin_can_access_gps_settings_page(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();

        $this->actingAs($siswa)
            ->get(route('school.settings.edit'))
            ->assertForbidden();

        $this->actingAs($superadmin)
            ->get(route('school.settings.edit'))
            ->assertOk();
    }

    public function test_superadmin_can_update_gps_settings(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();

        $payload = [
            'school_name' => 'Kantor Pusat PT Digital',
            'latitude' => -6.1754000,
            'longitude' => 106.8272000,
            'radius_meters' => 150,
            'enable_gps_validation' => true,
        ];

        // Siswa forbidden
        $this->actingAs($siswa)
            ->patch(route('school.settings.update'), $payload)
            ->assertForbidden();

        // Superadmin allowed
        $this->actingAs($superadmin)
            ->patch(route('school.settings.update'), $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('school_settings', [
            'school_name' => 'Kantor Pusat PT Digital',
            'radius_meters' => 150,
            'enable_gps_validation' => true,
        ]);
    }

    public function test_superadmin_can_update_user_attendance_status(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $siswa = User::factory()->siswa()->create();
        $otherSiswa = User::factory()->siswa()->create();

        // Superadmin marks student as present
        $this->actingAs($superadmin)
            ->patch(route('attendance.manage.update', $siswa), [
                'status' => 'present',
                'notes' => 'Diverifikasi Hadir',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $siswa->id,
            'status' => 'present',
            'notes' => 'Diverifikasi Hadir',
        ]);

        // Siswa cannot update attendance of other users
        $this->actingAs($otherSiswa)
            ->patch(route('attendance.manage.update', $siswa), [
                'status' => 'present',
            ])
            ->assertForbidden();
    }
}
