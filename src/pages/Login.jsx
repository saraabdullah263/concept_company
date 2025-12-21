import LoginForm from '../components/auth/LoginForm';

const Login = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <LoginForm />
            </div>

            <p className="mt-8 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} شركة إدارة المخلفات الطبية. جميع الحقوق محفوظة.
            </p>
        </div>
    );
};

export default Login;
