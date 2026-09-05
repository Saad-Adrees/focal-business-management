<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Invoice::where('user_id', $request->user()->id)->with('client')->latest()->paginate(12);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required', Rule::exists('clients', 'id')->where('user_id', $request->user()->id)],
            'number' => 'required|string|max:40|unique:invoices',
            'amount' => 'required|numeric|min:0',
            'status' => 'in:draft,sent,paid,overdue',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);
        return response()->json($request->user()->invoices()->create($data)->load('client'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Invoice $invoice)
    {
        abort_unless($invoice->user_id === auth()->id(), 404);
        return $invoice->load('client');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Invoice $invoice)
    {
        abort_unless($invoice->user_id === auth()->id(), 404);
        $invoice->update($request->validate([
            'client_id' => ['sometimes', Rule::exists('clients', 'id')->where('user_id', $request->user()->id)],
            'number' => 'sometimes|required|string|max:40|unique:invoices,number,' . $invoice->id,
            'amount' => 'sometimes|numeric|min:0',
            'status' => 'in:draft,sent,paid,overdue',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]));
        return $invoice->fresh('client');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Invoice $invoice)
    {
        abort_unless($invoice->user_id === auth()->id(), 404);
        $invoice->delete();
        return response()->noContent();
    }
}
