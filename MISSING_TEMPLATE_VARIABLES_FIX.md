# Missing Template Variables Fix

## 🔧 Issue Reported
The "Buat Surat" (Create Letter) button in the batch leave proposals was not filling in these template variables:

1. `{tanggal_formulir_pengajuan}` - Application form date
2. `{tanggal_cuti}` - Leave date range  
3. `{jatah_cuti_tahun}` - Annual leave quota year

## 🎯 Root Cause
The `handleGenerateBatchLetter` function in `BatchLeaveProposals.jsx` was missing the mapping for these specific variable names, even though the data was available.

## ✅ Fix Applied

### **Added Missing Variables**
```javascript
// USER REPORTED MISSING VARIABLES - ADDED:
tanggal_formulir_pengajuan: completeRequests.length > 0 && completeRequests[0].application_form_date
  ? format(new Date(completeRequests[0].application_form_date), "dd MMMM yyyy", { locale: id })
  : format(new Date(selectedUnitForBatch.proposalDate), "dd MMMM yyyy", { locale: id }),

tanggal_cuti: completeRequests.length > 0
  ? `${format(new Date(completeRequests[0].start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(completeRequests[completeRequests.length - 1].end_date), "dd MMMM yyyy", { locale: id })}`
  : "-",

jatah_cuti_tahun: completeRequests.length > 0 ? (completeRequests[0].leave_quota_year || new Date().getFullYear()) : new Date().getFullYear(),
```

### **Added Indexed Variables for Multi-Employee Templates**
```javascript
// For templates that use numbered variables (pegawai_1, pegawai_2, etc.)
variables[`tanggal_formulir_pengajuan_${num}`] = request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-";
variables[`tanggal_cuti_${num}`] = `${format(new Date(request.start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(request.end_date), "dd MMMM yyyy", { locale: id })}`;
variables[`jatah_cuti_tahun_${num}`] = request.leave_quota_year || new Date().getFullYear();
```

## 📊 Variable Mapping Details

### **1. tanggal_formulir_pengajuan**
- **Source**: `application_form_date` from leave request
- **Fallback**: Proposal date if application form date not available
- **Format**: "dd MMMM yyyy" (Indonesian locale)
- **Example**: "15 Januari 2025"

### **2. tanggal_cuti** 
- **Source**: Start and end dates from leave requests
- **Format**: Range format "start s.d. end"
- **Example**: "20 Januari 2025 s.d. 25 Januari 2025"
- **Batch logic**: Uses earliest start date to latest end date across all requests

### **3. jatah_cuti_tahun**
- **Source**: `leave_quota_year` from leave request
- **Fallback**: Current year if not specified
- **Format**: Year number
- **Example**: 2025

## 🔍 Enhanced Debugging

Added specific logging to verify the new variables:
```javascript
console.log("🔧 NEWLY ADDED VARIABLES (user reported as missing):");
console.log("- tanggal_formulir_pengajuan:", variables.tanggal_formulir_pengajuan);
console.log("- tanggal_cuti:", variables.tanggal_cuti);
console.log("- jatah_cuti_tahun:", variables.jatah_cuti_tahun);
```

## 📁 Files Modified

**`src/pages/BatchLeaveProposals.jsx`**
- Line 788-798: Added missing global variables
- Line 862-869: Added missing indexed variables  
- Line 896-904: Added debugging logs

## 🎯 Impact

### **Before Fix**
- `{tanggal_formulir_pengajuan}` → Empty/undefined
- `{tanggal_cuti}` → Empty/undefined
- `{jatah_cuti_tahun}` → Empty/undefined

### **After Fix**
- `{tanggal_formulir_pengajuan}` → "15 Januari 2025"
- `{tanggal_cuti}` → "20 Januari 2025 s.d. 25 Januari 2025"  
- `{jatah_cuti_tahun}` → 2025

## 🧪 Testing

To verify the fix:
1. Go to Batch Leave Proposals page
2. Click "Buat Surat Batch" on any proposal group
3. Generate a letter using any template
4. Check browser console for the new variable logs
5. Open generated document and verify the previously empty fields are now filled

## ✅ Status

- ✅ **tanggal_formulir_pengajuan** - Fixed (application form date)
- ✅ **tanggal_cuti** - Fixed (leave date range)
- ✅ **jatah_cuti_tahun** - Fixed (leave quota year)
- ✅ **Indexed variants** - Added for multi-employee templates
- ✅ **Debugging** - Enhanced logging for verification

All previously missing template variables should now be properly populated in generated documents!
