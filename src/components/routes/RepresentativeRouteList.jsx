import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, CheckCircle2, PlayCircle, AlertCircle } from 'lucide-react';

const RepresentativeRouteList = ({ routes }) => {
    const navigate = useNavigate();

    if (routes.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    لا توجد رحلات
                </h3>
                <p className="text-gray-500">
                    لم يتم تعيين أي رحلات لك حتى الآن
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {routes.map((route) => (
                <RouteCard key={route.id} route={route} navigate={navigate} />
            ))}
        </div>
    );
};

const RouteCard = ({ route, navigate }) => {
    const isPending = route.status === 'pending';
    const isInProgress = route.status === 'in_progress';
    const isCompleted = route.status === 'completed';

    const getStatusColor = () => {
        if (isCompleted) return 'bg-green-100 text-green-800 border-green-200';
        if (isInProgress) return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    };

    const getStatusIcon = () => {
        if (isCompleted) return <CheckCircle2 className="w-5 h-5" />;
        if (isInProgress) return <PlayCircle className="w-5 h-5" />;
        return <Clock className="w-5 h-5" />;
    };

    const getStatusText = () => {
        if (isCompleted) return 'مكتملة';
        if (isInProgress) return 'جارية';
        return 'معلقة';
    };

    const handleClick = () => {
        navigate(`/routes/${route.id}/execute`);
    };

    return (
        <div
            onClick={handleClick}
            className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-brand-500 hover:shadow-md transition-all cursor-pointer p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {route.route_name || `رحلة ${new Date(route.route_date).toLocaleDateString('ar-EG')}`}
                    </h3>
                    
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(route.route_date).toLocaleDateString('ar-EG')}</span>
                        </div>
                        
                        {route.estimated_start_time && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{route.estimated_start_time}</span>
                            </div>
                        )}

                        {route.vehicles?.plate_number && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{route.vehicles.plate_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span>{getStatusText()}</span>
                </div>
            </div>

            {/* Progress Bar for In Progress Routes */}
            {isInProgress && route.total_weight_collected !== undefined && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>التقدم</span>
                        <span className="font-medium">{route.total_weight_collected} كجم</span>
                    </div>
                </div>
            )}

            {/* Incinerator Info */}
            {route.incinerators?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">المحرقة:</span>
                    <span>{route.incinerators.name}</span>
                </div>
            )}

            {/* Action Hint */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                    {isPending && (
                        <span className="text-gray-600">اضغط لبدء الرحلة</span>
                    )}
                    {isInProgress && (
                        <span className="text-blue-600 font-medium">اضغط للمتابعة</span>
                    )}
                    {isCompleted && (
                        <span className="text-green-600 font-medium">اضغط لعرض التفاصيل</span>
                    )}
                    
                    <span className="text-brand-600">←</span>
                </div>
            </div>
        </div>
    );
};

export default RepresentativeRouteList;
