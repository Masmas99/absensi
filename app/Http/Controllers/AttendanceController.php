<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendanceQrSession;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the dedicated camera QR scanner page (/presensi).
     */
    public function presensi(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $today = now()->toDateString();

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

        $myTodayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        return Inertia::render('Attendance/Presensi', [
            'myTodayAttendance' => $myTodayAttendance,
            'todayQrSession' => [
                'id' => $todayQrSession->id,
                'date' => $todayQrSession->date?->format('Y-m-d'),
                'title' => $todayQrSession->title,
                'is_active' => $todayQrSession->is_active,
            ],
        ]);
    }

    /**
     * Display the dedicated attendance history page (/riwayat).
     */
    public function history(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();

        $myTodayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $attendances = Attendance::query()
            ->where('user_id', $user->id)
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(31)
            ->get();

        $monthCounts = Attendance::query()
            ->where('user_id', $user->id)
            ->whereYear('date', now()->year)
            ->whereMonth('date', now()->month)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('Attendance/History', [
            'myTodayAttendance' => $myTodayAttendance,
            'attendances' => $attendances,
            'monthlySummary' => [
                'present' => (int) ($monthCounts['present'] ?? 0),
                'late' => (int) ($monthCounts['late'] ?? 0),
                'leave' => (int) (($monthCounts['leave'] ?? 0) + ($monthCounts['sick'] ?? 0)),
            ],
        ]);
    }

    /**
     * Generate or refresh today's QR Code session (Superadmin action).
     */
    public function generateQr(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:100'],
        ]);

        $today = now()->toDateString();

        $qrSession = AttendanceQrSession::query()->updateOrCreate(
            ['date' => $today],
            [
                'token' => AttendanceQrSession::generateToken($today),
                'title' => $validated['title'] ?? 'Presensi Reguler Kantor Pusat',
                'is_active' => true,
                'created_by' => $request->user()->id,
            ],
        );

        return back()->with('success', "QR Code baru berhasil dibuat ({$qrSession->token}).");
    }

    /**
     * Toggle active status of today's QR Code session (Superadmin action).
     */
    public function toggleQr(Request $request): RedirectResponse
    {
        $today = now()->toDateString();

        $qrSession = AttendanceQrSession::query()->whereDate('date', $today)->first();

        if (! $qrSession) {
            $qrSession = AttendanceQrSession::query()->create([
                'date' => $today,
                'token' => AttendanceQrSession::generateToken($today),
                'title' => 'Presensi Reguler Kantor Pusat',
                'is_active' => true,
                'created_by' => $request->user()->id,
            ]);

            return back()->with('success', 'Sesi QR Code hari ini telah diaktifkan.');
        }

        $qrSession->update([
            'is_active' => ! $qrSession->is_active,
        ]);

        $statusText = $qrSession->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Sesi QR Code absensi hari ini berhasil {$statusText}.");
    }

    /**
     * Record today's check-in for the authenticated user using Superadmin's QR token.
     */
    public function checkIn(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return back()->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $validated = $request->validate([
            'qr_token' => ['required', 'string'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $today = now()->toDateString();
        $qrSession = AttendanceQrSession::query()
            ->whereDate('date', $today)
            ->where('is_active', true)
            ->first();

        if (! $qrSession || strtoupper(trim($validated['qr_token'])) !== strtoupper($qrSession->token)) {
            $message = 'Kode QR tidak valid atau sesi absensi belum diaktifkan oleh Superadmin.';

            return back()->withErrors(['qr_token' => $message])->with('error', $message);
        }

        $existing = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if ($existing && $existing->check_in) {
            return back()->with('error', 'Anda sudah melakukan Check-In hari ini pada pukul '.$existing->check_in.'.');
        }

        $currentTime = now()->format('H:i:s');
        $status = $currentTime > '08:15:00' ? 'late' : 'present';

        Attendance::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => $today,
            ],
            [
                'check_in' => $currentTime,
                'status' => $status,
                'notes' => $validated['notes'] ?? ($status === 'late' ? 'Scan QR - Terlambat' : 'Scan QR - Hadir'),
            ],
        );

        return back()->with('success', 'Scan QR berhasil! Check-In tercatat pada pukul '.$currentTime.' WIB.');
    }

    /**
     * Record today's check-out for the authenticated user using Superadmin's QR token.
     */
    public function checkOut(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return back()->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $validated = $request->validate([
            'qr_token' => ['required', 'string'],
        ]);

        $today = now()->toDateString();
        $qrSession = AttendanceQrSession::query()
            ->whereDate('date', $today)
            ->where('is_active', true)
            ->first();

        if (! $qrSession || strtoupper(trim($validated['qr_token'])) !== strtoupper($qrSession->token)) {
            $message = 'Kode QR tidak valid atau sesi absensi belum diaktifkan oleh Superadmin.';

            return back()->withErrors(['qr_token' => $message])->with('error', $message);
        }

        $attendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if (! $attendance || ! $attendance->check_in) {
            return back()->with('error', 'Anda belum melakukan Check-In hari ini.');
        }

        if ($attendance->check_out) {
            return back()->with('error', 'Anda sudah melakukan Check-Out hari ini pada pukul '.$attendance->check_out.'.');
        }

        $currentTime = now()->format('H:i:s');
        $attendance->update([
            'check_out' => $currentTime,
        ]);

        return back()->with('success', 'Scan QR berhasil! Check-Out tercatat pada pukul '.$currentTime.' WIB.');
    }

    /**
     * Update a user's role (Superadmin action).
     */
    public function updateUserRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        $roleEnum = UserRole::from($validated['role']);
        $roleModel = Role::query()->where('slug', $roleEnum->value)->first();

        $user->update([
            'role' => $roleEnum,
            'role_id' => $roleModel?->id,
        ]);

        return back()->with('success', "Role untuk {$user->name} berhasil diperbarui menjadi {$roleEnum->label()}.");
    }
}
