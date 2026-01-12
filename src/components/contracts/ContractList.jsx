import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FileText, Calendar, Building, DollarSign, Activity, Edit, Trash2, Eye, Printer, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { generateNewContractPDF } from '../../services/pdfGenerator';
import { supabase } from '../../services/supabase';

const ContractList = ({ contracts, onEdit, onDelete, onRenew }) => {
    const [printingId, setPrintingId] = useState(null);
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'renewal': return 'bg-blue-100 text-blue-800';
            case 'terminated': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active': return 'ساري';
            case 'expired': return 'منتهي';
            case 'renewal': return 'تجديد';
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
        <div className="grid grid-cols-1 gap-4">
            {contracts.map((contract) => (
                <div key={contract.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        
                        {/* Header & Main Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        عقد {contract.contract_number || `#${contract.id.slice(0, 8)}`}
                                    </h3>
                                    <Link to={'/hospitals'} className="text-sm text-gray-500 hover:text-brand-600 flex items-center gap-1">
                                        <Building className="w-4 h-4" />
                                        {contract.hospitals?.name || 'مستشفى غير معروف'}
                                    </Link>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                                    {getStatusText(contract.status)}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>البداية: {format(new Date(contract.start_date), 'yyyy/MM/dd')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>النهاية: {format(new Date(contract.end_date), 'yyyy/MM/dd')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                    <span className="font-bold text-gray-900">{contract.price_per_kg} ج.م/كجم</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Link 
                                to={`/contracts/${contract.id}`} 
                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" 
                                title="عرض التفاصيل"
                            >
                                <Eye className="w-5 h-5" />
                            </Link>
                            {(contract.status === 'expired' || contract.status === 'renewal') && (
                                <button
                                    onClick={() => onRenew(contract)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="تجديد العقد"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => handlePrintContract(contract)}
                                disabled={printingId === contract.id}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="طباعة"
                            >
                                {printingId === contract.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Printer className="w-5 h-5" />
                                )}
                            </button>
                            <button 
                                onClick={() => onEdit(contract)} 
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                title="تعديل"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => onDelete(contract.id)} 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                title="حذف"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {contracts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">لا توجد عقود مطابقة للبحث.</p>
                </div>
            )}
        </div>
    );
};

export default ContractList;
