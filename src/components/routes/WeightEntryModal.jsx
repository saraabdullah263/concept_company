import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { X, Weight, Loader2 } from 'lucide-react';

const WeightEntryModal = ({ isOpen, onClose, stopId, routeId, currentLocation, onSuccess }) => {
    const [weight, setWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!weight || parseFloat(weight) <= 0) {
            alert('الرجاء إدخال وزن صحيح');
            return;
        }

        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            setIsSubmitting(true);
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('route_stops')
                .update({
                    weight_collected: parseFloat(weight),
                    weight_entry_time: now,
                    weight_entry_location: currentLocation
                })
                .eq('id', stopId);

            if (error) throw error;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stopId,
                event_type: 'weight_entered',
                event_time: now,
                location: currentLocation,
                data: { weight: parseFloat(weight) }
            });

            onSuccess();
            onClose();
            setWeight('');

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في حفظ الوزن');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <Weight className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">إدخال الوزن</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الوزن المجمع (كجم)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="0.00"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !currentLocation}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <span>حفظ</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WeightEntryModal;
