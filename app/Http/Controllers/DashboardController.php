<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendanceQrSession;
use App\Models\Role;
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

        // Ensure today's QR session exists so Superadmin and employees have an active daily session
        $todayQrSession = AttendanceQrSession::query()
            ->whereDate('date', $today)
            ->first();

        if (! $todayQrSession) {
            $superadminId = User::query()
                ->where('role', UserRole::Superadmin)
                ->value('id') ?? $user->id;

            $todayQrSession = AttendanceQrSession::query()->create([
                'date' => $today,
                'token' => AttendanceQrSession::generateToken($today),
                'title' => 'Presensi Reguler Kantor Pusat',
                'is_active' => true,
                'created_by' => $superadminId,
            ]);
        }

        $roleCounts = User::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $roles = collect(UserRole::cases())->map(fn (UserRole $role) => [
            'slug' => $role->value,
            'name' => $role->label(),
            'description' => $role->description(),
            'users_count' => (int) ($roleCounts[$role->value] ?? 0),
        ])->values();

        $recentUsers = User::query()
            ->select(['id', 'name', 'email', 'role', 'created_at'])
            ->orderBy('name')
            ->orderBy('id')
            ->limit(15)
            ->get();

        // Personal attendance data (only for non-Superadmin users)
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

        // Team / Employee attendance monitoring for today
        $todayAttendancesByUser = Attendance::query()
            ->whereDate('date', $today)
            ->get()
            ->keyBy('user_id');

        $employees = User::query()
            ->where('role', UserRole::Employee)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role']);

        $todayTeamAttendances = $employees->map(function (User $employee) use ($todayAttendancesByUser): array {
            /** @var Attendance|null $record */
            $record = $todayAttendancesByUser->get($employee->id);

            return [
                'user_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'check_in' => $record?->check_in,
                'check_out' => $record?->check_out,
                'status' => $record ? $record->status : 'not_yet',
                'status_label' => $record ? $record->statusLabel() : 'Belum Absen',
                'notes' => $record?->notes ?? '-',
            ];
        })->values();

        $recentAttendances = Attendance::query()
            ->with('user:id,name,email,role')
            ->orderByDesc('date')
            ->orderByDesc('check_in')
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $onTimeToday = $todayAttendancesByUser->where('status', 'present')->count();
        $lateToday = $todayAttendancesByUser->where('status', 'late')->count();
        $leaveToday = $todayAttendancesByUser->whereIn('status', ['leave', 'sick'])->count();
        $presentToday = $onTimeToday + $lateToday;
        $employeeCount = (int) ($roleCounts[UserRole::Employee->value] ?? 0);
        $checkedInEmployeeCount = $todayTeamAttendances->where('status', '!=', 'not_yet')->count();

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
                'total_roles' => Role::query()->count() ?: count(UserRole::cases()),
                'superadmin_count' => (int) ($roleCounts[UserRole::Superadmin->value] ?? 0),
                'hr_admin_count' => (int) ($roleCounts[UserRole::HrAdmin->value] ?? 0),
                'manager_count' => (int) ($roleCounts[UserRole::Manager->value] ?? 0),
                'employee_count' => $employeeCount,
                'present_today' => $presentToday,
                'on_time_today' => $onTimeToday,
                'late_today' => $lateToday,
                'leave_today' => $leaveToday,
                'not_checked_in_today' => max(0, $employeeCount - $checkedInEmployeeCount),
            ],
            'myTodayAttendance' => $myTodayAttendance,
            'myAttendanceHistory' => $myAttendanceHistory,
            'myMonthlySummary' => [
                'present' => (int) ($myMonthCounts['present'] ?? 0),
                'late' => (int) ($myMonthCounts['late'] ?? 0),
                'leave' => (int) (($myMonthCounts['leave'] ?? 0) + ($myMonthCounts['sick'] ?? 0)),
            ],
            'todayTeamAttendances' => $todayTeamAttendances,
            'recentAttendances' => $recentAttendances,
            'roles' => $roles,
            'recentUsers' => $recentUsers,
        ]);
    }
}
