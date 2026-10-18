<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendanceQrSession;
use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();

        // Ensure single official QR session exists for today
        $todayQrSession = AttendanceQrSession::ensureSingleSession($user->id);

        $roleCounts = User::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $schoolSetting = SchoolSetting::current();

        // Personal attendance data (for regular user / Siswa)
        $myTodayAttendance = null;
        $myAttendanceHistory = collect();
        $myMonthCounts = collect();

        if (! $user->isSuperadmin()) {
            $myTodayAttendance = Attendance::query()
                ->where('user_id', $user->id)
                ->whereDate('date', $today)
                ->first();

            $myAttendanceHistory = Attendance::query()
                ->where('user_id', $user->id)
                ->orderByDesc('date')
                ->orderByDesc('id')
                ->limit(7)
                ->get();

            $myMonthCounts = Attendance::query()
                ->where('user_id', $user->id)
                ->whereYear('date', now()->year)
                ->whereMonth('date', now()->month)
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');
        }

        // Real-time attendance monitoring for today
        $todayAttendancesByUser = Attendance::query()
            ->whereDate('date', $today)
            ->get()
            ->keyBy('user_id');

        $students = User::query()
            ->where('role', UserRole::Siswa)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role']);

        $todayTeamAttendances = $students->map(function (User $student) use ($todayAttendancesByUser): array {
            /** @var Attendance|null $record */
            $record = $todayAttendancesByUser->get($student->id);

            return [
                'user_id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'check_in' => $record?->check_in,
                'check_out' => $record?->check_out,
                'status' => $record ? $record->status : 'not_yet',
                'status_label' => $record ? $record->statusLabel() : 'Belum Absen',
                'distance_meters' => $record?->distance_meters,
                'notes' => $record?->notes ?? '-',
            ];
        })->values();

        $onTimeToday = $todayAttendancesByUser->where('status', 'present')->count();
        $lateToday = $todayAttendancesByUser->where('status', 'late')->count();
        $leaveToday = $todayAttendancesByUser->whereIn('status', ['leave', 'sick'])->count();
        $presentToday = $onTimeToday + $lateToday;
        $siswaCount = (int) ($roleCounts[UserRole::Siswa->value] ?? 0);
        $superadminCount = (int) ($roleCounts[UserRole::Superadmin->value] ?? 0);
        $checkedInCount = $todayTeamAttendances->where('status', '!=', 'not_yet')->count();

        return Inertia::render('Dashboard', [
            'todayDate' => $today,
            'todayQrSession' => $todayQrSession ? [
                'id' => $todayQrSession->id,
                'date' => $todayQrSession->date?->format('Y-m-d'),
                'title' => $todayQrSession->title,
                'is_active' => $todayQrSession->is_active,
                'token' => ($user->isSuperadmin() || $todayQrSession->is_active) ? $todayQrSession->token : null,
            ] : null,
            'stats' => [
                'total_users' => User::query()->count(),
                'superadmin_count' => $superadminCount,
                'siswa_count' => $siswaCount,
                'present_today' => $presentToday,
                'on_time_today' => $onTimeToday,
                'late_today' => $lateToday,
                'leave_today' => $leaveToday,
                'sick_today' => $todayAttendancesByUser->where('status', 'sick')->count(),
                'leave_only_today' => $todayAttendancesByUser->where('status', 'leave')->count(),
                'not_checked_in_today' => max(0, $siswaCount - $checkedInCount),
                'enable_gps_validation' => (bool) $schoolSetting->enable_gps_validation,
                'radius_meters' => (int) $schoolSetting->radius_meters,
            ],
            'myTodayAttendance' => $myTodayAttendance,
            'myAttendanceHistory' => $myAttendanceHistory,
            'myMonthlySummary' => [
                'present' => (int) ($myMonthCounts['present'] ?? 0),
                'late' => (int) ($myMonthCounts['late'] ?? 0),
                'leave' => (int) (($myMonthCounts['leave'] ?? 0) + ($myMonthCounts['sick'] ?? 0)),
            ],
            'todayTeamAttendances' => $todayTeamAttendances,
            'schoolSetting' => [
                'id' => $schoolSetting->id,
                'school_name' => $schoolSetting->school_name,
                'latitude' => (float) $schoolSetting->latitude,
                'longitude' => (float) $schoolSetting->longitude,
                'radius_meters' => (int) $schoolSetting->radius_meters,
                'check_in_start' => substr((string) $schoolSetting->check_in_start, 0, 5),
                'check_in_end' => substr((string) $schoolSetting->check_in_end, 0, 5),
                'late_threshold' => substr((string) $schoolSetting->late_threshold, 0, 5),
                'check_out_start' => substr((string) $schoolSetting->check_out_start, 0, 5),
                'check_out_end' => substr((string) $schoolSetting->check_out_end, 0, 5),
                'enable_gps_validation' => (bool) $schoolSetting->enable_gps_validation,
            ],
        ]);
    }
}
