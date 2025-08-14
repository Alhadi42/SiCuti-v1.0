// Test manual pembuatan usulan cuti
// Jalankan di browser console saat login sebagai admin unit

console.log("🧪 Testing manual proposal creation...");

async function testCreateProposalManually() {
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
    console.log("👤 Current user:", currentUser);
    
    if (!currentUser || !currentUser.id) {
        console.error("❌ No user session found!");
        return;
    }
    
    // Test 1: Create a simple proposal
    const testProposal = {
        proposal_title: "Test Usulan - " + new Date().toISOString(),
        proposed_by: currentUser.id,
        proposer_name: currentUser.name || "Test User",
        proposer_unit: currentUser.unitKerja || "Test Unit",
        notes: "Test proposal untuk debug",
        total_employees: 1,
    };
    
    console.log("📝 Creating test proposal:", testProposal);
    
    try {
        const { data: proposal, error: proposalError } = await supabase
            .from("leave_proposals")
            .insert(testProposal)
            .select()
            .single();
            
        if (proposalError) {
            console.error("❌ Error creating proposal:", proposalError);
            console.error("Error code:", proposalError.code);
            console.error("Error message:", proposalError.message);
            console.error("Error details:", proposalError.details);
            
            // Check if it's RLS issue
            if (proposalError.code === "42501") {
                console.error("🚨 RLS POLICY BLOCKING INSERT!");
                console.log("💡 Try running this to temporarily disable RLS:");
                console.log("ALTER TABLE public.leave_proposals DISABLE ROW LEVEL SECURITY;");
            }
            
            return null;
        }
        
        console.log("✅ Proposal created successfully:", proposal);
        
        // Test 2: Create proposal items
        const testItems = [{
            proposal_id: proposal.id,
            employee_id: currentUser.id, // Use current user as test employee
            employee_name: "Test Employee",
            employee_nip: "123456789",
            employee_department: currentUser.unitKerja || "Test Unit",
            employee_position: "Test Position",
            leave_type_id: "test-leave-type-id",
            leave_type_name: "Cuti Tahunan",
            start_date: "2025-01-15",
            end_date: "2025-01-16", 
            days_requested: 2,
            leave_quota_year: 2025,
            reason: "Test cuti",
            address_during_leave: "Test alamat",
        }];
        
        console.log("📝 Creating test items:", testItems);
        
        const { data: items, error: itemsError } = await supabase
            .from("leave_proposal_items")
            .insert(testItems)
            .select();
            
        if (itemsError) {
            console.error("❌ Error creating items:", itemsError);
            console.error("Error code:", itemsError.code);
            console.error("Error message:", itemsError.message);
            
            // Clean up proposal if items failed
            await supabase.from("leave_proposals").delete().eq("id", proposal.id);
            return null;
        }
        
        console.log("✅ Items created successfully:", items);
        
        // Test 3: Verify data was saved
        const { data: savedProposal } = await supabase
            .from("leave_proposals")
            .select("*")
            .eq("id", proposal.id)
            .single();
            
        const { data: savedItems } = await supabase
            .from("leave_proposal_items")
            .select("*")
            .eq("proposal_id", proposal.id);
            
        console.log("✅ Verification - Saved proposal:", savedProposal);
        console.log("✅ Verification - Saved items:", savedItems);
        
        return { proposal: savedProposal, items: savedItems };
        
    } catch (err) {
        console.error("❌ Exception during test:", err);
        return null;
    }
}

// Test 4: Check current data in tables
async function checkCurrentData() {
    console.log("🔍 Checking current data in tables...");
    
    try {
        const { data: proposals, count: proposalCount } = await supabase
            .from("leave_proposals")
            .select("*", { count: "exact" });
            
        const { data: items, count: itemCount } = await supabase
            .from("leave_proposal_items")
            .select("*", { count: "exact" });
            
        console.log("📊 Current proposals:", proposalCount, proposals);
        console.log("📊 Current items:", itemCount, items);
        
        return { proposals, items, proposalCount, itemCount };
    } catch (err) {
        console.error("❌ Error checking data:", err);
        return null;
    }
}

// Test 5: Check RLS policies
async function checkRLSStatus() {
    console.log("🔒 Checking RLS status...");
    
    try {
        // Try to query system tables for RLS status
        const { data, error } = await supabase.rpc('check_rls_status', { table_name: 'leave_proposals' });
        
        if (error) {
            console.log("ℹ️ Cannot check RLS status directly");
        } else {
            console.log("🔒 RLS status:", data);
        }
    } catch (err) {
        console.log("ℹ️ RLS status check not available");
    }
}

// Run all tests
async function runCreateTests() {
    console.log("🚀 Starting proposal creation tests...");
    
    await checkCurrentData();
    await checkRLSStatus();
    
    const result = await testCreateProposalManually();
    
    if (result) {
        console.log("🎉 SUCCESS: Test proposal created!");
        console.log("📋 Result:", result);
        
        // Check data again after creation
        await checkCurrentData();
    } else {
        console.log("❌ FAILED: Could not create test proposal");
        console.log("💡 Possible issues:");
        console.log("1. RLS policies blocking insert");
        console.log("2. Missing required fields");
        console.log("3. Foreign key constraints");
        console.log("4. User session issues");
    }
}

// Auto-run
runCreateTests();

// Make functions available
window.testProposalCreation = {
    testCreateProposalManually,
    checkCurrentData,
    checkRLSStatus,
    runCreateTests
};

console.log("💡 Functions available:");
console.log("- testProposalCreation.testCreateProposalManually()");
console.log("- testProposalCreation.checkCurrentData()");
console.log("- testProposalCreation.runCreateTests()");
