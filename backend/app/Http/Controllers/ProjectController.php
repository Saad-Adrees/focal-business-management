<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Project::where('user_id', $request->user()->id)->with('client')->latest()->paginate(12);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required', Rule::exists('clients', 'id')->where('user_id', $request->user()->id)],
            'name' => 'required|string|max:160',
            'description' => 'nullable|string',
            'status' => 'in:planning,active,on_hold,completed',
            'due_date' => 'nullable|date'
        ]);
        return response()->json($request->user()->projects()->create($data)->load('client'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        abort_unless($project->user_id === auth()->id(), 404);
        return $project->load(['client', 'tasks']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        abort_unless($project->user_id === auth()->id(), 404);
        $project->update($request->validate([
            'client_id' => ['sometimes', Rule::exists('clients', 'id')->where('user_id', $request->user()->id)],
            'name' => 'sometimes|required|string|max:160',
            'description' => 'nullable|string',
            'status' => 'in:planning,active,on_hold,completed',
            'due_date' => 'nullable|date'
        ]));
        return $project->fresh('client');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        abort_unless($project->user_id === auth()->id(), 404);
        $project->delete();
        return response()->noContent();
    }
}
