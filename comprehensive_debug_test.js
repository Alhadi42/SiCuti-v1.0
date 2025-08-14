// Comprehensive debug test for leave proposals
// Run this in browser console to diagnose the issue

console.log("🔍 Starting comprehensive debug for leave proposals...");

// Get current user info
const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
console.log("👤 Current user session:", currentUser);

// Test 1: Basic connectivity
async function testBasicConnectivity() {
    console.log("🔌 Testing basic Supabase connectivity...");
    
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("count", { count: "exact", head: true });
            
        if (error) {
            console.error("❌ Basic connectivity failed:", error);
            return false;
        }
        
        console.log("✅ Basic connectivity OK");
        return true;
    } catch (err) {
        console.error("❌ Exception in connectivity test:", err);
        return false;
    }
}

// Test 2: Check if tables exist
async function testTableExistence() {
    console.log("🗃️ Testing table existence...");
    
    const tables = ['leave_proposals', 'leave_proposal_items'];
    const results = {};
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select("count", { count: "exact", head: true });
                
            if (error) {
                console.error(`❌ Table ${table} error:`, error);
                results[table] = { exists: false, error: error.message };
            } else {
                console.log(`✅ Table ${table} exists`);
                results[table] = { exists: true, count: data };
            }
        } catch (err) {
            console.error(`❌ Exception testing ${table}:`, err);
            results[table] = { exists: false, error: err.message };
        }
    }
    
    console.log("📊 Table existence results:", results);
    return results;
}

// Test 3: Raw query without RLS
async function testRawProposalsQuery() {
    console.log("📝 Testing raw proposals query...");
    
    try {
        const { data, error, count } = await supabase
            .from("leave_proposals")
            .select("*", { count: "exact" });
            
        if (error) {
            console.error("❌ Raw query failed:", error);
            console.error("Error code:", error.code);
            console.error("Error details:", error.details);
            return null;
        }
        
        console.log("✅ Raw query success!");
        console.log("📊 Total count:", count);
        console.log("📋 Data sample:", data?.slice(0, 3));
        
        if (data && data.length > 0) {
            console.log("🔍 Detailed first proposal:");
            const first = data[0];
            Object.keys(first).forEach(key => {
                console.log(`   ${key}: ${first[key]}`);
            });
        }
        
        return data;
    } catch (err) {
        console.error("❌ Exception in raw query:", err);
        return null;
    }
}

// Test 4: Query proposal items
async function testProposalItemsQuery() {
    console.log("📝 Testing proposal items query...");
    
    try {
        const { data, error, count } = await supabase
            .from("leave_proposal_items")
            .select("*", { count: "exact" });
            
        if (error) {
            console.error("❌ Items query failed:", error);
            return null;
        }
        
        console.log("✅ Items query success!");
        console.log("📊 Total items count:", count);
        console.log("📋 Items sample:", data?.slice(0, 3));
        
        return data;
    } catch (err) {
        console.error("❌ Exception in items query:", err);
        return null;
    }
}

// Test 5: Check specific user proposals
async function testUserSpecificProposals() {
    console.log("👤 Testing user-specific proposals...");
    
    try {
        // Look for proposals by name
        const { data: byName, error: nameError } = await supabase
            .from("leave_proposals")
            .select("*")
            .ilike("proposer_name", "%ali%hamzah%");
            
        if (nameError) {
            console.error("❌ Name search failed:", nameError);
        } else {
            console.log("📋 Proposals by name (Ali Hamzah):", byName);
        }
        
        // Look for proposals by unit
        const { data: byUnit, error: unitError } = await supabase
            .from("leave_proposals")
            .select("*")
            .ilike("proposer_unit", "%sekretariat%");
            
        if (unitError) {
            console.error("❌ Unit search failed:", unitError);
        } else {
            console.log("📋 Proposals by unit (sekretariat):", byUnit);
        }
        
        return { byName, byUnit };
    } catch (err) {
        console.error("❌ Exception in user-specific test:", err);
        return null;
    }
}

// Test 6: Check RLS policies
async function testRLSPolicies() {
    console.log("🔒 Testing RLS policies info...");
    
    try {
        // This might not work depending on permissions, but worth trying
        const { data, error } = await supabase.rpc('get_table_policies', { table_name: 'leave_proposals' });
        
        if (error) {
            console.log("ℹ️ Cannot query RLS policies directly (expected)");
        } else {
            console.log("🔒 RLS policies:", data);
        }
    } catch (err) {
        console.log("ℹ️ RLS policy check not available");
    }
}

// Run all tests
async function runComprehensiveDebug() {
    console.log("🚀 Running comprehensive debug tests...");
    console.log("=" * 50);
    
    const results = {
        connectivity: await testBasicConnectivity(),
        tables: await testTableExistence(),
        proposals: await testRawProposalsQuery(),
        items: await testProposalItemsQuery(),
        userSpecific: await testUserSpecificProposals()
    };
    
    await testRLSPolicies();
    
    console.log("=" * 50);
    console.log("📊 COMPREHENSIVE DEBUG RESULTS:");
    console.log(JSON.stringify(results, null, 2));
    
    // Summary
    console.log("📝 SUMMARY:");
    console.log(`✅ Connectivity: ${results.connectivity ? 'OK' : 'FAILED'}`);
    console.log(`✅ Tables exist: ${results.tables.leave_proposals?.exists ? 'YES' : 'NO'}`);
    console.log(`✅ Proposals found: ${results.proposals?.length || 0}`);
    console.log(`✅ Items found: ${results.items?.length || 0}`);
    
    if (results.proposals && results.proposals.length > 0) {
        console.log("🎯 GOOD NEWS: Proposals exist in database!");
        console.log("🔍 Issue might be in frontend filtering or RLS policies");
    } else {
        console.log("⚠️ No proposals found in database");
        console.log("🔍 Issue: Data was not saved or RLS is blocking access");
    }
    
    return results;
}

// Auto-run
runComprehensiveDebug();

// Make available for manual testing
window.comprehensiveDebug = {
    runComprehensiveDebug,
    testBasicConnectivity,
    testTableExistence,
    testRawProposalsQuery,
    testProposalItemsQuery,
    testUserSpecificProposals,
    testRLSPolicies
};

console.log("💡 Functions available:");
console.log("- comprehensiveDebug.runComprehensiveDebug()");
console.log("- comprehensiveDebug.testRawProposalsQuery()");
console.log("- comprehensiveDebug.testUserSpecificProposals()");
