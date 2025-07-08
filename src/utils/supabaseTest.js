import { supabase } from '@/lib/supabaseClient';

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase connection successful');
    
    // Test table structure
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
    
    if (employeesError) {
      console.error('Employees table error:', employeesError);
      return { success: false, error: employeesError.message };
    }
    
    console.log('Employees table structure:', employees.length > 0 ? Object.keys(employees[0]) : 'Table is empty');
    
    return { success: true, tableStructure: employees.length > 0 ? Object.keys(employees[0]) : [] };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
};

export const testEmployeeInsert = async (testEmployee) => {
  try {
    console.log('Testing employee insert...');
    console.log('Test employee data:', testEmployee);
    
    const { data, error } = await supabase
      .from('employees')
      .insert([testEmployee])
      .select();
    
    if (error) {
      console.error('Employee insert error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Employee insert successful:', data);
    
    // Clean up test data
    if (data && data[0]) {
      await supabase.from('employees').delete().eq('id', data[0].id);
      console.log('Test data cleaned up');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Test insert failed:', error);
    return { success: false, error: error.message };
  }
};

export const testEmployeesTableStructure = async () => {
  try {
    console.log('Testing employees table structure...');
    
    // Get table info
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing employees table:', error);
      return { success: false, error: error.message };
    }
    
    if (employees.length > 0) {
      const columns = Object.keys(employees[0]);
      console.log('Employees table columns:', columns);
      
      // Check if NIP column exists and its properties
      const { data: tableInfo, error: infoError } = await supabase
        .rpc('get_table_info', { table_name: 'employees' })
        .catch(() => ({ data: null, error: 'RPC not available' }));
      
      console.log('Table info:', tableInfo);
      
      return { 
        success: true, 
        columns,
        hasNipColumn: columns.includes('nip'),
        tableInfo: tableInfo || 'RPC not available'
      };
    } else {
      return { 
        success: true, 
        columns: [],
        hasNipColumn: false,
        message: 'Table is empty'
      };
    }
  } catch (error) {
    console.error('Test table structure failed:', error);
    return { success: false, error: error.message };
  }
};

// Add a function to test the download functionality
export const testDownloadLeaveLetter = async (employee, leaveData) => {
  try {
    console.log('Testing leave letter download with data:', { employee, leaveData });
    
    if (!employee || !leaveData) {
      throw new Error('Missing required employee or leave data');
    }
    
    // Basic validation of required fields
    const requiredFields = ['employee_name', 'nip', 'leave_dates', 'duration'];
    const missingFields = requiredFields.filter(field => !leaveData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in leave data: ${missingFields.join(', ')}`);
    }
    
    return { success: true, message: 'Leave letter data is valid' };
    
  } catch (error) {
    console.error('❌ Leave letter test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Error testing leave letter download. Check console for details.'
    };
  }
};

export const fixNonAsnNip = async () => {
  try {
    // Step 1: Fetch all Non ASN/Outsourcing with NIP like 'NIPK%'
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, nip, asn_status, position_type')
      .or('asn_status.eq.Non ASN,position_type.eq.Outsourcing')
      .like('nip', 'NIPK%');
    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      return { success: false, error: fetchError.message };
    }
    if (!employees || employees.length === 0) {
      return { success: true, updated: 0, message: 'Tidak ada data yang perlu diupdate.' };
    }
    // Step 2: Update NIP to null for all fetched employees
    const ids = employees.map(emp => emp.id);
    const { error: updateError } = await supabase
      .from('employees')
      .update({ nip: null })
      .in('id', ids);
    if (updateError) {
      console.error('Error updating employees:', updateError);
      return { success: false, error: updateError.message };
    }
    return { success: true, updated: ids.length };
  } catch (error) {
    console.error('Error in fixNonAsnNip:', error);
    return { success: false, error: error.message };
  }
};
