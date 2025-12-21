
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vuwtbnzlwxfknzquxzug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1d3Ribnpsd3hma256cXV4enVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4NjUsImV4cCI6MjA4MTU1Mjg2NX0.F9KEYS8yyK8yRr5v_-4jcyXsZ8TUk8jsnhWhtJOksek';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const email = 'admin@concept.com';
    const password = 'password123';

    console.log(`Attempting to create user: ${email}...`);

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already registered. Trying to inserting into public.users if missing...');
            // We can't log in without password to get ID easily if we are anon, 
            // but if we just signed up we might have a session? 
            // Actually if already registered, signUp returns a null user usually if email confirmation is on, 
            // OR it returns the user but session is null?
            // Let's try to specific sign IN to get the ID.
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                console.error('Could not sign in:', signInError.message);
                return;
            }

            await insertUser(signInData.user.id, email);
            return;
        }
        console.error('Auth Error:', authError.message);
        return;
    }

    if (authData.user) {
        console.log('Auth user created/retrieved:', authData.user.id);
        await insertUser(authData.user.id, email);
    } else {
        console.log('No user returned. Email confirmation might be required.');
    }
}

async function insertUser(id, email) {
    try {
        const { error } = await supabase
            .from('users')
            .upsert([
                {
                    id: id,
                    email: email,
                    full_name: 'مدير النظام',
                    role: 'admin',
                    is_active: true
                }
            ]);

        if (error) {
            console.error('Database Info Error:', error.message);
        } else {
            console.log('SUCCESS: Admin user configured in database.');
            console.log(`Email: ${email}`);
            console.log(`Password: password123`);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

createAdmin();
