import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FileText, Calendar, Building, DollarSign, Activity, Edit, Trash2, ArrowRight, Printer, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { generateNewContractPDF } from '../../services/pdfGenerator';
import { supabase } from '../../services/supabase';

const ContractList = ({ contracts, onEdit, onDelete }) => {
    const [printingId, setPrintingId] = useState(null);
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'terminated': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active': return 'ساري';
            case 'expired': return 'منتهي';
            case 'terminated': return 'ملغي';
            default: return status;
        }
    };

    const handlePrintContract = async (contract) => {
        setPrintingId(contract.id);
        try {
            // جلب بيانات العميل الكاملة
            const { data: hospital } = await supabase
                .from('hospitals')
                .select('*')
                .eq('id', contract.hospital_id)
                .single();

            // تحويل البنود المخصصة
            let customClauses = [];
            if (contract.custom_clauses) {
                try {
                    customClauses = typeof contract.custom_clauses === 'string' 
                        ? JSON.parse(contract.custom_clauses) 
                        : contract.custom_clauses;
                } catch {
                    customClauses = [];
                }
            }

            await generateNewContractPDF({
                contractNumber: contract.contract_number,
                contractDate: format(new Date(contract.start_date), 'yyyy/MM/dd'),
                startDate: format(new Date(contract.start_date), 'yyyy/MM/dd'),
                endDate: format(new Date(contract.end_date), 'yyyy/MM/dd'),
                clientName: hospital?.name || contract.hospitals?.name || '',
                clientActivity: contract.client_activity || hospital?.activity || '',
                clientAddress: hospital?.address || hospital?.detailed_address || '',
                commercialRegister: contract.commercial_register || hospital?.commercial_register || '',
                taxNumber: contract.tax_number || hospital?.tax_number || '',
                pricePerKg: contract.price_per_kg || '',
                contractFees: contract.contract_fees || '0',
                contractDuration: contract.contract_duration || 'سنة واحدة',
                phoneNumbers: hospital?.contact_phone || hospital?.contact_mobile || '',
                managerName: contract.manager_name || hospital?.manager_name || hospital?.contact_person_name || '',
                minWeight: contract.min_weight || '15',
                minPrice: contract.min_price || '',
                customClauses: customClauses
            });
        } catch (error) {
            console.error('Error printing contract:', error);
            alert('حدث خطأ أثناء طباعة العقد');
        } finally {
            setPrintingId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {contracts.map((contract) => (
                <div key={contract.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">عقد #{contract.id.slice(0, 8)}</h3>
                                <Link to={'/hospitals'} className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    {contract.hospitals?.name || 'مستشفى غير معروف'}
                                </Link>
                            </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                            {getStatusText(contract.status)}
                        </span>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> البداية
                            </span>
                            <span className="font-medium">{format(new Date(contract.start_date), 'yyyy/MM/dd', { locale: ar })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> النهاية
                            </span>
                            <span className="font-medium">{format(new Date(contract.end_date), 'yyyy/MM/dd', { locale: ar })}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                            <span className="text-gray-500 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" /> القيمة/كجم
                            </span>
                            <span className="font-bold text-gray-900">{contract.price_per_kg} ج.م</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePrintContract(contract)}
                            disabled={printingId === contract.id}
                            className="flex-1 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {printingId === contract.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Printer className="w-4 h-4" />
                            )}
                            طباعة
                        </button>
                        <button
                            onClick={() => onEdit(contract)}
                            className="flex-1 py-2 text-sm text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            تعديل
                        </button>
                        <button
                            onClick={() => onDelete(contract.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Add New Card */}
            <button
                onClick={() => onEdit(null)}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-gray-50 transition-all group"
            >
                <div className="p-4 bg-gray-50 rounded-full group-hover:bg-brand-50 mb-3 transition-colors">
                    <FileText className="w-8 h-8" />
                </div>
                <span className="font-medium">إضافة عقد جديد</span>
            </button>
        </div>
    );
};

export default ContractList;
