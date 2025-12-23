import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import ContractList from '../../components/contracts/ContractList';
import ContractForm from '../../components/contracts/ContractForm';
import { Plus, Search, Loader2 } from 'lucide-react';

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                filteredData = filteredData.filter(c =>
                    c.hospitals?.name?.toLowerCase().includes(lowerTerm) ||
                    c.id.includes(lowerTerm)
                );
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
    }, [searchTerm]);

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Clean data - remove any joined fields
            const cleanData = {
                contract_number: data.contract_number,
                hospital_id: data.hospital_id,
                start_date: data.start_date,
                end_date: data.end_date,
                price_per_kg: data.price_per_kg,
                status: data.status,
                notes: data.notes || null
            };

            if (editingContract) {
                const { error } = await supabase
                    .from('contracts')
                    .update(cleanData)
                    .eq('id', editingContract.id);
                if (error) throw error;
            } else {
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

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث باسم العميل..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
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
                <ContractList
                    contracts={contracts}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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
