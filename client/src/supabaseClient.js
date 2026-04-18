import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xoqolkqsdkfwxveuwlow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcW9sa3FzZGtmd3h2ZXV3bG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTk5NDUsImV4cCI6MjA5MTYzNTk0NX0.F2VkwQT0l7GdIsqc5QiwO92HtB3sFqrQNgIfvWBQBwM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);