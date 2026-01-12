import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import HospitalList from '../../components/contracts/HospitalList';
import HospitalForm from '../../components/contracts/HospitalForm';
import { Plus, Search, Loader2, X } from 'lucide-react';

const Hospitals = () => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter States
    const [filterGovernorate, setFilterGovernorate] = useState('');
    const [filterClientType, setFilterClientType] = useState('');
    const [filterParentEntity, setFilterParentEntity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [parentEntities, setParentEntities] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const egyptGovernorates = [
        'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية',
        'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'الشرقية', 'أسيوط', 'سوهاج', 'قنا',
        'أسوان', 'الأقصر', 'البحر الأحمر', 'كفر الشيخ', 'مطروح', 'بني سويف', 'دمياط',
        'بورسعيد', 'السويس', 'شمال سيناء', 'جنوب سيناء'
    ];

    const clientTypes = [
        { value: 'hospital', label: 'مستشفى' },
        { value: 'clinic', label: 'عيادة' },
        { value: 'lab', label: 'معمل' },
        { value: 'medical_center', label: 'مركز طبي' }
    ];

    // Fetch unique parent entities for filter dropdown
    const fetchParentEntities = async () => {
        try {
            const { data, error } = await supabase
                .from('hospitals')
                .select('parent_entity')
                .not('parent_entity', 'is', null)
                .not('parent_entity', 'eq', '');
            
            if (error) throw error;
            
            const uniqueEntities = [...new Set(data?.map(h => h.parent_entity).filter(Boolean))];
            setParentEntities(uniqueEntities.sort());
        } catch (error) {
            console.error('Error fetching parent entities:', error);
        }
    };

    useEffect(() => {
        fetchParentEntities();
    }, []);

    const fetchHospitals = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('hospitals')
                .select(`
                    *,
                    contracts!hospital_id(count)
                `)
                .order('created_at', { ascending: false});

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,governorate.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
            }

            // Apply filters
            if (filterGovernorate) {
                query = query.eq('governorate', filterGovernorate);
            }
            if (filterClientType) {
                query = query.eq('client_type', filterClientType);
            }
            if (filterParentEntity) {
                query = query.eq('parent_entity', filterParentEntity);
            }
            if (filterStatus !== '') {
                query = query.eq('is_active', filterStatus === 'active');
            }

            const { data, error } = await query;

            if (error) throw error;

            // Process data to add active_contracts_count
            const hospitalsWithCount = (data || []).map(hospital => ({
                ...hospital,
                active_contracts_count: hospital.contracts?.[0]?.count || 0
            }));

            setHospitals(hospitalsWithCount);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHospitals();
    }, [searchTerm, filterGovernorate, filterClientType, filterParentEntity, filterStatus]);

    const clearFilters = () => {
        setFilterGovernorate('');
        setFilterClientType('');
        setFilterParentEntity('');
        setFilterStatus('');
    };

    const activeFiltersCount = [filterGovernorate, filterClientType, filterParentEntity, filterStatus].filter(Boolean).length;

    const handleCreate = () => {
        setEditingHospital(null);
        setIsModalOpen(true);
    };

    const handleEdit = (hospital) => {
        // تحويل visit_days من string لـ array
        const hospitalData = {
            ...hospital,
            visit_days: hospital.visit_days ? hospital.visit_days.split(',') : []
        };
        setEditingHospital(hospitalData);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            // Check if hospital has active contracts
            const { data: activeContracts, error: checkError } = await supabase
                .from('contracts')
                .select('id')
                .eq('hospital_id', id)
                .eq('status', 'active');

            if (checkError) throw checkError;

            if (activeContracts && activeContracts.length > 0) {
                alert(`❌ لا يمكن حذف هذا العميل لأنه يحتوي على ${activeContracts.length} عقد نشط. يجب إنهاء أو إلغاء العقود أولاً.`);
                return;
            }

            // Check if hospital has any contracts at all
            const { data: allContracts, error: allCheckError } = await supabase
                .from('contracts')
                .select('id')
                .eq('hospital_id', id);

            if (allCheckError) throw allCheckError;

            let confirmMessage = 'هل أنت متأكد من حذف هذا العميل؟';
            if (allContracts && allContracts.length > 0) {
                confirmMessage = `⚠️ هذا العميل يحتوي على ${allContracts.length} عقد منتهي أو ملغي. هل تريد حذف العميل وجميع عقوده؟`;
            }

            if (window.confirm(confirmMessage)) {
                const { error } = await supabase.from('hospitals').delete().eq('id', id);
                if (error) throw error;
                setHospitals(hospitals.filter(h => h.id !== id));
                alert('✅ تم حذف العميل بنجاح');
            }
        } catch (error) {
            console.error('Error deleting hospital:', error);
            alert('حدث خطأ أثناء الحذف: ' + error.message);
        }
    };

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            let licenseFileUrl = formData.license_file_url || null;
            let licenseFileName = formData.license_file_name || null;

            // رفع ملف الرخصة إذا كان موجوداً
            if (formData.licenseFile) {
                const file = formData.licenseFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `client-licenses/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('medical-waste')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    alert('حدث خطأ أثناء رفع الملف');
                    setIsSubmitting(false);
                    return;
                }

                // الحصول على رابط الملف
                const { data: urlData } = supabase.storage
                    .from('medical-waste')
                    .getPublicUrl(filePath);

                licenseFileUrl = urlData.publicUrl;
                licenseFileName = file.name;
            }

            // Clean data - include all new fields
            const cleanData = {
                name: formData.name,
                client_type: formData.client_type,
                parent_entity: formData.parent_entity,
                governorate: formData.governorate,
                city: formData.city,
                detailed_address: formData.detailed_address,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                license_number: formData.license_number || null,
                license_expiry_date: formData.license_expiry_date || null,
                license_file_url: licenseFileUrl,
                license_file_name: licenseFileName,
                annual_visits_count: formData.annual_visits_count ? parseInt(formData.annual_visits_count) : null,
                annual_contract_price: formData.annual_contract_price ? parseFloat(formData.annual_contract_price) : null,
                single_visit_price: formData.single_visit_price ? parseFloat(formData.single_visit_price) : null,
                monthly_contract_price: formData.monthly_contract_price ? parseFloat(formData.monthly_contract_price) : null,
                contact_person_name: formData.contact_person_name,
                contact_mobile: formData.contact_mobile,
                contact_landline: formData.contact_landline,
                contact_email: formData.contact_email,
                is_active: formData.is_active,
                // مواعيد الزيارة للعيادات والمراكز الطبية
                visit_hours_from: formData.visit_hours_from || null,
                visit_hours_to: formData.visit_hours_to || null,
                visit_days: Array.isArray(formData.visit_days) ? formData.visit_days.join(',') : (formData.visit_days || null),
                // Keep old fields for backward compatibility
                address: formData.detailed_address || formData.address,
                contact_person: formData.contact_person_name || formData.contact_person,
                contact_phone: formData.contact_mobile || formData.contact_phone
            };

            if (editingHospital) {
                // Update
                const { error } = await supabase
                    .from('hospitals')
                    .update(cleanData)
                    .eq('id', editingHospital.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('hospitals')
                    .insert([cleanData]);
                if (error) throw error;
            }

            await fetchHospitals();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving hospital:', error);
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة قائمة العملاء (مستشفيات، عيادات، معامل، مراكز طبية)</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={handleCreate}
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة عميل</span>
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث باسم العميل، المحافظة، أو المدينة..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Governorate Filter */}
                    <select
                        value={filterGovernorate}
                        onChange={(e) => setFilterGovernorate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
                    >
                        <option value="">كل المحافظات</option>
                        {egyptGovernorates.map(gov => (
                            <option key={gov} value={gov}>{gov}</option>
                        ))}
                    </select>

                    {/* Client Type Filter */}
                    <select
                        value={filterClientType}
                        onChange={(e) => setFilterClientType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
                    >
                        <option value="">كل الأنواع</option>
                        {clientTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>

                    {/* Parent Entity Filter */}
                    <select
                        value={filterParentEntity}
                        onChange={(e) => setFilterParentEntity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
                    >
                        <option value="">كل الجهات التابعة</option>
                        {parentEntities.map(entity => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
                    >
                        <option value="">كل الحالات</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>

                {/* Clear Filters Button */}
                {activeFiltersCount > 0 && (
                    <div className="flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            مسح الفلاتر ({activeFiltersCount})
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <HospitalList
                    hospitals={hospitals}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <HospitalForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingHospital}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Hospitals;
