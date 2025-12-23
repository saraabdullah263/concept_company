import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Logo from '../common/Logo';

const LoginForm = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        try {
            setError(null);
            await signIn(data.email, data.password);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
                <Logo className="h-32 w-auto mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 font-sans mb-2">تسجيل الدخول</h2>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        البريد الإلكتروني
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                            <Mail className="w-5 h-5" />
                        </div>
                        <input
                            type="email"
                            dir="ltr"
                            className={clsx(
                                "block w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors text-right",
                                errors.email ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="name@example.com"
                            {...register('email', { required: 'البريد الإلكتروني مطلوب' })}
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        كلمة المرور
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                            <Lock className="w-5 h-5" />
                        </div>
                        <input
                            type="password"
                            dir="ltr"
                            className={clsx(
                                "block w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-colors text-right",
                                errors.password ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="••••••••"
                            {...register('password', { required: 'كلمة المرور مطلوبة' })}
                        />
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'دخول'
                    )}
                </button>
            </form>
        </div>
    );
};

export default LoginForm;
