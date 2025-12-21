import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { 
    MapPin, Clock, Weight, Camera, PenTool, 
    CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import WeightEntryModal from './WeightEntryModal';
import PhotoUploadModal from './PhotoUploadModal';
import SignatureModal from './SignatureModal';

const RouteStopCard = ({ stop, stopNumber, routeId, isRouteInProgress, currentLocation, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isArriving, setIsArriving] = useState(false);
    const [isDeparting, setIsDeparting] = useState(false);
    
    // Modals
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    const isPending = stop.status === 'pending';
    const isArrived = stop.status === 'arrived';
    const isCollected = stop.status === 'collected';

    const canArrive = isPending && isRouteInProgress;
    const canCollect = isArrived && !stop.weight_collected;
    const canDepart = isArrived && stop.weight_collected && stop.hospital_signature;

    const handleArrive = async () => {
        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            setIsArriving(true);
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('route_stops')
                .update({
                    status: 'arrived',
                    arrival_time: now,
                    arrival_location: currentLocation
                })
                .eq('id', stop.id);

            if (error) throw error;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stop.id,
                event_type: 'arrived_hospital',
                event_time: now,
                location: currentLocation
            });

            await onUpdate();
            setIsExpanded(true);

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ');
        } finally {
            setIsArriving(false);
        }
    };

    const handleDepart = async () => {
        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            setIsDeparting(true);
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('route_stops')
                .update({
                    status: 'collected',
                    departure_time: now,
                    departure_location: currentLocation
                })
                .eq('id', stop.id);

            if (error) throw error;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stop.id,
                event_type: 'departed_hospital',
                event_time: now,
                location: currentLocation
            });

            // Update route total weight
            const { data: allStops } = await supabase
                .from('route_stops')
                .select('weight_collected')
                .eq('route_id', routeId);

            const totalWeight = allStops?.reduce((sum, s) => sum + (parseFloat(s.weight_collected) || 0), 0) || 0;

            await supabase
                .from('routes')
                .update({ total_weight_collected: totalWeight })
                .eq('id', routeId);

            await onUpdate();
            setIsExpanded(false);

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ');
        } finally {
            setIsDeparting(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
            isCollected ? 'border-green-200 bg-green-50/30' :
            isArrived ? 'border-blue-200 bg-blue-50/30' :
            'border-gray-200'
        }`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            isCollected ? 'bg-green-600' :
                            isArrived ? 'bg-blue-600' :
                            'bg-gray-400'
                        }`}>
                            {isCollected ? <CheckCircle2 className="w-6 h-6" /> : stopNumber}
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{stop.hospitals?.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{stop.hospitals?.address}</p>
                            
                            {stop.estimated_arrival_time && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    <span>الوقت المتوقع: {stop.estimated_arrival_time}</span>
                                </div>
                            )}

                            {stop.weight_collected && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-green-700 font-medium">
                                    <Weight className="w-4 h-4" />
                                    <span>{stop.weight_collected} كجم</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {isArrived && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                {/* Arrive Button */}
                {canArrive && (
                    <button
                        onClick={handleArrive}
                        disabled={isArriving || !currentLocation}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isArriving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري التسجيل...</span>
                            </>
                        ) : (
                            <>
                                <MapPin className="w-5 h-5" />
                                <span>وصلت</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && isArrived && (
                <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                    {/* Contact Info */}
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">المسؤول:</span> {stop.hospitals?.contact_person}</p>
                        <p><span className="font-medium">الهاتف:</span> {stop.hospitals?.contact_phone}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setShowWeightModal(true)}
                            disabled={!!stop.weight_collected}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                stop.weight_collected
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                            }`}
                        >
                            <Weight className="w-6 h-6" />
                            <span className="text-xs font-medium">
                                {stop.weight_collected ? 'تم' : 'الوزن'}
                            </span>
                        </button>

                        <button
                            onClick={() => setShowPhotoModal(true)}
                            disabled={!!stop.photo_proof}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                stop.photo_proof
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                            }`}
                        >
                            <Camera className="w-6 h-6" />
                            <span className="text-xs font-medium">
                                {stop.photo_proof ? 'تم' : 'صورة'}
                            </span>
                        </button>

                        <button
                            onClick={() => setShowSignatureModal(true)}
                            disabled={!!stop.hospital_signature}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                stop.hospital_signature
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                            }`}
                        >
                            <PenTool className="w-6 h-6" />
                            <span className="text-xs font-medium">
                                {stop.hospital_signature ? 'تم' : 'توقيع'}
                            </span>
                        </button>
                    </div>

                    {/* Requirements Check */}
                    {!canDepart && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">يجب إكمال:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    {!stop.weight_collected && <li>إدخال الوزن</li>}
                                    {!stop.hospital_signature && <li>التوقيع الإلكتروني</li>}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Depart Button */}
                    {canDepart && (
                        <button
                            onClick={handleDepart}
                            disabled={isDeparting || !currentLocation}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {isDeparting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري المغادرة...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>مغادرة</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            <WeightEntryModal
                isOpen={showWeightModal}
                onClose={() => setShowWeightModal(false)}
                stopId={stop.id}
                routeId={routeId}
                currentLocation={currentLocation}
                onSuccess={onUpdate}
            />

            <PhotoUploadModal
                isOpen={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
                stopId={stop.id}
                routeId={routeId}
                currentLocation={currentLocation}
                onSuccess={onUpdate}
            />

            <SignatureModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                stopId={stop.id}
                routeId={routeId}
                hospitalName={stop.hospitals?.name}
                currentLocation={currentLocation}
                onSuccess={onUpdate}
            />
        </div>
    );
};

export default RouteStopCard;
