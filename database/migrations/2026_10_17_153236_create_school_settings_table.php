<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('school_settings', function (Blueprint $table) {
            $table->id();
            $table->string('school_name')->default('Lokasi Presensi Utama');
            $table->decimal('latitude', 10, 7)->default(-6.2088000);
            $table->decimal('longitude', 10, 7)->default(106.8456000);
            $table->unsignedInteger('radius_meters')->default(100);
            $table->time('check_in_start')->default('06:30:00');
            $table->time('check_in_end')->default('08:00:00');
            $table->time('late_threshold')->default('08:15:00');
            $table->time('check_out_start')->default('15:00:00');
            $table->time('check_out_end')->default('18:00:00');
            $table->boolean('enable_gps_validation')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_settings');
    }
};
