import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTemplates() {
    console.log('Starting template migration...');

    try {
        // Update all existing templates to be 'global' if they don't have a scope
        const { data, error } = await supabase
            .from('templates')
            .update({
                template_scope: 'global',
                unit_scope: null
            })
            .or('template_scope.is.null,template_scope.eq.""')
            .select();

        if (error) throw error;

        console.log(`✅ Successfully migrated ${data.length} templates to 'global' scope.`);
    } catch (error) {
        console.error('Migration failed:', error.message);
    }
}

migrateTemplates();
