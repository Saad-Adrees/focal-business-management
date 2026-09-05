<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Task::whereHas('project', fn($q) => $q->where('user_id', $request->user()->id))->with(['project', 'assignee'])->latest()->paginate(20);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $task = Task::create($request->validate([
            'project_id' => ['required', Rule::exists('projects', 'id')->where('user_id', $request->user()->id)],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'title' => 'required|string|max:180',
            'description' => 'nullable|string',
            'priority' => 'in:low,medium,high',
            'status' => 'in:todo,in_progress,done',
            'due_date' => 'nullable|date'
        ]));

        return response()->json($task->load(['project', 'assignee']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Task $task)
    {
        abort_unless($task->project?->user_id === auth()->id(), 404);
        return $task->load(['project', 'assignee']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Task $task)
    {
        abort_unless($task->project?->user_id === auth()->id(), 404);
        $task->update($request->validate([
            'title' => 'sometimes|required|string|max:180',
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'description' => 'nullable|string',
            'priority' => 'in:low,medium,high',
            'status' => 'in:todo,in_progress,done',
            'due_date' => 'nullable|date'
        ]));
        return $task->fresh(['project', 'assignee']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Task $task)
    {
        abort_unless($task->project?->user_id === auth()->id(), 404);
        $task->delete();
        return response()->noContent();
    }
}
