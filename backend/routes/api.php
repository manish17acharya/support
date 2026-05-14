<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/login',    [\App\Http\Controllers\Auth\AuthController::class, 'login']);
Route::post('/auth/register', [\App\Http\Controllers\Auth\AuthController::class, 'register']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [\App\Http\Controllers\Auth\AuthController::class, 'logout']);
    Route::get('/auth/me', [\App\Http\Controllers\Auth\AuthController::class, 'me']);

    // Tickets
    Route::apiResource('tickets', \App\Http\Controllers\TicketController::class);
    Route::post('/tickets/{ticket}/comments', [\App\Http\Controllers\TicketController::class, 'addComment']);
    Route::patch('/tickets/{ticket}/status', [\App\Http\Controllers\TicketController::class, 'updateStatus']);
    Route::patch('/tickets/{ticket}/assign', [\App\Http\Controllers\TicketController::class, 'assign']);
    Route::post('/tickets/{ticket}/rate', [\App\Http\Controllers\TicketController::class, 'rate']);

    // Dashboard
    Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index']);

    // Analytics
    Route::get('/analytics', [\App\Http\Controllers\AnalyticsController::class, 'index']);

    // Lookup data
    Route::get('/lookups', [\App\Http\Controllers\LookupController::class, 'index']);

    // Users
    Route::apiResource('users', \App\Http\Controllers\UserController::class);

    // Companies
    Route::apiResource('companies', \App\Http\Controllers\CompanyController::class);

    // Sprints
    Route::apiResource('sprints', \App\Http\Controllers\SprintController::class);

    // Knowledge Base
    Route::apiResource('kb-articles', \App\Http\Controllers\KnowledgeBaseController::class);
});
