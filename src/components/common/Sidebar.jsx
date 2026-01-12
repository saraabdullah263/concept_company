import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    FileText,
    Truck,
    Calculator,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    X,
    DollarSign,
    Flame,
    MapPin
} from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { signOut, userRole } = useAuth();

    const navigation = [
        { name: 'لوحة التحكم', to: '/', icon: LayoutDashboard, roles: ['admin', 'logistics_manager', 'accountant', 'supervisor', 'representative'] },
        { name: 'العملاء', to: '/hospitals', icon: FileText, roles: ['admin', 'logistics_manager', 'accountant'] },
        { name: 'العقود', to: '/contracts', icon: FileText, roles: ['admin', 'logistics_manager', 'accountant'] },
        { name: 'خطوط السير', to: '/routes', icon: Truck, roles: ['admin', 'logistics_manager', 'supervisor', 'representative'] },
        { name: 'الرحلات', to: '/trips', icon: MapPin, roles: ['admin', 'logistics_manager', 'supervisor'] },
        { name: 'المركبات', to: '/vehicles', icon: Truck, roles: ['admin', 'logistics_manager'] },
        { name: 'المحارق', to: '/incinerators', icon: Flame, roles: ['admin', 'logistics_manager'] },
        { name: 'المحاسبة', to: '/accounting', icon: BarChart2, roles: ['admin', 'accountant'] },
        { name: 'حسابات المحارق', to: '/incinerator-accounts', icon: Flame, roles: ['admin', 'accountant'] },
        { name: 'الفواتير', to: '/invoices', icon: Calculator, roles: ['admin', 'accountant'] },
        { name: 'المصاريف', to: '/expenses', icon: DollarSign, roles: ['admin', 'accountant'] },
        { name: 'التقارير', to: '/reports', icon: BarChart2, roles: ['admin', 'logistics_manager', 'accountant'] },
        { name: 'المستخدمين', to: '/users', icon: Users, roles: ['admin'] },
        { name: 'الإعدادات', to: '/settings', icon: Settings, roles: ['admin'] },
    ];

    // Filter links based on role
    const filteredNav = userRole
        ? navigation.filter(item => item.roles.includes(userRole))
        : []; // Don't show anything until role is loaded

    // Show loading state while role is being fetched
    if (!userRole) {
        return (
            <>
                {/* Mobile Overlay */}
                <div
                    className={clsx(
                        "fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden",
                        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    onClick={toggleSidebar}
                />

                {/* Sidebar Loading State */}
                <div
                    className={clsx(
                        "fixed inset-y-0 right-0 z-30 w-64 bg-white border-l border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                        isOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    <div className="flex items-center justify-center h-24 px-4 border-b border-gray-200 relative">
                        <button onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-gray-700 absolute right-4">
                            <X className="w-6 h-6" />
                        </button>
                        <Logo className="h-20 w-auto" />
                    </div>
                    <div className="p-4 flex items-center justify-center">
                        <div className="animate-pulse text-gray-400 text-sm">جاري التحميل...</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={toggleSidebar}
            />

            {/* Sidebar */}
            <div
                className={clsx(
                    "fixed inset-y-0 right-0 z-30 w-64 bg-white border-l border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-center h-24 px-4 border-b border-gray-200 relative">
                    <button onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-gray-700 absolute right-4">
                        <X className="w-6 h-6" />
                    </button>
                    <Logo className="h-20 w-auto" />
                </div>
                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                    {filteredNav.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.to}
                            onClick={toggleSidebar}
                            className={({ isActive }) => clsx(
                                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group",
                                isActive
                                    ? "bg-brand-50 text-brand-700"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <item.icon className={clsx(
                                "w-5 h-5 ml-3 flex-shrink-0",
                                // isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-500" // simpler styling
                            )} />
                            {item.name}
                        </NavLink>
                    ))}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <button
                            onClick={() => {
                                toggleSidebar();
                                signOut();
                            }}
                            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5 ml-3" />
                            تسجيل الخروج
                        </button>
                    </div>
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
