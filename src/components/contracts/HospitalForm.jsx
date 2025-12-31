import { useForm } from 'react-hook-form';
import { Loader2, X, MapPin, Building2, User, Navigation, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const HospitalForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const [gettingLocation, setGettingLocation] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            client_type: 'hospital',
            governorate: '',
            city: '',
            detailed_address: '',
            latitude: '',
            longitude: '',
            parent_entity: '',
            annual_visits_count: '',
            annual_contract_price: '',
            single_visit_price: '',
            monthly_contract_price: '',
            contact_person_name: '',
            contact_mobile: '',
            contact_landline: '',
            contact_email: '',
            visit_hours_from: '',
            visit_hours_to: '',
            visit_days: [],
            is_active: true
        }
    });

    const latitude = watch('latitude');
    const longitude = watch('longitude');
    const clientName = watch('name');
    const city = watch('city');
    const clientType = watch('client_type');

    const openMapPicker = () => {
        const lat = latitude || '30.0444';
        const lng = longitude || '31.2357';
        const searchQuery = clientName && city ? `${clientName}, ${city}, Egypt` : 'Cairo, Egypt';
        
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/@${lat},${lng},15z`;
        
        // فتح الخريطة
        window.open(
            mapUrl,
            'MapPicker',
            'width=900,height=700,left=200,top=50'
        );
        
        // عرض التعليمات
        setShowInstructions(true);
    };

    const handleCoordinatesSubmit = (coords) => {
        if (coords) {
            const parts = coords.split(',').map(c => c.trim());
            if (parts.length >= 2) {
                const lat = parts[0];
                const lng = parts[1];
                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    setValue('latitude', lat);
                    setValue('longitude', lng);
                    getAddressFromCoords(lat, lng);
                    setShowInstructions(false);
                    return true;
                }
            }
        }
        alert('❌ الإحداثيات غير صحيحة. تأكد من نسخها بالشكل الصحيح (مثال: 30.0444, 31.2357)');
        return false;
    };

    const getAddressFromCoords = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
                {
                    headers: {
                        'User-Agent': 'MedicalWasteApp/1.0'
                    }
                }
            );
            const data = await response.json();
            
            if (data && data.display_name) {
                setSelectedAddress(data.display_name);
                if (!watch('detailed_address')) {
                    setValue('detailed_address', data.display_name);
                }
            } else {
                setSelectedAddress(`الموقع: ${lat}, ${lng}`);
            }
        } catch (error) {
            console.error('Error getting address:', error);
            setSelectedAddress(`الموقع: ${lat}, ${lng}`);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('المتصفح لا يدعم تحديد الموقع الجغرافي');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                
                setValue('latitude', lat);
                setValue('longitude', lng);
                
                await getAddressFromCoords(lat, lng);
                alert('✅ تم تحديد الموقع بنجاح!');
                setGettingLocation(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                let errorMessage = 'فشل الحصول على الموقع. ';
                if (error.code === 1) {
                    errorMessage += 'يجب السماح بالوصول للموقع من إعدادات المتصفح.';
                } else if (error.code === 2) {
                    errorMessage += 'الموقع غير متاح حالياً.';
                } else {
                    errorMessage += 'حدث خطأ أثناء تحديد الموقع.';
                }
                alert(errorMessage);
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset(initialData);
                if (initialData.latitude && initialData.longitude) {
                    getAddressFromCoords(initialData.latitude, initialData.longitude);
                }
            } else {
                reset({
                    name: '',
                    client_type: 'hospital',
                    governorate: '',
                    city: '',
                    detailed_address: '',
                    latitude: '',
                    longitude: '',
                    parent_entity: '',
                    annual_visits_count: '',
                    annual_contract_price: '',
                    single_visit_price: '',
                    monthly_contract_price: '',
                    contact_person_name: '',
                    contact_mobile: '',
                    contact_landline: '',
                    contact_email: '',
                    visit_hours_from: '',
                    visit_hours_to: '',
                    visit_days: [],
                    is_active: true
                });
                setSelectedAddress('');
            }
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    const egyptGovernorates = [
        'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية',
        'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'الشرقية', 'أسيوط', 'سوهاج', 'قنا',
        'أسوان', 'الأقصر', 'البحر الأحمر', 'كفر الشيخ', 'مطروح', 'بني سويف', 'دمياط',
        'بورسعيد', 'السويس', 'شمال سيناء', 'جنوب سيناء'
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-brand-600" />
                            بيانات الجهة
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    اسم الجهة الرسمي <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('name', { required: 'اسم الجهة مطلوب' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                        errors.name ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                    placeholder="مثال: مستشفى السلام الدولي"
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    نوع الجهة <span className="text-red-500">*</span>
                                </label>
                                <select
                                    {...register('client_type', { required: 'نوع الجهة مطلوب' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                        errors.client_type ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                >
                                    <option value="hospital">مستشفى</option>
                                    <option value="clinic">عيادة</option>
                                    <option value="lab">معمل</option>
                                    <option value="medical_center">مركز طبي</option>
                                </select>
                                {errors.client_type && <p className="mt-1 text-sm text-red-600">{errors.client_type.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الجهة التابع لها</label>
                                <input
                                    type="text"
                                    {...register('parent_entity')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: وزارة الصحة، القطاع الخاص"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-brand-600" />
                            الموقع
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    المحافظة <span className="text-red-500">*</span>
                                </label>
                                <select
                                    {...register('governorate', { required: 'المحافظة مطلوبة' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                        errors.governorate ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                >
                                    <option value="">اختر المحافظة</option>
                                    {egyptGovernorates.map(gov => (
                                        <option key={gov} value={gov}>{gov}</option>
                                    ))}
                                </select>
                                {errors.governorate && <p className="mt-1 text-sm text-red-600">{errors.governorate.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    المدينة <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('city', { required: 'المدينة مطلوبة' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                        errors.city ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                    placeholder="مثال: مصر الجديدة"
                                />
                                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    العنوان بالتفصيل
                                </label>
                                <textarea
                                    {...register('detailed_address')}
                                    rows="2"
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors"
                                    placeholder="مثال: 15 شارع الثورة، بجوار مسجد النور"
                                />
                            </div>

                            {/* Location Picker */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">موقع العميل على الخريطة</label>
                                
                                {!selectedAddress && !latitude ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-sm text-gray-600 mb-4">لم يتم تحديد الموقع بعد</p>
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                type="button"
                                                onClick={openMapPicker}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <Map className="w-4 h-4" />
                                                اختر من الخريطة
                                            </button>
                                            <button
                                                type="button"
                                                onClick={getCurrentLocation}
                                                disabled={gettingLocation}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {gettingLocation ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        جاري التحديد...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Navigation className="w-4 h-4" />
                                                        موقعي الحالي
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-green-300 bg-green-50 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-green-900 mb-1">تم تحديد الموقع ✓</p>
                                                <p className="text-sm text-green-700">{selectedAddress || 'موقع محدد'}</p>
                                                {latitude && longitude && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-green-600 hover:underline mt-2 inline-flex items-center gap-1"
                                                    >
                                                        <Map className="w-3 h-3" />
                                                        عرض على Google Maps
                                                    </a>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAddress('');
                                                    setValue('latitude', '');
                                                    setValue('longitude', '');
                                                }}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="إزالة الموقع"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={openMapPicker}
                                                className="text-xs text-green-700 hover:text-green-800 font-medium"
                                            >
                                                تغيير الموقع
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <input type="hidden" {...register('latitude')} />
                                <input type="hidden" {...register('longitude')} />
                            </div>
                        </div>
                    </div>

                    {/* Contract Info Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-brand-600" />
                            بيانات التعاقد
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    عدد الزيارات السنوية
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    {...register('annual_visits_count')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: 52 (زيارة أسبوعية)"
                                />
                                <p className="text-xs text-gray-500 mt-1">عدد الزيارات المتفق عليها سنوياً</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    سعر التعاقد السنوي (ج.م)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register('annual_contract_price')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: 50000"
                                />
                                <p className="text-xs text-gray-500 mt-1">إجمالي قيمة التعاقد السنوي</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    سعر الزيارة الواحدة (ج.م)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register('single_visit_price')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: 500"
                                />
                                <p className="text-xs text-gray-500 mt-1">سعر الزيارة الواحدة للعميل</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    سعر التعاقد الشهري (ج.م)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register('monthly_contract_price')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: 4000"
                                />
                                <p className="text-xs text-gray-500 mt-1">قيمة التعاقد الشهري</p>
                            </div>
                        </div>
                    </div>

                    {/* Visit Hours Section - للعيادات والمراكز الطبية */}
                    {(clientType === 'clinic' || clientType === 'medical_center') && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            مواعيد الزيارة المتاحة
                        </h3>
                        <p className="text-sm text-gray-500">حدد الأوقات المتاحة لزيارة هذا العميل</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    من الساعة
                                </label>
                                <input
                                    type="time"
                                    {...register('visit_hours_from')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    إلى الساعة
                                </label>
                                <input
                                    type="time"
                                    {...register('visit_hours_to')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    أيام الزيارة المتاحة
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
                                        <label key={day} className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                value={day}
                                                {...register('visit_days')}
                                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                            />
                                            <span className="mr-2 text-sm text-gray-700">{day}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Contact Info Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-brand-600" />
                            بيانات التواصل
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    اسم مسئول التواصل <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('contact_person_name', { required: 'اسم مسئول التواصل مطلوب' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                        errors.contact_person_name ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                    placeholder="مثال: أحمد محمد"
                                />
                                {errors.contact_person_name && <p className="mt-1 text-sm text-red-600">{errors.contact_person_name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    رقم الموبايل <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    dir="ltr"
                                    {...register('contact_mobile', { required: 'رقم الموبايل مطلوب' })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-right",
                                        errors.contact_mobile ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                    placeholder="01xxxxxxxxx"
                                />
                                {errors.contact_mobile && <p className="mt-1 text-sm text-red-600">{errors.contact_mobile.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم أرضي</label>
                                <input
                                    type="tel"
                                    dir="ltr"
                                    {...register('contact_landline')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-right"
                                    placeholder="02xxxxxxxx"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    dir="ltr"
                                    {...register('contact_email')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-right"
                                    placeholder="info@hospital.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                {...register('is_active')}
                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">العميل نشط حالياً</label>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                            {initialData ? 'حفظ التعديلات' : 'إضافة العميل'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">كيفية نسخ الإحداثيات</h3>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">ابحث عن موقع العميل</p>
                                        <p className="text-xs text-gray-600 mt-1">في نافذة Google Maps المفتوحة</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">اضغط بزر الماوس الأيمن على الموقع</p>
                                        <p className="text-xs text-gray-600 mt-1">أو اضغط مطولاً على الموبايل</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">انسخ الإحداثيات</p>
                                        <p className="text-xs text-gray-600 mt-1">ستظهر في أعلى القائمة (رقمين مفصولين بفاصلة)</p>
                                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 text-center">
                                            30.0444, 31.2357
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                                        4
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">الصق الإحداثيات هنا</p>
                                        <input
                                            type="text"
                                            id="coords-input"
                                            placeholder="30.0444, 31.2357"
                                            className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleCoordinatesSubmit(e.target.value);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInstructions(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('coords-input');
                                        handleCoordinatesSubmit(input.value);
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                                >
                                    حفظ الموقع
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HospitalForm;
