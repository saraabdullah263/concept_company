import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import VehicleList from '../../components/routes/VehicleList';
import VehicleForm from '../../components/routes/VehicleForm';
import { Plus, Search, Loader2 } from 'lucide-react';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.ilike('plate_number', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setVehicles(data || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, [searchTerm]);

    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            if (editingVehicle) {
                const { error } = await supabase
                    .from('vehicles')
                    .update(data)
                    .eq('id', editingVehicle.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vehicles')
                    .insert([data]);
                if (error) throw error;
            }
            await fetchVehicles();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المركبة؟')) {
            try {
                const { error } = await supabase.from('vehicles').delete().eq('id', id);
                if (error) throw error;
                setVehicles(vehicles.filter(v => v.id !== id));
            } catch (error) {
                console.error('Error deleting vehicle:', error);
                alert('حدث خطأ أثناء الحذف');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الأسطول</h1>
                    <p className="text-sm text-gray-500 mt-1">تتبع وصيانة المركبات</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={() => handleEdit(null)}
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة مركبة</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث برقم اللوحة..."
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
                <VehicleList
                    vehicles={vehicles}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <VehicleForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingVehicle}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Vehicles;
