import { useState } from 'react';
import { supabase } from '../services/supabase';

const Setup = () => {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const createAdmin = async () => {
        setStatus('loading');
        setMessage('جاري إنشاء المستخدم...');

        const email = 'admin@concept.com';
        const password = 'password123';

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('لم يتم إنشاء المستخدم لسبب غير معروف');
            }

            // 2. Insert into public.users
            const { error: dbError } = await supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email: email,
                        full_name: 'مدير النظام',
                        role: 'admin',
                        is_active: true
                    }
                ]);

            if (dbError) {
                // If user already exists in public.users, we might want to just update role?
                // But for now, let's assume clean slate or handle duplicate error
                if (dbError.code === '23505') { // Unique violation
                    setMessage('المستخدم موجود بالفعل. يمكنك تسجيل الدخول بـ: ' + email + ' / ' + password);
                    setStatus('success');
                    return;
                }
                throw dbError;
            }

            setStatus('success');
            setMessage(`تم إنشاء المستخدم بنجاح!\nالبريد: ${email}\nكلمة المرور: ${password}`);
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage(error.message || 'حدث خطأ أثناء الإنشاء');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">إعداد النظام</h1>
                <p className="text-gray-500">
                    استخدم هذا الزر لإنشاء مستخدم "مسؤول" (Admin) تجريبي لتتمكن من الدخول للنظام.
                </p>

                {status === 'success' ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-right" dir="rtl">
                        <p className="font-bold mb-2">معلومات الدخول:</p>
                        <p><strong>البريد:</strong> admin@concept.com</p>
                        <p><strong>كلمة المرور:</strong> password123</p>
                        <a href="/login" className="block mt-4 text-center bg-green-600 text-white py-2 rounded hover:bg-green-700">
                            الذهاب لصفحة الدخول
                        </a>
                    </div>
                ) : (
                    <button
                        onClick={createAdmin}
                        disabled={status === 'loading'}
                        className="w-full py-3 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-bold"
                    >
                        {status === 'loading' ? 'جاري المعالجة...' : 'إنشاء حساب Admin'}
                    </button>
                )}

                {status === 'error' && (
                    <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Setup;
