import { Edit, Trash2, MapPin, Phone, FileText } from 'lucide-react';

const HospitalList = ({ hospitals, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">العميل</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">النوع</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">بيانات التعاقد</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">معلومات الاتصال</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">الموقع</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">الحالة</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {hospitals.map((hospital) => {
                            const clientTypeLabels = {
                                clinic: 'عيادة',
                                lab: 'معمل',
                                hospital: 'مستشفى',
                                medical_center: 'مركز طبي'
                            };
                            
                            return (
                                <tr key={hospital.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{hospital.name}</span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                {hospital.active_contracts_count || 0} عقود نشطة
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                            {clientTypeLabels[hospital.client_type] || 'مستشفى'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-sm">
                                            {hospital.annual_visits_count || hospital.annual_contract_price ? (
                                                <>
                                                    {hospital.annual_visits_count && (
                                                        <div className="flex items-center gap-1 text-gray-700">
                                                            <FileText className="w-3 h-3 text-gray-400" />
                                                            <span className="font-medium">{hospital.annual_visits_count}</span>
                                                            <span className="text-xs text-gray-500">زيارة/سنة</span>
                                                        </div>
                                                    )}
                                                    {hospital.annual_contract_price && (
                                                        <div className="text-xs text-green-700 font-medium mt-1">
                                                            {parseFloat(hospital.annual_contract_price).toLocaleString()} ج.م
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400">لم يتم التحديد</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-sm">
                                            <span className="text-gray-900">{hospital.contact_person_name || hospital.contact_person}</span>
                                            <a href={`tel:${hospital.contact_mobile || hospital.contact_phone}`} className="text-gray-500 hover:text-brand-600 flex items-center gap-1 mt-1">
                                                <Phone className="w-3 h-3" />
                                                {hospital.contact_mobile || hospital.contact_phone}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-sm text-gray-500">
                                            {hospital.governorate && hospital.city ? (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-gray-400" />
                                                        <span className="font-medium">{hospital.governorate} - {hospital.city}</span>
                                                    </div>
                                                    {hospital.detailed_address && (
                                                        <span className="text-xs mt-1 truncate max-w-xs" title={hospital.detailed_address}>
                                                            {hospital.detailed_address}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-start gap-1 max-w-xs truncate">
                                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                                                    <span title={hospital.address}>{hospital.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hospital.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {hospital.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onEdit(hospital)}
                                                className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(hospital.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {hospitals.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    لا توجد عملاء مضافة حتى الآن.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HospitalList;
