-- PERFORMANCE OPTIMIZATION CHECK
-- Run this script in Supabase SQL Editor to check performance and optimization

-- ==================================================
-- PART 1: DATABASE PERFORMANCE ANALYSIS
-- ==================================================

-- 1.1 Check table sizes and row counts
SELECT '1.1 TABLE SIZES AND ROW COUNTS' as analysis_section;
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('employees', 'leave_balances', 'leave_requests', 'leave_types', 'leave_deferrals')
ORDER BY tablename, attname;

-- 1.2 Check index usage
SELECT '1.2 INDEX USAGE ANALYSIS' as analysis_section;
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('employees', 'leave_balances', 'leave_requests', 'leave_types', 'leave_deferrals')
ORDER BY idx_scan DESC;

-- 1.3 Check slow queries
SELECT '1.3 SLOW QUERIES ANALYSIS' as analysis_section;
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%leave_balances%' 
    OR query LIKE '%leave_requests%'
    OR query LIKE '%employees%'
ORDER BY mean_time DESC
LIMIT 10;

-- ==================================================
-- PART 2: QUERY PERFORMANCE TESTING
-- ==================================================

-- 2.1 Test leave balance query performance
SELECT '2.1 LEAVE BALANCE QUERY PERFORMANCE TEST' as test_section;

-- Test 1: Basic leave balance query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name, lt.name;

-- Test 2: Leave balance with filtering
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND e.department ILIKE '%IT%'
    AND lb.total_days > 0
ORDER BY e.name, lt.name;

-- Test 3: Leave requests with employee data
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    lr.id,
    e.name as employee_name,
    lt.name as leave_type,
    lr.start_date,
    lr.end_date,
    lr.days_requested,
    lr.leave_quota_year
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lr.start_date DESC;

-- ==================================================
-- PART 3: INDEX RECOMMENDATIONS
-- ==================================================

-- 3.1 Check missing indexes
SELECT '3.1 MISSING INDEX ANALYSIS' as analysis_section;

-- Check for potential missing indexes on foreign keys
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN i.indexname IS NULL THEN '❌ MISSING INDEX'
        ELSE '✅ INDEX EXISTS'
    END as index_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i ON i.tablename = tc.table_name 
    AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('leave_balances', 'leave_requests', 'leave_deferrals');

-- 3.2 Check for composite index opportunities
SELECT '3.2 COMPOSITE INDEX OPPORTUNITIES' as analysis_section;

-- Analyze query patterns for composite indexes
WITH query_patterns AS (
    SELECT 
        'leave_balances' as table_name,
        'employee_id, year' as columns,
        'High frequency filter combination' as reason
    UNION ALL
    SELECT 
        'leave_balances' as table_name,
        'employee_id, leave_type_id, year' as columns,
        'Primary lookup pattern' as reason
    UNION ALL
    SELECT 
        'leave_requests' as table_name,
        'employee_id, leave_quota_year' as columns,
        'Balance calculation queries' as reason
    UNION ALL
    SELECT 
        'leave_requests' as table_name,
        'start_date, leave_quota_year' as columns,
        'Date range queries' as reason
)
SELECT 
    qp.table_name,
    qp.columns,
    qp.reason,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes i 
            WHERE i.tablename = qp.table_name 
            AND i.indexdef LIKE '%' || REPLACE(qp.columns, ', ', '%') || '%'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as index_status
FROM query_patterns qp;

-- ==================================================
-- PART 4: PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- ==================================================

-- 4.1 Create recommended indexes
SELECT '4.1 CREATING RECOMMENDED INDEXES' as optimization_section;

-- Index 1: Composite index for leave_balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_type_year 
ON leave_balances (employee_id, leave_type_id, year);

-- Index 2: Composite index for leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_quota_year 
ON leave_requests (employee_id, leave_quota_year);

-- Index 3: Date range index for leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date_quota_year 
ON leave_requests (start_date, leave_quota_year);

-- Index 4: Department filter index for employees
CREATE INDEX IF NOT EXISTS idx_employees_department 
ON employees (department);

-- Index 5: Name search index for employees
CREATE INDEX IF NOT EXISTS idx_employees_name 
ON employees USING gin (to_tsvector('english', name));

-- 4.2 Check index creation results
SELECT '4.2 INDEX CREATION RESULTS' as optimization_section;
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('leave_balances', 'leave_requests', 'employees')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ==================================================
-- PART 5: QUERY OPTIMIZATION
-- ==================================================

-- 5.1 Optimize leave balance calculation query
SELECT '5.1 OPTIMIZED LEAVE BALANCE QUERY' as optimization_section;

-- Create optimized view for leave balance calculations
CREATE OR REPLACE VIEW optimized_leave_balances AS
WITH leave_usage AS (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        lr.leave_quota_year,
        SUM(lr.days_requested) as calculated_used_days
    FROM leave_requests lr
    WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id, lr.leave_quota_year
),
deferred_usage AS (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        SUM(lr.days_requested) as calculated_deferred_days
    FROM leave_requests lr
    WHERE lr.leave_quota_year < EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id
)
SELECT 
    lb.id,
    lb.employee_id,
    lb.leave_type_id,
    lb.year,
    lb.total_days,
    COALESCE(lu.calculated_used_days, 0) as used_days,
    COALESCE(du.calculated_deferred_days, 0) as deferred_days,
    (lb.total_days + COALESCE(du.calculated_deferred_days, 0) - COALESCE(lu.calculated_used_days, 0)) as remaining_days,
    e.name as employee_name,
    lt.name as leave_type_name
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
LEFT JOIN leave_usage lu ON lb.employee_id = lu.employee_id 
    AND lb.leave_type_id = lu.leave_type_id
LEFT JOIN deferred_usage du ON lb.employee_id = du.employee_id 
    AND lb.leave_type_id = du.leave_type_id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Test optimized view performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM optimized_leave_balances 
WHERE employee_name ILIKE '%hany%'
ORDER BY employee_name, leave_type_name;

-- ==================================================
-- PART 6: PERFORMANCE MONITORING
-- ==================================================

-- 6.1 Create performance monitoring functions
SELECT '6.1 PERFORMANCE MONITORING SETUP' as monitoring_section;

-- Function to get query performance stats
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time NUMERIC,
    total_calls BIGINT,
    total_time NUMERIC,
    performance_rating TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN query LIKE '%leave_balances%' THEN 'Leave Balance Queries'
            WHEN query LIKE '%leave_requests%' THEN 'Leave Request Queries'
            WHEN query LIKE '%employees%' THEN 'Employee Queries'
            ELSE 'Other Queries'
        END as query_type,
        ROUND(AVG(mean_time), 2) as avg_execution_time,
        SUM(calls) as total_calls,
        ROUND(SUM(total_time), 2) as total_time,
        CASE 
            WHEN AVG(mean_time) < 10 THEN '✅ EXCELLENT'
            WHEN AVG(mean_time) < 50 THEN '⚠️ GOOD'
            WHEN AVG(mean_time) < 100 THEN '⚠️ FAIR'
            ELSE '❌ POOR'
        END as performance_rating
    FROM pg_stat_statements 
    WHERE query LIKE '%leave_balances%' 
        OR query LIKE '%leave_requests%'
        OR query LIKE '%employees%'
    GROUP BY query_type
    ORDER BY avg_execution_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get table performance stats
CREATE OR REPLACE FUNCTION get_table_performance_stats()
RETURNS TABLE (
    table_name TEXT,
    total_rows BIGINT,
    index_scan_ratio NUMERIC,
    performance_rating TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.n_tup_ins + t.n_tup_upd + t.n_tup_del as total_rows,
        CASE 
            WHEN (t.idx_scan + t.seq_scan) > 0 THEN 
                ROUND((t.idx_scan::NUMERIC / (t.idx_scan + t.seq_scan)) * 100, 2)
            ELSE 0
        END as index_scan_ratio,
        CASE 
            WHEN (t.idx_scan + t.seq_scan) > 0 AND (t.idx_scan::NUMERIC / (t.idx_scan + t.seq_scan)) > 0.8 THEN '✅ EXCELLENT'
            WHEN (t.idx_scan + t.seq_scan) > 0 AND (t.idx_scan::NUMERIC / (t.idx_scan + t.seq_scan)) > 0.6 THEN '⚠️ GOOD'
            WHEN (t.idx_scan + t.seq_scan) > 0 AND (t.idx_scan::NUMERIC / (t.idx_scan + t.seq_scan)) > 0.4 THEN '⚠️ FAIR'
            ELSE '❌ POOR'
        END as performance_rating
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
        AND t.relname IN ('employees', 'leave_balances', 'leave_requests', 'leave_types', 'leave_deferrals')
    ORDER BY total_rows DESC;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 7: FINAL PERFORMANCE REPORT
-- ==================================================

-- 7.1 Generate comprehensive performance report
SELECT '7.1 COMPREHENSIVE PERFORMANCE REPORT' as report_section;

-- Query performance summary
SELECT * FROM get_query_performance_stats();

-- Table performance summary
SELECT * FROM get_table_performance_stats();

-- 7.2 Performance recommendations
SELECT '7.2 PERFORMANCE RECOMMENDATIONS' as report_section;
WITH recommendations AS (
    SELECT 
        'Index Optimization' as category,
        'Ensure all foreign keys have indexes' as recommendation,
        'HIGH' as priority
    UNION ALL
    SELECT 
        'Query Optimization' as category,
        'Use optimized views for complex calculations' as recommendation,
        'MEDIUM' as priority
    UNION ALL
    SELECT 
        'Monitoring' as category,
        'Set up regular performance monitoring' as recommendation,
        'LOW' as priority
    UNION ALL
    SELECT 
        'Caching' as category,
        'Consider implementing application-level caching' as recommendation,
        'MEDIUM' as priority
)
SELECT 
    category,
    recommendation,
    priority,
    CASE 
        WHEN priority = 'HIGH' THEN '🔴 IMMEDIATE ACTION REQUIRED'
        WHEN priority = 'MEDIUM' THEN '🟡 SCHEDULE FOR IMPLEMENTATION'
        ELSE '🟢 MONITOR AND EVALUATE'
    END as action_required
FROM recommendations
ORDER BY 
    CASE priority 
        WHEN 'HIGH' THEN 1 
        WHEN 'MEDIUM' THEN 2 
        ELSE 3 
    END;

-- 7.3 Overall performance score
SELECT '7.3 OVERALL PERFORMANCE SCORE' as report_section;
WITH performance_metrics AS (
    SELECT 
        AVG(CASE 
            WHEN mean_time < 10 THEN 100
            WHEN mean_time < 50 THEN 80
            WHEN mean_time < 100 THEN 60
            ELSE 40
        END) as query_score
    FROM pg_stat_statements 
    WHERE query LIKE '%leave_balances%' 
        OR query LIKE '%leave_requests%'
        OR query LIKE '%employees%'
),
index_metrics AS (
    SELECT 
        AVG(CASE 
            WHEN idx_scan_ratio > 80 THEN 100
            WHEN idx_scan_ratio > 60 THEN 80
            WHEN idx_scan_ratio > 40 THEN 60
            ELSE 40
        END) as index_score
    FROM get_table_performance_stats()
)
SELECT 
    ROUND((pm.query_score + im.index_score) / 2, 2) as overall_score,
    CASE 
        WHEN (pm.query_score + im.index_score) / 2 >= 90 THEN '✅ EXCELLENT - PRODUCTION READY'
        WHEN (pm.query_score + im.index_score) / 2 >= 80 THEN '⚠️ GOOD - MINOR OPTIMIZATIONS NEEDED'
        WHEN (pm.query_score + im.index_score) / 2 >= 70 THEN '⚠️ FAIR - OPTIMIZATIONS RECOMMENDED'
        ELSE '❌ POOR - MAJOR OPTIMIZATIONS REQUIRED'
    END as performance_rating
FROM performance_metrics pm, index_metrics im; 