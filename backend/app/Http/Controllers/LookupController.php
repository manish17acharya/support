<?php

namespace App\Http\Controllers;

use App\Models\TicketStatus;
use App\Models\TicketPriority;
use App\Models\TicketCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LookupController extends Controller
{
    public function index()
    {
        return response()->json([
            'statuses'   => TicketStatus::all(),
            'priorities' => TicketPriority::orderBy('sort_order')->get(),
            'categories' => TicketCategory::all(),
            'channels'   => DB::table('intake_channels')->get(),
        ]);
    }
}
