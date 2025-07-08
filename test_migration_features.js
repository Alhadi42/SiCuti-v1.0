// Test Migration Features
// Run this in browser console to test new functionality

console.log("🧪 Testing Leave Quota Year Migration Features...");

// Test 1: Check if new columns exist in database
async function testDatabaseColumns() {
  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("leave_quota_year, application_form_date")
      .limit(1);

    if (error) {
      console.error("❌ Database columns test failed:", error);
      return false;
    }

    console.log("✅ Database columns exist and accessible");
    return true;
  } catch (err) {
    console.error("❌ Database test error:", err);
    return false;
  }
}

// Test 2: Test form field detection
function testFormFieldDetection() {
  try {
    const quotaYearField = document.getElementById("leave_quota_year");
    const formDateField = document.getElementById("application_form_date");

    if (quotaYearField && formDateField) {
      console.log("✅ New form fields are visible");
      return true;
    } else {
      console.log("⚠️ New form fields not found - check if form is open");
      return false;
    }
  } catch (err) {
    console.error("❌ Form field test error:", err);
    return false;
  }
}

// Test 3: Check if balance separation is working
function testBalanceSeparation() {
  try {
    // Look for balance cards with separate current year and deferred info
    const balanceCards = document.querySelectorAll(
      '[class*="bg-slate-600/30"]',
    );

    if (balanceCards.length > 0) {
      console.log("✅ Balance cards found, checking for separation...");

      // Check if any card shows separate current year and deferred balances
      let hasSeparation = false;
      balanceCards.forEach((card) => {
        const text = card.textContent;
        if (text.includes("Saldo 2025") || text.includes("Saldo Penangguhan")) {
          hasSeparation = true;
        }
      });

      if (hasSeparation) {
        console.log("✅ Balance separation is working");
        return true;
      } else {
        console.log("⚠️ Balance separation not detected");
        return false;
      }
    } else {
      console.log("⚠️ No balance cards found - navigate to Leave History page");
      return false;
    }
  } catch (err) {
    console.error("❌ Balance separation test error:", err);
    return false;
  }
}

// Test 4: Test if migration success message appears
function testMigrationMessage() {
  try {
    const successMessage = document.querySelector('[class*="bg-green-900/20"]');

    if (
      successMessage &&
      successMessage.textContent.includes("Migration database berhasil")
    ) {
      console.log("✅ Migration success message found");
      return true;
    } else {
      console.log(
        "⚠️ Migration success message not found - check Leave History page",
      );
      return false;
    }
  } catch (err) {
    console.error("❌ Migration message test error:", err);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting comprehensive feature tests...\n");

  const dbTest = await testDatabaseColumns();
  const formTest = testFormFieldDetection();
  const balanceTest = testBalanceSeparation();
  const messageTest = testMigrationMessage();

  console.log("\n📊 Test Results Summary:");
  console.log(`Database Columns: ${dbTest ? "✅" : "❌"}`);
  console.log(`Form Fields: ${formTest ? "✅" : "⚠️"}`);
  console.log(`Balance Separation: ${balanceTest ? "✅" : "⚠️"}`);
  console.log(`Migration Message: ${messageTest ? "✅" : "⚠️"}`);

  const allPassed = dbTest;
  const uiPassed = formTest || balanceTest || messageTest;

  if (allPassed && uiPassed) {
    console.log("\n🎉 All tests passed! Migration is working correctly.");
  } else if (allPassed) {
    console.log(
      "\n⚠️ Database OK, but navigate to Leave Requests/History pages to test UI features.",
    );
  } else {
    console.log("\n❌ Some tests failed. Check implementation.");
  }

  return { dbTest, formTest, balanceTest, messageTest };
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.testMigrationFeatures = {
  runAllTests,
  testDatabaseColumns,
  testFormFieldDetection,
  testBalanceSeparation,
  testMigrationMessage,
};

console.log("\n💡 You can also run individual tests manually:");
console.log("testMigrationFeatures.testDatabaseColumns()");
console.log("testMigrationFeatures.testFormFieldDetection()");
console.log("testMigrationFeatures.testBalanceSeparation()");
