<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        if (! $user->is_active) {
            Auth::logout();
            return response()->json(['message' => 'Your account is inactive.'], 403);
        }

        $token = $user->createToken('api-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'user'  => $user->only('id', 'name', 'email', 'role', 'is_vip'),
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'required|email|unique:users,email',
            'password'     => 'required|string|min:8',
            'company_name' => 'required|string|max:255',
        ]);

        $company = ClientCompany::firstOrCreate(
            ['name' => $validated['company_name']],
            ['primary_email' => $validated['email']]
        );

        $user = User::create([
            'name'              => $validated['name'],
            'email'             => $validated['email'],
            'password'          => bcrypt($validated['password']),
            'role'              => 'Client',
            'client_company_id' => $company->id,
            'is_active'         => true,
        ]);

        $token = $user->createToken('api-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'user'  => $user->only('id', 'name', 'email', 'role', 'is_vip', 'client_company_id'),
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->only('id', 'name', 'email', 'role', 'is_vip', 'client_company_id'));
    }
}
