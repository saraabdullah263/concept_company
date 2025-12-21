import { useState } from 'react';
import { Save, Bell, Shield, Database, Globe, Mail } from 'lucide-react';
import ToggleSwitch from '../../components/common/ToggleSwitch';

const Settings = () => {
    const [settings, setSettings] = useState({
        companyName: 'شركة إدارة المخلفات الطبية',
        email: 'info@concept.com',
        phone: '+20 123 456 7890',
        address: 'القاهرة، مصر',
        language: 'ar',
        notifications: {
            email: true,
            sms: false,
            push: true,
        },
        autoBackup: true,
        contractAlertDays: 90,
    });

    const handleSave = () => {
        alert('تم حفظ الإعدادات بنجاح! ✅');
        // TODO: Save to database
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
                <p className="text-sm text-gray-500 mt-1">إدارة إعدادات النظام والتفضيلات</p>
            </div>

            {/* Company Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
                        <Globe className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">معلومات الشركة</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة</label>
                        <input
                            type="text"
                            value={settings.companyName}
                            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                        <input
                            type="tel"
                            value={settings.phone}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                        <input
                            type="text"
                            value={settings.address}
                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                        <Bell className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">الإشعارات</h2>
                </div>

                <div className="space-y-4">
                    <ToggleSwitch
                        checked={settings.notifications.push}
                        onChange={(value) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, push: value }
                        })}
                        label="إشعارات المتصفح"
                        description="إشعارات فورية في المتصفح"
                    />
                </div>
            </div>

            {/* System Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Database className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">إعدادات النظام</h2>
                </div>

                <div className="space-y-4">
                    <ToggleSwitch
                        checked={settings.autoBackup}
                        onChange={(value) => setSettings({ ...settings, autoBackup: value })}
                        label="النسخ الاحتياطي التلقائي"
                        description="نسخ احتياطي يومي للبيانات"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تنبيه قبل انتهاء العقد (بالأيام)</label>
                        <input
                            type="number"
                            value={settings.contractAlertDays}
                            onChange={(e) => setSettings({ ...settings, contractAlertDays: parseInt(e.target.value) })}
                            className="block w-full md:w-48 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه قبل {settings.contractAlertDays} يوم من انتهاء العقد</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                >
                    <Save className="w-5 h-5" />
                    حفظ الإعدادات
                </button>
            </div>
        </div>
    );
};

export default Settings;
