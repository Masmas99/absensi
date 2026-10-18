<?php

namespace App\Models;

use Database\Factories\SchoolSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolSetting extends Model
{
    /** @use HasFactory<SchoolSettingFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'school_name',
        'latitude',
        'longitude',
        'radius_meters',
        'check_in_start',
        'check_in_end',
        'late_threshold',
        'check_out_start',
        'check_out_end',
        'enable_gps_validation',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'radius_meters' => 'integer',
        'enable_gps_validation' => 'boolean',
    ];

    /**
     * Helper to get singleton setting record or defaults.
     */
    public static function current(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'school_name' => 'SMK Negeri 1',
                'latitude' => -6.2088000,
                'longitude' => 106.8456000,
                'radius_meters' => 100,
                'check_in_start' => '06:30:00',
                'check_in_end' => '08:00:00',
                'late_threshold' => '08:15:00',
                'check_out_start' => '15:00:00',
                'check_out_end' => '18:00:00',
                'enable_gps_validation' => true,
            ]
        );
    }
}
