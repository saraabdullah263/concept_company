import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { supabase } from '../../services/supabase';
import { Loader2, X, Plus, Trash2, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const RouteForm = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [representatives, setRepresentatives] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [incinerators, setIncinerators] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm({
        defaultValues: {
            route_name: '',
            route_type: 'collection',
            route_date: format(new Date(), 'yyyy-MM-dd'),
            estimated_start_time: '08:00',
            representative_id: '',
            vehicle_id: '',
            incinerator_id: '',
            maintenance_details: '',
            stops: []
        }
    });

    const routeType = watch('route_type');

    const { fields, append, remove } = useFieldArray({
        control,
        name: "stops"
    });

    // Fetch Options
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setIsLoadingOptions(true);
                try {
                    // 1. Representatives (from representatives table with user info)
                    const { data: reps } = await supabase
                        .from('representatives')
                        .select(`
                            id,
                            users!user_id (
                                full_name
                            )
                        `)
                        .eq('is_available', true);

                    // 2. Vehicles
                    const { data: vehs } = await supabase
                        .from('vehicles')
                        .select('id, plate_number, model')
                        .eq('is_active', true);

                    // 3. Incinerators
                    const { data: incs } = await supabase
                        .from('incinerators')
                        .select('id, name')
                        .eq('is_active', true);

                    // 4. Clients (Hospitals)
                    const { data: hosps } = await supabase
                        .from('hospitals')
                        .select('id, name, address')
                        .eq('is_active', true);

                    setRepresentatives(reps || []);
                    setVehicles(vehs || []);
                    setIncinerators(incs || []);
                    setHospitals(hosps || []);

                    // Show warning if no representatives
                    if (!reps || reps.length === 0) {
                        console.warn('⚠️ لا يوجد مندوبين في النظام. يجب إضافة مندوبين أولاً من صفحة المستخدمين.');
                    }
                } catch (error) {
                    console.error('Error fetching options:', error);
                } finally {
                    setIsLoadingOptions(false);
                }
            };

            fetchData().then(() => {
                // Reset form after data is loaded
                if (initialData) {
                    console.log('Setting initial data:', initialData);
                    reset(initialData);
                } else {
                    reset({
                        route_name: '',
                        route_type: 'collection',
                        route_date: format(new Date(), 'yyyy-MM-dd'),
                        estimated_start_time: '08:00',
                        representative_id: '',
                        vehicle_id: '',
                        incinerator_id: '',
                        maintenance_details: '',
                        stops: []
                    });
                }
            });
        }
    }, [isOpen, initialData, reset]);

    const onFormSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data); // onSubmit will handle the API calls
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل خط سير' : 'إنشاء خط سير جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* 1. Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">بيانات خط السير</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نوع خط السير</label>
                                <select
                                    {...register('route_type')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                >
                                    <option value="collection">خط جمع</option>
                                    <option value="maintenance">خط صيانة</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم خط السير (اختياري)</label>
                                <input
                                    type="text"
                                    {...register('route_name')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="مثال: خط الصباح - وسط البلد"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ خط السير</label>
                                <input
                                    type="date"
                                    {...register('route_date', { required: 'التاريخ مطلوب' })}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                                {errors.route_date && <p className="mt-1 text-sm text-red-600">{errors.route_date.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية المتوقع</label>
                                <input
                                    type="time"
                                    {...register('estimated_start_time')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="08:00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المندوب</label>
                                <select
                                    {...register('representative_id', { required: 'المندوب مطلوب' })}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                >
                                    <option value="">اختر المندوب...</option>
                                    {representatives.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.users?.full_name || 'مندوب'}</option>
                                    ))}
                                    {representatives.length === 0 && !isLoadingOptions && <option disabled>لا يوجد مندوبين</option>}
                                </select>
                                {errors.representative_id && <p className="mt-1 text-sm text-red-600">{errors.representative_id.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المركبة</label>
                                <select
                                    {...register('vehicle_id', { required: 'المركبة مطلوبة' })}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                >
                                    <option value="">اختر المركبة...</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.plate_number} - {v.model}</option>
                                    ))}
                                </select>
                                {errors.vehicle_id && <p className="mt-1 text-sm text-red-600">{errors.vehicle_id.message}</p>}
                            </div>

                            {routeType !== 'maintenance' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    المحرقة (الوجهة النهائية) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    {...register('incinerator_id', { 
                                        required: routeType !== 'maintenance' ? 'المحرقة مطلوبة' : false 
                                    })}
                                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white ${
                                        errors.incinerator_id ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                >
                                    <option value="">اختر المحرقة...</option>
                                    {incinerators.map(inc => (
                                        <option key={inc.id} value={inc.id}>{inc.name}</option>
                                    ))}
                                </select>
                                {errors.incinerator_id && (
                                    <p className="mt-1 text-sm text-red-600">{errors.incinerator_id.message}</p>
                                )}
                            </div>
                            )}

                            {routeType === 'maintenance' && (
                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل الصيانة</label>
                                <textarea
                                    {...register('maintenance_details')}
                                    rows={3}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="اكتب تفاصيل الصيانة المطلوبة... مثال: تغيير زيت، فحص الفرامل، إلخ"
                                />
                            </div>
                            )}

                        </div>
                    </section>

                    {/* 2. Stops - فقط لرحلات الجمع */}
                    {routeType === 'collection' && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-medium text-gray-900">محطات الوقوف (العملاء)</h3>
                            <button
                                type="button"
                                onClick={() => append({ hospital_id: '', estimated_arrival: '' })}
                                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                إضافة محطة
                            </button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <span className="bg-brand-100 text-brand-800 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0">
                                        {index + 1}
                                    </span>

                                    <div className="flex-1 w-full">
                                        <Controller
                                            name={`stops.${index}.hospital_id`}
                                            control={control}
                                            rules={{ required: 'يجب اختيار العميل' }}
                                            render={({ field: selectField }) => (
                                                <select
                                                    {...selectField}
                                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
                                                >
                                                    <option value="">اختر العميل...</option>
                                                    {hospitals.map(h => (
                                                        <option key={h.id} value={h.id}>{h.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        />
                                        {errors.stops?.[index]?.hospital_id && (
                                            <p className="text-xs text-red-600 mt-1">{errors.stops[index].hospital_id.message}</p>
                                        )}
                                    </div>

                                    <div className="w-full md:w-48">
                                        <input
                                            type="time"
                                            {...register(`stops.${index}.estimated_arrival`)}
                                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                            placeholder="وقت الوصول المتوقع"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>لم يتم إضافة أي محطات بعد.</p>
                                    <button
                                        type="button"
                                        onClick={() => append({ hospital_id: '', estimated_arrival: '' })}
                                        className="mt-2 text-brand-600 hover:underline text-sm"
                                    >
                                        إضافة المحطة الأولى
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                    )}

                </form>

                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white rounded-b-xl flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 bg-transparent"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit(onFormSubmit)}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        حفظ خط السير
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RouteForm;
