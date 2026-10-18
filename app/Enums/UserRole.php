<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Siswa = 'siswa';

    /**
     * Get the human-readable label for the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::Superadmin => 'Super Admin',
            self::Siswa => 'User / Siswa',
        };
    }

    /**
     * Get the description of the role's responsibilities.
     */
    public function description(): string
    {
        return match ($this) {
            self::Superadmin => 'Akses penuh ke konfigurasi sistem, pengaturan GPS presensi, dan penyedia sesi QR Code resmi.',
            self::Siswa => 'Melakukan presensi masuk dan pulang sekolah / kantor dengan scan QR Code yang divalidasi sesuai lokasi GPS.',
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
