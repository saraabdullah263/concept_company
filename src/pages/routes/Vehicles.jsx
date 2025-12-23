import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import VehicleList from '../../components/routes/VehicleList';
import VehicleForm from '../../components/routes/VehicleForm';
import { Plus, Search, Loader2, AlertTriangle } from 'lucide-react';

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
                .select(`
                    *,
                    representatives!owner_representative_id (
                        id,
                        users!user_id (
                            full_name
                        )
                    )
                `)
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

    // Check for expiring licenses
    const expiringLicenses = useMemo(() => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        return vehicles.filter(v => {
            if (!v.license_renewal_date) return false;
            const renewalDate = new Date(v.license_renewal_date);
            return renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
        });
    }, [vehicles]);

    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Clean data - convert empty string to null for owner_representative_id
            const cleanData = {
                ...data,
                owner_representative_id: data.owner_representative_id || null,
                license_renewal_date: data.license_renewal_date || null
            };

            if (editingVehicle) {
                const { error } = await supabase
                    .from('vehicles')
                    .update(cleanData)
                    .eq('id', editingVehicle.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vehicles')
                    .insert([cleanData]);
                if (error) throw error;
            }
            await fetchVehicles();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            
            // Better error messages
            let errorMessage = 'حدث خطأ أثناء الحفظ';
            if (error.message) {
                if (error.message.includes('owner_representative_id')) {
                    errorMessage = '⚠️ يجب تشغيل SQL Migration أولاً!\n\nقم بتشغيل ملف update_vehicles_fields.sql في Supabase';
                } else if (error.message.includes('duplicate')) {
                    errorMessage = 'رقم اللوحة موجود مسبقاً';
                } else {
                    errorMessage = `خطأ: ${error.message}`;
                }
            }
            
            alert(errorMessage);
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

            {/* Expiring Licenses Alert */}
            {expiringLicenses.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-yellow-800 mb-1">
                                تنبيه: رخص قريبة من الانتهاء
                            </h3>
                            <div className="text-sm text-yellow-700 space-y-1">
                                {expiringLicenses.map(v => (
                                    <p key={v.id}>
                                        • <span className="font-medium">{v.plate_number}</span> - 
                                        تنتهي في {new Date(v.license_renewal_date).toLocaleDateString('ar-EG')}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
