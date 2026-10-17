<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AttendanceQrSession;
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

        Route::middleware(['web', 'auth', 'role:superadmin,hr_admin'])
            ->get('/_test/hr-only', fn () => response()->json(['ok' => true]));

        Route::middleware(['web', 'auth', 'role:manager'])
            ->get('/_test/manager-only', fn () => response()->json(['ok' => true]));
    }

    public function test_role_seeder_creates_all_four_attendance_roles(): void
    {
        $this->seed(RoleSeeder::class);

        $this->assertDatabaseCount('roles', 4);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::Superadmin->value,
            'name' => 'Superadmin',
        ]);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::HrAdmin->value,
            'name' => 'HR Admin',
        ]);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::Manager->value,
            'name' => 'Manager',
        ]);
        $this->assertDatabaseHas('roles', [
            'slug' => UserRole::Employee->value,
            'name' => 'Karyawan (Employee)',
        ]);
    }

    public function test_database_seeder_creates_default_users_for_each_role(): void
    {
        $this->seed(DatabaseSeeder::class);

        $superadmin = User::where('email', 'superadmin@absensi.test')->firstOrFail();
        $hrAdmin = User::where('email', 'hr@absensi.test')->firstOrFail();
        $manager = User::where('email', 'manager@absensi.test')->firstOrFail();
        $employee = User::where('email', 'karyawan@absensi.test')->firstOrFail();

        $this->assertTrue($superadmin->isSuperadmin());
        $this->assertSame('Superadmin', $superadmin->roleLabel());
        $this->assertNotNull($superadmin->role_id);

        $this->assertTrue($hrAdmin->isHrAdmin());
        $this->assertSame('HR Admin', $hrAdmin->roleLabel());

        $this->assertTrue($manager->isManager());
        $this->assertSame('Manager', $manager->roleLabel());

        $this->assertTrue($employee->isEmployee());
        $this->assertSame('Karyawan (Employee)', $employee->roleLabel());
    }

    public function test_new_user_defaults_to_employee_role(): void
    {
        $user = User::factory()->create();

        $this->assertSame(UserRole::Employee, $user->role);
        $this->assertTrue($user->isEmployee());
        $this->assertSame('Karyawan (Employee)', $user->role_label);
    }

    public function test_role_middleware_allows_authorized_roles_and_blocks_others(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $hrAdmin = User::factory()->hrAdmin()->create();
        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->create();

        $this->actingAs($superadmin)->get('/_test/hr-only')->assertOk();
        $this->actingAs($hrAdmin)->get('/_test/hr-only')->assertOk();
        $this->actingAs($manager)->get('/_test/hr-only')->assertForbidden();
        $this->actingAs($employee)->get('/_test/hr-only')->assertForbidden();

        $this->actingAs($manager)->get('/_test/manager-only')->assertOk();
        $this->actingAs($superadmin)->get('/_test/manager-only')->assertForbidden();
    }

    public function test_dashboard_displays_role_statistics_and_users(): void
    {
        $this->seed(DatabaseSeeder::class);

        $superadmin = User::where('email', 'superadmin@absensi.test')->firstOrFail();

        $response = $this->actingAs($superadmin)->get(route('dashboard'));

        $response->assertOk();
    }

    public function test_employee_can_check_in_and_check_out_using_superadmin_qr_token(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $employee = User::factory()->employee()->create();

        $qrSession = AttendanceQrSession::factory()->create([
            'date' => now()->toDateString(),
            'token' => 'ABSEN-TEST-VALID',
            'is_active' => true,
            'created_by' => $superadmin->id,
        ]);

        $this->actingAs($employee)
            ->post(route('attendance.check-in'), [
                'qr_token' => $qrSession->token,
                'notes' => 'WFO Kantor Pusat',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $employee->id,
            'notes' => 'WFO Kantor Pusat',
        ]);

        $this->actingAs($employee)
            ->post(route('attendance.check-out'), [
                'qr_token' => $qrSession->token,
            ])
            ->assertRedirect();

        $attendance = $employee->attendances()->first();
        $this->assertNotNull($attendance?->check_in);
        $this->assertNotNull($attendance?->check_out);
    }

    public function test_employee_cannot_check_in_with_invalid_qr_token(): void
    {
        $employee = User::factory()->employee()->create();

        AttendanceQrSession::factory()->create([
            'date' => now()->toDateString(),
            'token' => 'ABSEN-REAL-TOKEN',
            'is_active' => true,
        ]);

        $this->actingAs($employee)
            ->post(route('attendance.check-in'), [
                'qr_token' => 'TOKEN-SALAH',
                'notes' => 'WFO',
            ])
            ->assertSessionHasErrors('qr_token');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_superadmin_can_generate_qr_and_does_not_have_self_attendance(): void
    {
        $superadmin = User::factory()->superadmin()->create();

        $this->actingAs($superadmin)
            ->post(route('attendance.qr.generate'), [
                'title' => 'QR Lobby Utama',
            ])
            ->assertRedirect();

        $qrSession = AttendanceQrSession::whereDate('date', now()->toDateString())->firstOrFail();
        $this->assertSame('QR Lobby Utama', $qrSession->title);
        $this->assertTrue($qrSession->is_active);

        $this->actingAs($superadmin)
            ->post(route('attendance.check-in'), [
                'qr_token' => $qrSession->token,
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('attendances', [
            'user_id' => $superadmin->id,
        ]);
    }

    public function test_superadmin_can_update_user_role_while_other_roles_cannot(): void
    {
        $this->seed(RoleSeeder::class);

        $superadmin = User::factory()->superadmin()->create();
        $hrAdmin = User::factory()->hrAdmin()->create();
        $employee = User::factory()->employee()->create();

        $this->actingAs($hrAdmin)
            ->patch(route('users.update-role', $employee), ['role' => UserRole::Manager->value])
            ->assertForbidden();

        $this->actingAs($superadmin)
            ->patch(route('users.update-role', $employee), ['role' => UserRole::Manager->value])
            ->assertRedirect();

        $this->assertTrue($employee->fresh()->isManager());
    }
}
