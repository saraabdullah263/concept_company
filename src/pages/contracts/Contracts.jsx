import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import ContractList from '../../components/contracts/ContractList';
import ContractForm from '../../components/contracts/ContractForm';
import { Plus, Search, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterDuration, setFilterDuration] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // جلب قائمة العملاء للفلتر
    useEffect(() => {
        const fetchHospitals = async () => {
            const { data } = await supabase
                .from('hospitals')
                .select('id, name')
                .order('name');
            if (data) {
                setHospitals(data);
            }
        };
        fetchHospitals();
    }, []);

    const fetchContracts = async () => {
        try {
            setLoading(true);

            // Need to join with hospitals to get hospital name, but Supabase Join via FK is easy
            let query = supabase
                .from('contracts')
                .select(`
          *,
          hospitals (
            name
          )
        `)
                .order('created_at', { ascending: false });

            // Search (Client side filtering for joined table or separate query? 
            // Supabase supports embedding filter: .ilike('hospitals.name', ...) )
            // But for simplicity let's filter purely by ID or just fetch all and filter in memory if small
            // Or use text search if configured.

            if (searchTerm) {
                // If searching by hospital name, it's tricky with simple joins. 
                // Let's stick to simple client side filter if small dataset, 
                // or rely on ID search.
                // Or:
                // query = query.textSearch('some_col', searchTerm);
            }

            const { data, error } = await query;
            if (error) throw error;

            let filteredData = data || [];
            
            // تحديث حالة العقود المنتهية تلقائياً
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const expiredContracts = filteredData.filter(c => {
                const endDate = new Date(c.end_date);
                endDate.setHours(0, 0, 0, 0);
                return endDate <= today && c.status === 'active';
            });

            // تحديث العقود المنتهية في قاعدة البيانات
            if (expiredContracts.length > 0) {
                const updatePromises = expiredContracts.map(contract =>
                    supabase
                        .from('contracts')
                        .update({ status: 'expired' })
                        .eq('id', contract.id)
                );
                await Promise.all(updatePromises);
                
                // تحديث البيانات المحلية
                filteredData = filteredData.map(c => {
                    const endDate = new Date(c.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    if (endDate <= today && c.status === 'active') {
                        return { ...c, status: 'expired' };
                    }
                    return c;
                });
            }
            
            // فلتر بالعميل
            if (selectedHospital !== 'all') {
                filteredData = filteredData.filter(c => c.hospital_id === selectedHospital);
            }

            // فلتر بالبحث (رقم العقد)
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                filteredData = filteredData.filter(c =>
                    c.contract_number?.toLowerCase().includes(lowerTerm)
                );
            }

            // فلتر بالتاريخ (عقد ساري في هذا التاريخ)
            if (filterDate) {
                filteredData = filteredData.filter(c => {
                    const startDate = new Date(c.start_date);
                    const endDate = new Date(c.end_date);
                    const filterDateObj = new Date(filterDate);
                    return filterDateObj >= startDate && filterDateObj <= endDate;
                });
            }

            // فلتر بنطاق التاريخ (من - إلى)
            if (filterDateFrom) {
                filteredData = filteredData.filter(c => {
                    const startDate = new Date(c.start_date);
                    const fromDate = new Date(filterDateFrom);
                    return startDate >= fromDate;
                });
            }
            if (filterDateTo) {
                filteredData = filteredData.filter(c => {
                    const endDate = new Date(c.end_date);
                    const toDate = new Date(filterDateTo);
                    return endDate <= toDate;
                });
            }

            // فلتر بمدة العقد
            if (filterDuration !== 'all') {
                filteredData = filteredData.filter(c => 
                    c.contract_duration === filterDuration
                );
            }

            // فلتر بحالة العقد
            if (filterStatus !== 'all') {
                filteredData = filteredData.filter(c => c.status === filterStatus);
            }

            setContracts(filteredData);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, [searchTerm, filterDate, filterDateFrom, filterDateTo, filterDuration, filterStatus, selectedHospital]);

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setIsModalOpen(true);
    };

    const handleRenew = (contract) => {
        // إنشاء عقد جديد بناءً على العقد القديم
        const today = new Date();
        const oneYearLater = new Date(today);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

        const renewedContract = {
            hospital_id: contract.hospital_id,
            start_date: format(today, 'yyyy-MM-dd'),
            end_date: format(oneYearLater, 'yyyy-MM-dd'),
            price_per_kg: contract.price_per_kg,
            contract_fees: contract.contract_fees || 0,
            contract_duration: contract.contract_duration || 'سنة واحدة',
            min_weight: contract.min_weight || 15,
            min_price: contract.min_price,
            license_number: contract.license_number,
            license_expiry_date: contract.license_expiry_date,
            client_activity: contract.client_activity,
            commercial_register: contract.commercial_register,
            tax_number: contract.tax_number,
            manager_name: contract.manager_name,
            custom_clauses: contract.custom_clauses,
            status: 'active',
            notes: `تجديد للعقد ${contract.contract_number || '#' + contract.id.slice(0, 8)}`
        };

        setEditingContract(renewedContract);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Clean data - remove any joined fields
            const cleanData = {
                hospital_id: data.hospital_id,
                start_date: data.start_date,
                end_date: data.end_date,
                price_per_kg: data.price_per_kg,
                contract_fees: data.contract_fees || 0,
                contract_duration: data.contract_duration,
                min_weight: data.min_weight || 15,
                min_price: data.min_price || null,
                license_number: data.license_number || null,
                license_expiry_date: data.license_expiry_date || null,
                client_activity: data.client_activity,
                commercial_register: data.commercial_register,
                tax_number: data.tax_number,
                manager_name: data.manager_name,
                custom_clauses: data.custom_clauses ? JSON.stringify(data.custom_clauses) : null,
                status: data.status,
                notes: data.notes || null
            };

            if (editingContract) {
                // في حالة التعديل، نحتفظ برقم العقد الموجود
                cleanData.contract_number = data.contract_number;
                
                const { error } = await supabase
                    .from('contracts')
                    .update(cleanData)
                    .eq('id', editingContract.id);
                if (error) throw error;
            } else {
                // في حالة الإضافة، الـ trigger هيولد الرقم تلقائياً
                const { error } = await supabase
                    .from('contracts')
                    .insert([cleanData]);
                if (error) throw error;
            }
            await fetchContracts();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving contract:', error);
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا العقد؟')) {
            try {
                const { error } = await supabase.from('contracts').delete().eq('id', id);
                if (error) throw error;
                setContracts(contracts.filter(c => c.id !== id));
            } catch (error) {
                console.error('Error deleting contract:', error);
                alert('حدث خطأ أثناء الحذف');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة العقود</h1>
                    <p className="text-sm text-gray-500 mt-1">عقود العملاء وأسعار الخدمة</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={() => handleEdit(null)}
                >
                    <Plus className="w-5 h-5" />
                    <span>عقد جديد</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                {/* الصف الأول - البحث والفلاتر الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="بحث برقم العقد..."
                            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={selectedHospital}
                        onChange={(e) => setSelectedHospital(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="all">جميع العملاء</option>
                        {hospitals.map(hospital => (
                            <option key={hospital.id} value={hospital.id}>
                                {hospital.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="all">جميع الحالات</option>
                        <option value="active">ساري</option>
                        <option value="expired">منتهي</option>
                        <option value="renewal">تجديد</option>
                        <option value="terminated">ملغي</option>
                    </select>
                    <select
                        value={filterDuration}
                        onChange={(e) => setFilterDuration(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="all">جميع المدد</option>
                        <option value="3 أشهر">3 أشهر</option>
                        <option value="6 أشهر">6 أشهر</option>
                        <option value="سنة واحدة">سنة واحدة</option>
                        <option value="سنتين">سنتين</option>
                        <option value="3 سنوات">3 سنوات</option>
                    </select>
                </div>

                {/* الصف الثاني - نطاق التاريخ */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-gray-100">
                    <label className="text-sm text-gray-600 font-medium whitespace-nowrap">نطاق التاريخ:</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                        <div className="relative w-full sm:w-auto sm:flex-1">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                            />
                        </div>
                        <span className="text-gray-400 text-sm">إلى</span>
                        <div className="relative w-full sm:w-auto sm:flex-1">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                            />
                        </div>
                        {(filterDateFrom || filterDateTo) && (
                            <button
                                onClick={() => {
                                    setFilterDateFrom('');
                                    setFilterDateTo('');
                                }}
                                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                            >
                                ✕ مسح
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <ContractList
                    contracts={contracts}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRenew={handleRenew}
                />
            )}

            {contracts.length === 0 && !loading && !searchTerm && (
                <div className="text-center py-12 text-gray-500">
                    <p>لا توجد عقود مسجلة. أضف عقداً لأحد العملاء.</p>
                </div>
            )}

            <ContractForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingContract}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Contracts;
