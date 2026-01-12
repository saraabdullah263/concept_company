import { Link } from 'react-router-dom';
import { 
    MapPin, 
    User, 
    Truck, 
    Calendar, 
    Package, 
    Clock,
    Factory,
    CheckCircle,
    AlertCircle,
    Building2,
    FileText
} from 'lucide-react';
import clsx from 'clsx';

const TripList = ({ trips }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
            case 'collected': 
                return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress':
            case 'arrived': 
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled':
            case 'skipped': 
                return 'bg-red-100 text-red-800 border-red-200';
            default: 
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
            case 'collected': 
                return 'مكتملة';
            case 'in_progress':
            case 'arrived': 
                return 'جارية';
            case 'cancelled':
            case 'skipped': 
                return 'ملغاة';
            default: 
                return 'معلقة';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
            case 'collected': 
                return <CheckCircle className="w-4 h-4" />;
            case 'in_progress':
            case 'arrived': 
                return <Clock className="w-4 h-4 animate-pulse" />;
            case 'cancelled':
            case 'skipped': 
                return <AlertCircle className="w-4 h-4" />;
            default: 
                return <Clock className="w-4 h-4" />;
        }
    };

    const getTripTypeIcon = (type) => {
        return type === 'hospital' 
            ? <Building2 className="w-5 h-5" />
            : <Factory className="w-5 h-5" />;
    };

    const getTripTypeColor = (type) => {
        return type === 'hospital'
            ? 'from-blue-500 to-blue-600'
            : 'from-purple-500 to-purple-600';
    };

    if (!trips || trips.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد رحلات</h3>
                <p className="text-gray-500">لم يتم العثور على رحلات بالمعايير المحددة</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {trips.map((trip) => (
                <Link
                    key={`${trip.trip_type}-${trip.trip_id}`}
                    to={`/routes/${trip.route_id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all duration-200 overflow-hidden group flex"
                >
                    {/* Right Side - Type Indicator */}
                    <div className={clsx(
                        "w-1 flex-shrink-0",
                        trip.trip_type === 'hospital' ? 'bg-brand-500' : 'bg-purple-500'
                    )} />

                    {/* Main Content */}
                    <div className="flex-1 flex items-center gap-4 p-4">
                        {/* Icon */}
                        <div className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            trip.trip_type === 'hospital' ? 'bg-brand-50' : 'bg-purple-50'
                        )}>
                            {trip.trip_type === 'hospital' 
                                ? <Building2 className="w-5 h-5 text-brand-600" />
                                : <Factory className="w-5 h-5 text-purple-600" />
                            }
                        </div>

                        {/* Destination Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-base text-gray-900 truncate">
                                    {trip.destination}
                                </h3>
                                <span className={clsx(
                                    "px-2 py-0.5 rounded text-xs font-medium",
                                    getStatusColor(trip.status)
                                )}>
                                    {getStatusText(trip.status)}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{trip.route_number || trip.route_name || 'خط سير'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {new Date(trip.route_date).toLocaleDateString('ar-EG', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                {(trip.arrival_time || trip.delivery_time) && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {new Date(trip.arrival_time || trip.delivery_time).toLocaleTimeString('ar-EG', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {trip.destination_address && (
                                <div className="flex items-start gap-1 text-xs text-gray-400 mt-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span className="truncate">{trip.destination_address}</span>
                                </div>
                            )}
                        </div>

                        {/* Representative & Vehicle - Hidden on mobile */}
                        <div className="hidden lg:flex items-center gap-6 px-6 border-r border-l border-gray-100">
                            <div className="text-sm">
                                <div className="text-gray-400 text-xs mb-0.5">المندوب</div>
                                <p className="font-medium text-gray-700">
                                    {trip.representative?.users?.full_name || 'غير محدد'}
                                </p>
                            </div>
                            <div className="text-sm">
                                <div className="text-gray-400 text-xs mb-0.5">المركبة</div>
                                <p className="font-medium text-gray-700">
                                    {trip.vehicle?.plate_number || 'غير محدد'}
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-3 px-4">
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-0.5">الوزن</div>
                                <p className="font-bold text-sm text-gray-900">
                                    {trip.weight?.toFixed(1) || 0} <span className="text-xs font-normal text-gray-500">كجم</span>
                                </p>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-0.5">الأكياس</div>
                                <p className="font-bold text-sm text-gray-900">
                                    {trip.bags_count || 0}
                                </p>
                            </div>
                        </div>

                        {/* Verification Badges */}
                        <div className="hidden sm:flex items-center gap-1.5">
                            {trip.has_signature && (
                                <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center" title="تم التوقيع">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                            )}
                            {trip.has_photo && (
                                <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center" title="تم التصوير">
                                    <span className="text-xs">📷</span>
                                </div>
                            )}
                            {trip.safety_box_count > 0 && (
                                <div className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-medium">
                                    📦 {trip.safety_box_count}
                                </div>
                            )}
                        </div>

                        {/* Arrow */}
                        <div className="flex-shrink-0 mr-2">
                            <svg 
                                className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transform group-hover:-translate-x-1 transition-all" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default TripList;
