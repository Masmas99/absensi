<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendanceQrSession;
use App\Models\User;
use Illuminate\Database\Seeder;

class AttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $today = now();
        $superadmin = User::query()->where('role', UserRole::Superadmin)->first();

        AttendanceQrSession::query()->updateOrCreate(
            ['date' => $today->toDateString()],
            [
                'token' => 'ABSEN-'.$today->format('Ymd').'-KANTOR',
                'title' => 'Presensi Reguler Kantor Pusat',
                'is_active' => true,
                'created_by' => $superadmin?->id,
            ],
        );

        $employees = User::query()
            ->where('role', UserRole::Employee)
            ->orderBy('id')
            ->get();

        if ($employees->isEmpty()) {
            return;
        }

        foreach ($employees as $index => $employee) {
            // Seed past 3 days of attendance history
            for ($daysAgo = 3; $daysAgo >= 1; $daysAgo--) {
                $date = $today->copy()->subDays($daysAgo)->toDateString();
                $isLate = ($daysAgo + $index) % 3 === 0;

                Attendance::query()->updateOrCreate(
                    [
                        'user_id' => $employee->id,
                        'date' => $date,
                    ],
                    [
                        'check_in' => $isLate ? '08:22:00' : '07:52:00',
                        'check_out' => '17:05:00',
                        'status' => $isLate ? 'late' : 'present',
                        'notes' => $isLate ? 'Scan QR - Terlambat' : 'Scan QR - Kantor Pusat',
                    ],
                );
            }
        }

        // Seed today's attendance for primary employee so dashboard has immediate live data
        $firstEmployee = $employees->first();
        if ($firstEmployee) {
            Attendance::query()->updateOrCreate(
                [
                    'user_id' => $firstEmployee->id,
                    'date' => $today->toDateString(),
                ],
                [
                    'check_in' => '07:56:00',
                    'check_out' => null,
                    'status' => 'present',
                    'notes' => 'Scan QR - Kantor Pusat',
                ],
            );
        }
    }
}
