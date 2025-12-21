
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vuwtbnzlwxfknzquxzug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1d3Ribnpsd3hma256cXV4enVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4NjUsImV4cCI6MjA4MTU1Mjg2NX0.F9KEYS8yyK8yRr5v_-4jcyXsZ8TUk8jsnhWhtJOksek';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const email = 'admin@concept.com';
    const password = 'password123';

    console.log('Testing login...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Login Failed:', error.message);
    } else {
        console.log('Login Successful!');
        console.log('User ID:', data.user.id);
    }
}

verify();
