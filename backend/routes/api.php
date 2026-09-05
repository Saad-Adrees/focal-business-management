<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn(Request $request) => $request->user());
    Route::get('/team', [TeamController::class, 'index']);
    Route::get('/team/assignees', [TeamController::class, 'assignees'])->middleware('role:owner,manager');
    Route::patch('/team/{user}', [TeamController::class, 'update']);
    Route::post('/team/invitations', [TeamController::class, 'invite'])->middleware('role:owner');
    Route::apiResource('clients', ClientController::class)->only(['index', 'show']);
    Route::apiResource('projects', ProjectController::class)->only(['index', 'show']);
    Route::apiResource('tasks', TaskController::class)->only(['index', 'show']);
    Route::apiResource('invoices', InvoiceController::class)->only(['index', 'show']);
    Route::middleware('role:owner,manager')->group(function () {
        Route::post('clients', [ClientController::class, 'store']);
        Route::match(['put', 'patch'], 'clients/{client}', [ClientController::class, 'update']);
        Route::post('projects', [ProjectController::class, 'store']);
        Route::match(['put', 'patch'], 'projects/{project}', [ProjectController::class, 'update']);
        Route::post('tasks', [TaskController::class, 'store']);
        Route::match(['put', 'patch'], 'tasks/{task}', [TaskController::class, 'update']);
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::match(['put', 'patch'], 'invoices/{invoice}', [InvoiceController::class, 'update']);
    });
    Route::middleware('role:owner')->group(function () {
        Route::delete('clients/{client}', [ClientController::class, 'destroy']);
        Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
        Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy']);
    });
    Route::get('/dashboard', fn(Request $request) => [
        'clients' => $request->user()->clients()->count(),
        'projects' => $request->user()->projects()->count(),
        'tasks' => $request->user()->projects()->withCount('tasks')->get()->sum('tasks_count'),
        'invoices' => $request->user()->invoices()->sum('amount'),
        'paid_invoices' => $request->user()->invoices()->where('status', 'paid')->sum('amount'),
        'overdue_invoices' => $request->user()->invoices()->where('status', 'overdue')->sum('amount'),
        'recent_projects' => $request->user()->projects()->with('client')->latest()->limit(5)->get(),
        'pending_tasks' => $request->user()->projects()->with(['tasks' => fn($query) => $query->where('status', '!=', 'done')->with('assignee')])->get()->flatMap->tasks->sortByDesc('created_at')->take(5)->values(),
    ]);
});
