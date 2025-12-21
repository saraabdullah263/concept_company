import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles }) => {
    const { userRole, loading, user } = useAuth();

    // انتظر حتى يتم تحميل البيانات بالكامل
    if (loading || (user && !userRole)) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح لك</h2>
                    <p className="text-gray-600 mb-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        العودة للخلف
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default RoleProtectedRoute;
