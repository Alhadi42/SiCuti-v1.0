-- Add new columns to leave_requests table
-- This script should be run in Supabase SQL Editor

-- Add Jatah Cuti Tahun column
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS leave_quota_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Add Tanggal Formulir Pengajuan Cuti column  
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS application_form_date DATE DEFAULT CURRENT_DATE;

-- Add comments for documentation
COMMENT ON COLUMN leave_requests.leave_quota_year IS 'Tahun jatah cuti yang digunakan - jika berbeda dari tahun berjalan maka menggunakan saldo penangguhan';
COMMENT ON COLUMN leave_requests.application_form_date IS 'Tanggal formulir pengajuan cuti diisi/disubmit';

-- Optional: Update existing records to have default values if needed
UPDATE leave_requests 
SET leave_quota_year = EXTRACT(YEAR FROM start_date)
WHERE leave_quota_year IS NULL;

UPDATE leave_requests 
SET application_form_date = COALESCE(submitted_date::date, start_date, CURRENT_DATE)
WHERE application_form_date IS NULL;
