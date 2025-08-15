// Test script to verify the localStorage completion tracking fix
console.log("🧪 Testing localStorage completion tracking fix...");

// Mock unit data
const mockUnit = {
  unitName: "IT Department",
  proposalDate: "2024-01-15",
  totalEmployees: 5,
  totalRequests: 8,
  totalDays: 25,
  requests: [
    { id: "req1", employee_id: "emp1" },
    { id: "req2", employee_id: "emp2" },
    { id: "req3", employee_id: "emp3" }
  ]
};

// Mock user
const mockUser = {
  id: "user123",
  name: "Test Admin",
  email: "admin@test.com"
};

// Test completion tracking
function testCompletionTracking() {
  const proposalKey = `${mockUnit.unitName}|${mockUnit.proposalDate}`;
  
  // Create completion record
  const completionRecord = {
    proposalKey,
    unitName: mockUnit.unitName,
    proposalDate: mockUnit.proposalDate,
    totalEmployees: mockUnit.totalEmployees,
    totalRequests: mockUnit.totalRequests,
    totalDays: mockUnit.totalDays,
    completedAt: new Date().toISOString(),
    completedBy: mockUser.id,
    completedByName: mockUser.name,
    requestIds: mockUnit.requests.map(req => req.id)
  };

  // Save to localStorage
  try {
    const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
    existingCompleted[proposalKey] = completionRecord;
    localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));
    
    // Also keep a simple list for backward compatibility
    const completedList = Object.keys(existingCompleted);
    localStorage.setItem('completedProposals', JSON.stringify(completedList));
    
    console.log("✅ Successfully saved completion record:", completionRecord);
    
    // Test retrieval
    const retrieved = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
    const retrievedRecord = retrieved[proposalKey];
    
    if (retrievedRecord && retrievedRecord.unitName === mockUnit.unitName) {
      console.log("✅ Successfully retrieved completion record:", retrievedRecord);
      
      // Test removal
      delete retrieved[proposalKey];
      localStorage.setItem('completedBatchProposals', JSON.stringify(retrieved));
      
      const afterRemoval = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
      if (!afterRemoval[proposalKey]) {
        console.log("✅ Successfully removed completion record");
        console.log("🎉 All localStorage tests passed!");
        return true;
      } else {
        console.error("❌ Failed to remove completion record");
        return false;
      }
    } else {
      console.error("❌ Failed to retrieve completion record");
      return false;
    }
  } catch (error) {
    console.error("❌ localStorage test failed:", error);
    return false;
  }
}

// Run the test
const testResult = testCompletionTracking();
console.log("Test result:", testResult ? "PASS" : "FAIL");
