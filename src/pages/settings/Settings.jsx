import { useState, useEffect } from 'react';
import { Save, Bell, Database, Globe, Loader2, AlertTriangle, Image, Upload, X } from 'lucide-react';
import ToggleSwitch from '../../components/common/ToggleSwitch';

const Settings = () => {
    const [settings, setSettings] = useState({
        companyName: 'Concept Eco Care',
        email: 'info@concept.com',
        phone: '+20 123 456 7890',
        address: 'القاهرة، مصر',
        notifications: {
            push: true,
            contractExpiry: true,
            vehicleLicense: true,
            repLicense: true,
            routeComplete: true,
            invoiceCreated: true,
        },
        alertDays: {
            contract: 30,
            vehicleLicense: 30,
            repLicense: 30,
        },
        autoBackup: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [logoPreview, setLogoPreview] = useState(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoUrl, setLogoUrl] = useState(null);

    // تحميل الإعدادات من localStorage
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // تحميل الإعدادات العامة
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
            
            // تحميل اللوجو من Supabase Storage
            const { data: files, error } = await supabase.storage
                .from('medical-waste')
                .list('company-logo', {
                    limit: 1,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (!error && files && files.length > 0) {
                const { data: { publicUrl } } = supabase.storage
                    .from('medical-waste')
                    .getPublicUrl(`company-logo/${files[0].name}`);
                
                setLogoUrl(publicUrl);
                setLogoPreview(publicUrl);
                
                // حفظ في localStorage للاستخدام offline
                localStorage.setItem('customLogo', publicUrl);
            } else {
                // استخدام اللوجو الافتراضي
                const customLogo = localStorage.getItem('customLogo');
                if (customLogo && !customLogo.startsWith('http')) {
                    // لو كان base64 قديم، استخدمه
                    setLogoPreview(customLogo);
                } else {
                    setLogoPreview('/logo.png');
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setLogoPreview('/logo.png');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // التحقق من نوع الملف
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار صورة فقط');
            return;
        }

        // التحقق من حجم الملف (أقل من 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً. الرجاء اختيار صورة أقل من 2 ميجابايت');
            return;
        }

        setIsUploadingLogo(true);

        try {
            // حذف اللوجو القديم إن وجد
            const { data: oldFiles } = await supabase.storage
                .from('medical-waste')
                .list('company-logo');

            if (oldFiles && oldFiles.length > 0) {
                const filesToRemove = oldFiles.map(f => `company-logo/${f.name}`);
                await supabase.storage
                    .from('medical-waste')
                    .remove(filesToRemove);
            }

            // رفع اللوجو الجديد
            const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
            const { data, error } = await supabase.storage
                .from('medical-waste')
                .upload(`company-logo/${fileName}`, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // الحصول على الرابط العام
            const { data: { publicUrl } } = supabase.storage
                .from('medical-waste')
                .getPublicUrl(`company-logo/${fileName}`);

            setLogoUrl(publicUrl);
            setLogoPreview(publicUrl);
            
            // حفظ في localStorage للاستخدام offline
            localStorage.setItem('customLogo', publicUrl);
            
            // إعادة تحميل الصفحة لتحديث اللوجو في كل مكان
            alert('تم تحميل اللوجو بنجاح! ✅\nسيتم تحديث الصفحة...');
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('حدث خطأ أثناء رفع اللوجو: ' + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!confirm('هل تريد حذف اللوجو المخصص والعودة للوجو الافتراضي؟')) {
            return;
        }

        try {
            setIsUploadingLogo(true);

            // حذف من Supabase Storage
            const { data: files } = await supabase.storage
                .from('medical-waste')
                .list('company-logo');

            if (files && files.length > 0) {
                const filesToRemove = files.map(f => `company-logo/${f.name}`);
                await supabase.storage
                    .from('medical-waste')
                    .remove(filesToRemove);
            }

            // حذف من localStorage
            localStorage.removeItem('customLogo');
            
            setLogoUrl(null);
            setLogoPreview('/logo.png');
            
            alert('تم حذف اللوجو المخصص\nسيتم تحديث الصفحة...');
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('Error removing logo:', error);
            alert('حدث خطأ أثناء حذف اللوجو');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // حفظ في localStorage
            localStorage.setItem('appSettings', JSON.stringify(settings));
            
            // تحديث أيام التنبيه في قاعدة البيانات (اختياري)
            // يمكن إضافة جدول settings في Supabase لاحقاً
            
            alert('تم حفظ الإعدادات بنجاح! ✅');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
                <p className="text-sm text-gray-500 mt-1">إدارة إعدادات النظام والتفضيلات</p>
            </div>

            {/* Logo Upload Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Image className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">شعار الشركة</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                            {logoPreview ? (
                                <img 
                                    src={logoPreview} 
                                    alt="Logo" 
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Image className="w-12 h-12 text-gray-400" />
                            )}
                        </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-4">
                            قم برفع شعار شركتك ليظهر في جميع الصفحات والإيصالات والعقود والفواتير.
                            <br />
                            <span className="text-brand-600 font-medium">الشعار يُحفظ على السيرفر ويظهر لجميع المستخدمين على كل الأجهزة.</span>
                        </p>
                        
                        <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {isUploadingLogo ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>جاري التحميل...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        <span>رفع شعار جديد</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    disabled={isUploadingLogo}
                                />
                            </label>

                            {logoUrl && (
                                <button
                                    onClick={handleRemoveLogo}
                                    disabled={isUploadingLogo}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                    <span>حذف الشعار المخصص</span>
                                </button>
                            )}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                                💡 <strong>نصيحة:</strong> استخدم صورة بخلفية شفافة (PNG) بحجم 500×500 بكسل للحصول على أفضل نتيجة
                            </p>
                        </div>
                    </div>
                </div>
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

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">أنواع الإشعارات</h3>
                        
                        <div className="space-y-3">
                            <ToggleSwitch
                                checked={settings.notifications.contractExpiry}
                                onChange={(value) => setSettings({
                                    ...settings,
                                    notifications: { ...settings.notifications, contractExpiry: value }
                                })}
                                label="انتهاء العقود"
                                description="تنبيه قبل انتهاء العقود"
                            />

                            <ToggleSwitch
                                checked={settings.notifications.vehicleLicense}
                                onChange={(value) => setSettings({
                                    ...settings,
                                    notifications: { ...settings.notifications, vehicleLicense: value }
                                })}
                                label="رخص المركبات"
                                description="تنبيه قبل انتهاء رخص المركبات"
                            />

                            <ToggleSwitch
                                checked={settings.notifications.repLicense}
                                onChange={(value) => setSettings({
                                    ...settings,
                                    notifications: { ...settings.notifications, repLicense: value }
                                })}
                                label="رخص المندوبين"
                                description="تنبيه قبل انتهاء رخص المندوبين"
                            />

                            <ToggleSwitch
                                checked={settings.notifications.routeComplete}
                                onChange={(value) => setSettings({
                                    ...settings,
                                    notifications: { ...settings.notifications, routeComplete: value }
                                })}
                                label="إكمال الرحلات"
                                description="إشعار عند إكمال رحلة"
                            />

                            <ToggleSwitch
                                checked={settings.notifications.invoiceCreated}
                                onChange={(value) => setSettings({
                                    ...settings,
                                    notifications: { ...settings.notifications, invoiceCreated: value }
                                })}
                                label="إنشاء الفواتير"
                                description="إشعار عند إنشاء فاتورة جديدة"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Days Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">أيام التنبيه المسبق</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العقود (بالأيام)</label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={settings.alertDays.contract}
                            onChange={(e) => setSettings({
                                ...settings,
                                alertDays: { ...settings.alertDays, contract: parseInt(e.target.value) || 30 }
                            })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">تنبيه قبل {settings.alertDays.contract} يوم</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رخص المركبات (بالأيام)</label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={settings.alertDays.vehicleLicense}
                            onChange={(e) => setSettings({
                                ...settings,
                                alertDays: { ...settings.alertDays, vehicleLicense: parseInt(e.target.value) || 30 }
                            })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">تنبيه قبل {settings.alertDays.vehicleLicense} يوم</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رخص المندوبين (بالأيام)</label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={settings.alertDays.repLicense}
                            onChange={(e) => setSettings({
                                ...settings,
                                alertDays: { ...settings.alertDays, repLicense: parseInt(e.target.value) || 30 }
                            })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">تنبيه قبل {settings.alertDays.repLicense} يوم</p>
                    </div>
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
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-70"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    حفظ الإعدادات
                </button>
            </div>
        </div>
    );
};

export default Settings;
