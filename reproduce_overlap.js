
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (e) {
    console.log("No .env file found");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testOverlap() {
    const employeeId = "f030b5d8-8880-48db-9c00-2f0e4c2c728e";
    // Existing: 2025-01-22 to 2025-01-24

    // Test Case: Overlap (23rd to 25th)
    const formStartDate = "2025-01-23";
    const formEndDate = "2025-01-25";

    console.log(`Testing overlap for Employee ${employeeId}`);
    console.log(`Form Dates: ${formStartDate} to ${formEndDate}`);

    const { data: overlappingRequests, error } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date")
        .eq("employee_id", employeeId)
        .neq("status", "rejected")
        .lte('start_date', formEndDate)
        .gte('end_date', formStartDate);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Found Overlaps:", overlappingRequests.length);
        console.log(overlappingRequests);

        const overlaps = overlappingRequests.filter(req => {
            const reqStart = req.start_date; // String comparison
            const reqEnd = req.end_date;     // String comparison
            const formStart = formStartDate;
            const formEnd = formEndDate;

            return reqStart <= formEnd && reqEnd >= formStart;
        });
        console.log("Filtered Overlaps (String Compare):", overlaps.length);
    }
}

testOverlap();
