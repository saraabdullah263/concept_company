import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import HospitalList from '../../components/contracts/HospitalList';
import HospitalForm from '../../components/contracts/HospitalForm';
import { Plus, Search, Loader2 } from 'lucide-react';

const Hospitals = () => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    }, [searchTerm]);

    const handleCreate = () => {
        setEditingHospital(null);
        setIsModalOpen(true);
    };

    const handleEdit = (hospital) => {
        setEditingHospital(hospital);
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

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Clean data - include all new fields
            const cleanData = {
                name: data.name,
                client_type: data.client_type,
                parent_entity: data.parent_entity,
                governorate: data.governorate,
                city: data.city,
                detailed_address: data.detailed_address,
                latitude: data.latitude ? parseFloat(data.latitude) : null,
                longitude: data.longitude ? parseFloat(data.longitude) : null,
                annual_visits_count: data.annual_visits_count ? parseInt(data.annual_visits_count) : null,
                annual_contract_price: data.annual_contract_price ? parseFloat(data.annual_contract_price) : null,
                contact_person_name: data.contact_person_name,
                contact_mobile: data.contact_mobile,
                contact_landline: data.contact_landline,
                contact_email: data.contact_email,
                is_active: data.is_active,
                // Keep old fields for backward compatibility
                address: data.detailed_address || data.address,
                contact_person: data.contact_person_name || data.contact_person,
                contact_phone: data.contact_mobile || data.contact_phone
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث باسم العميل، المحافظة، أو المدينة..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
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
