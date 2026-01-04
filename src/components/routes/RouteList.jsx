import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Truck, User, MapPin, Clock, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const RouteList = ({ routes, onEdit }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRouteTypeLabel = (type) => {
        return type === 'maintenance' ? 'صيانة' : 'جمع';
    };

    const getRouteTypeColor = (type) => {
        return type === 'maintenance' ? 'bg-orange-100 text-orange-800' : 'bg-brand-100 text-brand-800';
    };

    const traverseStatus = {
        'pending': 'معلقة',
        'in_progress': 'جارية',
        'completed': 'مكتملة',
        'cancelled': 'ملغاة'
    };

    return (
        <div className="grid grid-cols-1 gap-4">
            {routes.map((route) => (
                <div key={route.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                        {/* Header & Main Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                                    {traverseStatus[route.status] || route.status}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRouteTypeColor(route.route_type)}`}>
                                    {getRouteTypeLabel(route.route_type)}
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {route.route_name || `خط سير #${route.id.slice(0, 8)}`}
                                </h3>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>{route.representatives?.users?.full_name || 'غير معين'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    <span>{route.vehicles?.plate_number || 'غير دقيق'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{route.route_date ? format(new Date(route.route_date), 'PPP', { locale: ar }) : '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats - فقط لرحلات الجمع */}
                        {route.route_type !== 'maintenance' && (
                        <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">المحطات</p>
                                <p className="font-bold text-gray-900">{route.stop_count || 0}</p>
                            </div>
                            <div className="text-center border-r border-gray-200 pr-6">
                                <p className="text-xs text-gray-500">الوزن (كجم)</p>
                                <p className="font-bold text-gray-900">
                                    {route.route_stops ? 
                                        (route.route_stops.reduce((sum, s) => sum + (parseFloat(s.collection_details?.total_weight) || 0) + (parseFloat(s.collection_details?.safety_box_weight) || 0), 0)).toFixed(0) 
                                        : (route.total_weight_collected || 0)}
                                </p>
                            </div>
                        </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Link to={`/routes/${route.id}`} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="عرض التفاصيل">
                                <Eye className="w-5 h-5" />
                            </Link>
                            <button onClick={() => onEdit(route)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                                <Edit className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar (Visual flair) */}
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: route.status === 'completed' ? '100%' : route.status === 'in_progress' ? '50%' : '0%' }}
                        />
                    </div>
                </div>
            ))}

            {routes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">لا توجد رحلات مضافة لهذا اليوم.</p>
                </div>
            )}
        </div>
    );
};

export default RouteList;
