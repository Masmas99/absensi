<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case HrAdmin = 'hr_admin';
    case Manager = 'manager';
    case Employee = 'employee';

    /**
     * Get the human-readable label for the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::Superadmin => 'Superadmin',
            self::HrAdmin => 'HR Admin',
            self::Manager => 'Manager',
            self::Employee => 'Karyawan (Employee)',
        };
    }

    /**
     * Get the description of the role's responsibilities.
     */
    public function description(): string
    {
        return match ($this) {
            self::Superadmin => 'Akses penuh ke seluruh konfigurasi sistem, pengguna, dan data absensi.',
            self::HrAdmin => 'Mengelola data karyawan, jadwal kerja, cuti/izin, dan rekapitulasi absensi.',
            self::Manager => 'Memantau kehadiran tim/divisi dan menyetujui pengajuan izin atau lembur.',
            self::Employee => 'Melakukan check-in/check-out absensi serta mengajukan izin atau cuti.',
        };
    }

    /**
     * Get all role values as a list of strings.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
