<?php

namespace App\Http\Middleware;

use App\Models\SchoolSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'schoolSetting' => function () use ($request) {
                if (! $request->user()) {
                    return null;
                }

                try {
                    $setting = SchoolSetting::current();

                    return $setting ? [
                        'school_name' => $setting->school_name,
                        'latitude' => (float) $setting->latitude,
                        'longitude' => (float) $setting->longitude,
                        'radius_meters' => (int) $setting->radius_meters,
                        'enable_gps_validation' => (bool) $setting->enable_gps_validation,
                    ] : null;
                } catch (\Throwable) {
                    return null;
                }
            },
        ];
    }
}
