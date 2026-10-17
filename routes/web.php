<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/presensi', [AttendanceController::class, 'presensi'])
        ->name('attendance.presensi');
    Route::get('/riwayat', [AttendanceController::class, 'history'])
        ->name('attendance.history');

    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn'])
        ->name('attendance.check-in');
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut'])
        ->name('attendance.check-out');

    Route::middleware('role:superadmin')->group(function () {
        Route::post('/attendance/qr/generate', [AttendanceController::class, 'generateQr'])
            ->name('attendance.qr.generate');
        Route::patch('/attendance/qr/toggle', [AttendanceController::class, 'toggleQr'])
            ->name('attendance.qr.toggle');
        Route::patch('/users/{user}/role', [AttendanceController::class, 'updateUserRole'])
            ->name('users.update-role');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
