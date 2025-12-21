import { Bell, Menu, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';

const Header = ({ toggleSidebar }) => {
    const { user } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // جلب الإشعارات عند تحميل المكون
    useEffect(() => {
        if (user?.id) {
            loadNotifications();
            
            // الاشتراك في الإشعارات الجديدة
            const subscription = notificationService.subscribeToNotifications(
                user.id,
                (newNotification) => {
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // إظهار إشعار المتصفح
                    if (Notification.permission === 'granted') {
                        new Notification(newNotification.title, {
                            body: newNotification.message,
                            icon: '/vite.svg'
                        });
                    }
                }
            );

            return () => {
                notificationService.unsubscribe(subscription);
            };
        }
    }, [user]);

    // طلب إذن الإشعارات من المتصفح
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            const count = data.filter(n => !n.read).length;
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const notifTime = new Date(timestamp);
        const diffMs = now - notifTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        return `منذ ${diffDays} يوم`;
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">نظام إدارة المخلفات الطبية</h2>
            </div>

            <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">الإشعارات</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <>
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                تعليم الكل كمقروء
                                            </button>
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                                {unreadCount} جديد
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-brand-50/30' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {!notif.read && (
                                                    <div className="w-2 h-2 bg-brand-600 rounded-full mt-2 flex-shrink-0"></div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                                                    <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">لا توجد إشعارات</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 border-t border-gray-100 text-center">
                                <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                                    عرض جميع الإشعارات
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{user?.email || 'مستخدم'}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
