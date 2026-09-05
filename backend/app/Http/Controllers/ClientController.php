<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return $request->user()->clients()->latest()->paginate(12);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $client = $request->user()->clients()->create($request->validate([
            'name' => 'required|string|max:120',
            'company' => 'nullable|string|max:160',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:40',
            'status' => 'in:active,inactive',
            'notes' => 'nullable|string'
        ]));
        return response()->json($client, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Client $client)
    {
        abort_unless($client->user_id === auth()->id(), 404);
        return $client->load(['projects', 'invoices']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        abort_unless($client->user_id === auth()->id(), 404);
        $client->update($request->validate([
            'name' => 'sometimes|required|string|max:120',
            'company' => 'nullable|string|max:160',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:40',
            'status' => 'in:active,inactive',
            'notes' => 'nullable|string'
        ]));
        return $client;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        abort_unless($client->user_id === auth()->id(), 404);
        $client->delete();
        return response()->noContent();
    }
}
