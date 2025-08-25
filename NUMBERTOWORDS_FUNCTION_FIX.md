# NumberToWords Function Fix

## Problem
The application was throwing a `ReferenceError: numberToWords is not defined` error during batch letter generation in `BatchLeaveProposals.jsx`.

### Error Details
```
Error generating batch letter: ReferenceError: numberToWords is not defined
    at https://ad0f762c6b6947148402e58d1c997bf0-3b153af9f46342deb494e970c.fly.dev/src/pages/BatchLeaveProposals.jsx:738:34
    at Array.map (<anonymous>)
    at handleGenerateBatchLetter (https://ad0f762c6b6947148402e58d1c997bf0-3b153af9f46342deb494e970c.fly.dev/src/pages/BatchLeaveProposals.jsx:693:40)
```

## Root Cause
The `numberToWords` function was being called in `BatchLeaveProposals.jsx` but was not defined in that file. The function existed in other files (`DocxSuratKeterangan.jsx` and `SuratKeterangan.jsx`) but was missing from the batch proposals component.

### Where the function was used:
1. Line 851: `durasi_hari_terbilang: numberToWords(request.days_requested || 0)`
2. Line 892: `variables[`durasi_hari_terbilang_${num}`] = numberToWords(request.days_requested || 0)`

## Solution
Added the complete `numberToWords` function definition to `src/pages/BatchLeaveProposals.jsx`.

### Function Added:
```javascript
// Convert number to Indonesian words
const numberToWords = (num) => {
  if (num === 0) return "nol";

  const ones = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
  ];
  const teens = [
    "sepuluh",
    "sebelas",
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];
  const tens = [
    "",
    "",
    "dua puluh",
    "tiga puluh",
    "empat puluh",
    "lima puluh",
    "enam puluh",
    "tujuh puluh",
    "delapan puluh",
    "sembilan puluh",
  ];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? " " + ones[one] : "");
  }

  return num.toString(); // For larger numbers, just return the number
};
```

## Function Purpose
The `numberToWords` function converts numeric values to Indonesian words for document generation. It's used specifically for:

- Converting leave duration numbers to written form (e.g., "5" becomes "lima")
- Template variable `durasi_hari_terbilang` in both individual and indexed forms
- Making documents more formal and readable in Indonesian

## Testing
After the fix:
1. ✅ Batch letter generation should work without errors
2. ✅ The `durasi_hari_terbilang` variable should display correctly in generated documents
3. ✅ Both individual and indexed variables should be populated

## Function Capabilities
- Handles numbers 0-99
- Returns Indonesian words for numbers
- Falls back to string representation for numbers > 99
- Used consistently across multiple document generation components

## Files Modified
- **`src/pages/BatchLeaveProposals.jsx`**: Added missing `numberToWords` function definition

## Prevention
To prevent this issue in the future:
1. Consider creating a shared utility file for common functions like `numberToWords`
2. Import the function from a central location rather than duplicating it across files
3. Add unit tests to ensure function availability and correctness

## Verification
The function is now available in `BatchLeaveProposals.jsx` and can be used for:
- Document template variable generation
- Converting numeric leave days to Indonesian words
- Ensuring consistent formatting across all document types
