// Debug script untuk dijalankan di browser console
// Buka DevTools -> Console dan paste script ini

console.log("🔍 Starting debug for leave proposals...");

// Test 1: Check current user
const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
console.log("👤 Current user:", currentUser);

// Test 2: Direct query to leave_proposals
async function testProposalsQuery() {
  try {
    console.log("🔍 Testing direct query to leave_proposals...");
    
    const { data, error } = await supabase
      .from("leave_proposals")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("❌ Error:", error);
      return;
    }
    
    console.log("✅ Direct query success!");
    console.log("📊 Total proposals found:", data?.length || 0);
    console.log("📋 Proposals data:", data);
    
    if (data && data.length > 0) {
      data.forEach((prop, index) => {
        console.log(`📌 Proposal ${index + 1}:`);
        console.log(`   ID: ${prop.id}`);
        console.log(`   Title: ${prop.proposal_title}`);
        console.log(`   Unit: ${prop.proposer_unit}`);
        console.log(`   Proposer: ${prop.proposer_name}`);
        console.log(`   Status: ${prop.status}`);
        console.log(`   Created: ${prop.created_at}`);
      });
    }
    
    return data;
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

// Test 3: Query proposal items
async function testProposalItems() {
  try {
    console.log("🔍 Testing proposal items query...");
    
    const { data, error } = await supabase
      .from("leave_proposal_items")
      .select("*");
    
    if (error) {
      console.error("❌ Error:", error);
      return;
    }
    
    console.log("✅ Proposal items query success!");
    console.log("📊 Total items found:", data?.length || 0);
    console.log("📋 Items data:", data);
    
    return data;
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

// Test 4: Check user authentication
async function testAuth() {
  try {
    console.log("���� Testing authentication...");
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("❌ Auth error:", error);
      return;
    }
    
    console.log("✅ Auth success!");
    console.log("👤 Supabase user:", user);
    
    return user;
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

// Test 5: Test RLS bypass (if needed)
async function testRLSBypass() {
  try {
    console.log("🔍 Testing with service role (if available)...");
    
    // This will only work if service role is configured
    const { data, error } = await supabase
      .from("leave_proposals")
      .select("*", { count: 'exact' });
    
    if (error) {
      console.error("❌ Error:", error);
      return;
    }
    
    console.log("✅ Service role query success!");
    console.log("📊 Data:", data);
    
    return data;
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running all debug tests...");
  
  await testAuth();
  await testProposalsQuery();
  await testProposalItems();
  
  console.log("✅ Debug tests completed!");
}

// Auto-run tests
runAllTests();

// Make functions available for manual testing
window.debugProposals = {
  testProposalsQuery,
  testProposalItems,
  testAuth,
  testRLSBypass,
  runAllTests
};

console.log("💡 Debug functions available:");
console.log("- debugProposals.testProposalsQuery()");
console.log("- debugProposals.testProposalItems()"); 
console.log("- debugProposals.testAuth()");
console.log("- debugProposals.runAllTests()");
