import { Edit, Trash2, Truck, Activity } from 'lucide-react';

const VehicleList = ({ vehicles, onEdit, onDelete }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-2 h-full bg-brand-500 rounded-l"></div>

                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
                            <Truck className="w-8 h-8" />
                        </div>

                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {vehicle.is_active ? 'نشطة' : 'خارج الخدمة'}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-1" dir="ltr">{vehicle.plate_number}</h3>
                    <p className="text-sm text-gray-500 mb-4">{vehicle.model || 'غير محدد'}</p>

                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">الحمولة القصوى:</span>
                            <span className="font-medium">{vehicle.capacity_kg} كجم</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">آخر صيانة:</span>
                            <span className="font-medium">-</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                        <button
                            onClick={() => onEdit(vehicle)}
                            className="flex-1 py-2 text-sm text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                        >
                            تعديل
                        </button>
                        <button
                            onClick={() => onDelete(vehicle.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Add New Card (Visual cue) */}
            <button
                onClick={() => onEdit(null)}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-gray-50 transition-all group"
            >
                <div className="p-4 bg-gray-50 rounded-full group-hover:bg-brand-50 mb-3 transition-colors">
                    <Truck className="w-8 h-8" />
                </div>
                <span className="font-medium">إضافة مركبة جديدة</span>
            </button>
        </div>
    );
};

export default VehicleList;
