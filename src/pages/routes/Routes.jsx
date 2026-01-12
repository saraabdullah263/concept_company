import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import RouteList from '../../components/routes/RouteList';
import RouteForm from '../../components/routes/RouteForm';
import RepresentativeRouteList from '../../components/routes/RepresentativeRouteList';
import { Plus, Search, Loader2, Calendar, X } from 'lucide-react';

const RoutesPage = () => {
    const { userRole, user } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(() => {
        // استرجاع التاريخ المحفوظ من localStorage
        return localStorage.getItem('routes_filter_date') || '';
    });
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [representativeFilter, setRepresentativeFilter] = useState('all');
    const [representativeId, setRepresentativeId] = useState(null);
    const [representatives, setRepresentatives] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);

    // حفظ التاريخ في localStorage عند تغييره
    useEffect(() => {
        if (filterDate) {
            localStorage.setItem('routes_filter_date', filterDate);
        } else {
            localStorage.removeItem('routes_filter_date');
        }
    }, [filterDate]);

    // Get representative ID if user is representative
    useEffect(() => {
        const getRepresentativeId = async () => {
            if (userRole === 'representative' && user) {
                const { data } = await supabase
                    .from('representatives')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                
                if (data) {
                    setRepresentativeId(data.id);
                }
            }
        };
        getRepresentativeId();
    }, [userRole, user]);

    // Fetch representatives list for filter (admin only)
    useEffect(() => {
        const fetchRepresentatives = async () => {
            if (userRole !== 'representative') {
                const { data } = await supabase
                    .from('representatives')
                    .select('id, user_id, users!user_id(full_name)')
                    .order('users(full_name)');
                
                if (data) {
                    setRepresentatives(data);
                }
            }
        };
        fetchRepresentatives();
    }, [userRole]);

    const fetchRoutes = async () => {
        try {
            setLoading(true);

            // Simplified query without joins to avoid schema cache issues
            let query = supabase
                .from('routes')
                .select('*')
                .order('created_at', { ascending: false });

            // إذا كان المستخدم مندوب، اعرض رحلاته فقط
            if (userRole === 'representative' && representativeId) {
                query = query.eq('representative_id', representativeId);
            }

            // Apply Filters
            if (filterDate) {
                query = query.eq('route_date', filterDate);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (typeFilter !== 'all') {
                query = query.eq('route_type', typeFilter);
            }

            // Filter by representative (admin only)
            if (representativeFilter !== 'all' && userRole !== 'representative') {
                query = query.eq('representative_id', representativeFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Fetch related data separately
            if (data && data.length > 0) {
                // Get unique representative IDs
                const repIds = [...new Set(data.map(r => r.representative_id).filter(Boolean))];
                const vehicleIds = [...new Set(data.map(r => r.vehicle_id).filter(Boolean))];
                const incineratorIds = [...new Set(data.map(r => r.incinerator_id).filter(Boolean))];

                // Fetch representatives
                let repsMap = {};
                if (repIds.length > 0) {
                    const { data: reps } = await supabase
                        .from('representatives')
                        .select('id, user_id, users!user_id(full_name)')
                        .in('id', repIds);
                    
                    if (reps) {
                        repsMap = Object.fromEntries(reps.map(r => [r.id, r]));
                    }
                }

                // Fetch vehicles
                let vehiclesMap = {};
                if (vehicleIds.length > 0) {
                    const { data: vehicles } = await supabase
                        .from('vehicles')
                        .select('id, plate_number')
                        .in('id', vehicleIds);
                    
                    if (vehicles) {
                        vehiclesMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
                    }
                }

                // Fetch incinerators
                let incineratorsMap = {};
                if (incineratorIds.length > 0) {
                    const { data: incinerators } = await supabase
                        .from('incinerators')
                        .select('id, name')
                        .in('id', incineratorIds);
                    
                    if (incinerators) {
                        incineratorsMap = Object.fromEntries(incinerators.map(i => [i.id, i]));
                    }
                }

                // Merge data
                const enrichedData = data.map(route => ({
                    ...route,
                    representatives: route.representative_id ? repsMap[route.representative_id] : null,
                    vehicles: route.vehicle_id ? vehiclesMap[route.vehicle_id] : null,
                    incinerators: route.incinerator_id ? incineratorsMap[route.incinerator_id] : null
                }));

                // Fetch stop counts and weights for each route
                const routeIds = data.map(r => r.id);
                const { data: stopsData } = await supabase
                    .from('route_stops')
                    .select('route_id, collection_details')
                    .in('route_id', routeIds);

                if (stopsData) {
                    const stopCounts = {};
                    const totalWeights = {};
                    
                    stopsData.forEach(stop => {
                        stopCounts[stop.route_id] = (stopCounts[stop.route_id] || 0) + 1;
                        // حساب الوزن الكلي = وزن الأكياس + وزن السيفتي بوكس
                        const bagsWeight = parseFloat(stop.collection_details?.total_weight || 0);
                        const safetyBoxWeight = parseFloat(stop.collection_details?.safety_box_weight || 0);
                        totalWeights[stop.route_id] = (totalWeights[stop.route_id] || 0) + bagsWeight + safetyBoxWeight;
                    });

                    enrichedData.forEach(route => {
                        route.stop_count = stopCounts[route.id] || 0;
                        route.total_weight_collected = totalWeights[route.id] || route.total_weight_collected || 0;
                    });
                }

                setRoutes(enrichedData);
            } else {
                setRoutes([]);
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === 'representative' && !representativeId) {
            return; // انتظر حتى يتم جلب representative_id
        }
        fetchRoutes();
    }, [filterDate, statusFilter, typeFilter, representativeFilter, userRole, representativeId]);

    const handleCreate = () => {
        setEditingRoute(null);
        setIsModalOpen(true);
    };

    const handleEdit = async (route) => {
        // منع تعديل الرحلات المكتملة
        if (route.status === 'completed') {
            alert('لا يمكن تعديل خط سير مكتمل');
            return;
        }

        try {
            // Fetch route stops
            const { data: stops, error } = await supabase
                .from('route_stops')
                .select('*')
                .eq('route_id', route.id)
                .order('stop_order', { ascending: true });

            if (error) throw error;

            // Prepare route data for form
            const routeData = {
                route_name: route.route_name || '',
                route_type: route.route_type || 'collection',
                route_date: route.route_date,
                estimated_start_time: route.estimated_start_time || '',
                representative_id: route.representative_id || '',
                vehicle_id: route.vehicle_id || '',
                incinerator_id: route.incinerator_id || '',
                maintenance_details: route.maintenance_details || '',
                stops: (stops || []).map(stop => ({
                    hospital_id: stop.hospital_id,
                    stop_order: stop.stop_order,
                    estimated_arrival: stop.estimated_arrival_time || ''
                }))
            };

            setEditingRoute({ ...route, ...routeData });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching route stops:', error);
            alert('حدث خطأ أثناء تحميل بيانات خط السير');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف خط السير هذا؟')) {
            try {
                const { error } = await supabase.from('routes').delete().eq('id', id);
                if (error) throw error;
                setRoutes(routes.filter(r => r.id !== id));
            } catch (error) {
                console.error('Error deleting route:', error);
                alert('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleSubmit = async (formData) => {
        try {
            const { stops, ...formRouteData } = formData;

            // Only keep valid route columns
            const routeData = {
                route_name: formRouteData.route_name,
                route_type: formRouteData.route_type || 'collection',
                route_date: formRouteData.route_date,
                estimated_start_time: formRouteData.estimated_start_time,
                representative_id: formRouteData.representative_id,
                vehicle_id: formRouteData.vehicle_id,
                incinerator_id: formRouteData.route_type === 'maintenance' ? null : (formRouteData.incinerator_id || null),
                maintenance_details: formRouteData.route_type === 'maintenance' ? formRouteData.maintenance_details : null
            };

            // Remove empty/null values
            Object.keys(routeData).forEach(key => {
                if (routeData[key] === '' || routeData[key] === undefined) {
                    delete routeData[key];
                }
            });

            let routeId;

            if (editingRoute) {
                // Update Route
                const { error: routeError } = await supabase
                    .from('routes')
                    .update(routeData)
                    .eq('id', editingRoute.id);

                if (routeError) throw routeError;
                routeId = editingRoute.id;

                // Delete old stops
                const { error: deleteError } = await supabase
                    .from('route_stops')
                    .delete()
                    .eq('route_id', routeId);

                if (deleteError) throw deleteError;

                // Insert new stops
                if (stops && stops.length > 0) {
                    const stopsToInsert = stops.map((stop, index) => ({
                        route_id: routeId,
                        hospital_id: stop.hospital_id,
                        stop_order: index + 1,
                        estimated_arrival_time: stop.estimated_arrival || null,
                        status: 'pending'
                    }));

                    const { error: stopsError } = await supabase
                        .from('route_stops')
                        .insert(stopsToInsert);

                    if (stopsError) throw stopsError;
                }

            } else {
                // Create Route
                const { data: newRoute, error: routeError } = await supabase
                    .from('routes')
                    .insert([routeData])
                    .select()
                    .single();

                if (routeError) throw routeError;
                routeId = newRoute.id;

                // Create Stops
                if (stops && stops.length > 0) {
                    const stopsToInsert = stops.map((stop, index) => ({
                        route_id: routeId,
                        hospital_id: stop.hospital_id,
                        stop_order: index + 1,
                        estimated_arrival_time: stop.estimated_arrival || null,
                        status: 'pending'
                    }));

                    const { error: stopsError } = await supabase
                        .from('route_stops')
                        .insert(stopsToInsert);

                    if (stopsError) throw stopsError;
                }
            }

            await fetchRoutes();
            setIsModalOpen(false);
            setEditingRoute(null);
            
        } catch (error) {
            console.error('Error saving route:', error);
            alert(`حدث خطأ: ${error.message || 'خطأ غير معروف'}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {userRole === 'representative' ? 'خطوط السير' : 'إدارة خطوط السير'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {userRole === 'representative' ? 'عرض وتحديث خطوط السير الخاصة بك' : 'متابعة خطوط السير والمندوبين'}
                    </p>
                </div>

                {userRole !== 'representative' && (
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                        onClick={handleCreate}
                    >
                        <Plus className="w-5 h-5" />
                        <span>خط سير جديد</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="flex gap-2 flex-1 max-w-xs">
                    <div className="relative flex-1">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="date"
                            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    {filterDate && (
                        <button
                            onClick={() => setFilterDate('')}
                            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 flex items-center justify-center"
                            title="مسح التاريخ"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-48 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                    <option value="all">جميع الحالات</option>
                    <option value="pending">معلقة</option>
                    <option value="in_progress">جارية</option>
                    <option value="completed">مكتملة</option>
                    <option value="cancelled">ملغاة</option>
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full md:w-48 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                    <option value="all">جميع الأنواع</option>
                    <option value="collection">رحلات جمع</option>
                    <option value="maintenance">رحلات صيانة</option>
                </select>

                {/* Representative Filter - Admin Only */}
                {userRole !== 'representative' && (
                    <select
                        value={representativeFilter}
                        onChange={(e) => setRepresentativeFilter(e.target.value)}
                        className="w-full md:w-48 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="all">جميع المندوبين</option>
                        {representatives.map(rep => (
                            <option key={rep.id} value={rep.id}>
                                {rep.users?.full_name || 'غير محدد'}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : userRole === 'representative' ? (
                <RepresentativeRouteList routes={routes} />
            ) : (
                <RouteList
                    routes={routes}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <RouteForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingRoute}
            />
        </div>
    );
};

export default RoutesPage;
