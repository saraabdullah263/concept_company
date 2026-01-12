import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
    ArrowRight, 
    FileText, 
    Building, 
    Calendar, 
    DollarSign, 
    User, 
    MapPin, 
    Phone,
    Mail,
    Loader2,
    Printer,
    Edit,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileCheck
} from 'lucide-react';
import { generateNewContractPDF } from '../../services/pdfGenerator';

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        fetchContractDetails();
    }, [id]);

    const fetchContractDetails = async () => {
        try {
            setLoading(true);
            
            // جلب بيانات العقد
            const { data: contractData, error: contractError } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', id)
                .single();

            if (contractError) throw contractError;
            setContract(contractData);

            // جلب بيانات العميل
            if (contractData?.hospital_id) {
                const { data: hospitalData } = await supabase
                    .from('hospitals')
                    .select('*')
                    .eq('id', contractData.hospital_id)
                    .single();
                
                setHospital(hospitalData);
            }
        } catch (error) {
            console.error('Error fetching contract:', error);
            alert('حدث خطأ أثناء تحميل بيانات العقد');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        setPrinting(true);
        try {
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
                clientName: hospital?.name || '',
                clientActivity: contract.client_activity || hospital?.activity || '',
                clientAddress: hospital?.detailed_address || hospital?.address || '',
                commercialRegister: contract.commercial_register || hospital?.commercial_register || '',
                taxNumber: contract.tax_number || hospital?.tax_number || '',
                pricePerKg: contract.price_per_kg || '',
                contractFees: contract.contract_fees || '0',
                contractDuration: contract.contract_duration || 'سنة واحدة',
                phoneNumbers: hospital?.contact_mobile || hospital?.contact_phone || '',
                managerName: contract.manager_name || hospital?.manager_name || hospital?.contact_person_name || '',
                minWeight: contract.min_weight || '15',
                minPrice: contract.min_price || '',
                customClauses: customClauses
            });
        } catch (error) {
            console.error('Error printing contract:', error);
            alert('حدث خطأ أثناء طباعة العقد');
        } finally {
            setPrinting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'expired': return 'bg-red-100 text-red-800 border-red-200';
            case 'terminated': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-5 h-5" />;
            case 'expired': return <XCircle className="w-5 h-5" />;
            case 'terminated': return <AlertCircle className="w-5 h-5" />;
            default: return <FileCheck className="w-5 h-5" />;
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">العقد غير موجود</p>
                <Link to="/contracts" className="text-brand-600 hover:underline mt-4 inline-block">
                    العودة للعقود
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/contracts')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowRight className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            عقد {contract.contract_number}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">تفاصيل العقد الكاملة</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        disabled={printing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {printing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Printer className="w-5 h-5" />
                        )}
                        طباعة العقد
                    </button>
                    <Link
                        to={`/contracts`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <Edit className="w-5 h-5" />
                        تعديل
                    </Link>
                </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(contract.status)}`}>
                {getStatusIcon(contract.status)}
                <span className="font-medium">{getStatusText(contract.status)}</span>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* بيانات العميل */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5 text-brand-600" />
                        بيانات العميل
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-500">اسم العميل</label>
                            <p className="text-base font-medium text-gray-900">{hospital?.name || '-'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">نوع الجهة</label>
                                <p className="text-base font-medium text-gray-900">
                                    {hospital?.client_type === 'hospital' ? 'مستشفى' :
                                     hospital?.client_type === 'clinic' ? 'عيادة' :
                                     hospital?.client_type === 'lab' ? 'معمل' :
                                     hospital?.client_type === 'medical_center' ? 'مركز طبي' : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">نشاط العميل</label>
                                <p className="text-base font-medium text-gray-900">{contract.client_activity || hospital?.activity || '-'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">رقم الرخصة</label>
                                <p className="text-base font-medium text-gray-900">{contract.license_number || hospital?.license_number || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">تاريخ انتهاء الرخصة</label>
                                <p className="text-base font-medium text-gray-900">
                                    {contract.license_expiry_date || hospital?.license_expiry_date 
                                        ? format(new Date(contract.license_expiry_date || hospital.license_expiry_date), 'yyyy/MM/dd')
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">السجل التجاري</label>
                                <p className="text-base font-medium text-gray-900">{contract.commercial_register || hospital?.commercial_register || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">الرقم الضريبي</label>
                                <p className="text-base font-medium text-gray-900">{contract.tax_number || hospital?.tax_number || '-'}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                العنوان
                            </label>
                            <p className="text-base font-medium text-gray-900">
                                {hospital?.detailed_address || hospital?.address || '-'}
                            </p>
                            {hospital?.city && hospital?.governorate && (
                                <p className="text-sm text-gray-600">{hospital.city} - {hospital.governorate}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500 flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    المدير المسئول
                                </label>
                                <p className="text-base font-medium text-gray-900">{contract.manager_name || hospital?.manager_name || hospital?.contact_person_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    رقم الهاتف
                                </label>
                                <p className="text-base font-medium text-gray-900 dir-ltr text-right">{hospital?.contact_mobile || hospital?.contact_phone || '-'}</p>
                            </div>
                        </div>

                        {hospital?.contact_email && (
                            <div>
                                <label className="text-sm text-gray-500 flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    البريد الإلكتروني
                                </label>
                                <p className="text-base font-medium text-gray-900 dir-ltr text-right">{hospital.contact_email}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* تفاصيل العقد */}
                <div className="space-y-6">
                    {/* التواريخ */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-600" />
                            التواريخ
                        </h2>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-500">تاريخ البداية</label>
                                <p className="text-base font-medium text-gray-900">
                                    {format(new Date(contract.start_date), 'PPP', { locale: ar })}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">تاريخ النهاية</label>
                                <p className="text-base font-medium text-gray-900">
                                    {format(new Date(contract.end_date), 'PPP', { locale: ar })}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">مدة العقد</label>
                                <p className="text-base font-medium text-gray-900">{contract.contract_duration}</p>
                            </div>
                        </div>
                    </div>

                    {/* الأسعار */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-brand-600" />
                            الأسعار
                        </h2>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-500">سعر الكيلو</label>
                                <p className="text-xl font-bold text-brand-600">{contract.price_per_kg} ج.م</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">رسوم التعاقد</label>
                                <p className="text-base font-medium text-gray-900">{contract.contract_fees || 0} ج.م</p>
                            </div>
                            {contract.min_weight && (
                                <div>
                                    <label className="text-sm text-gray-500">الحد الأدنى للنقلة</label>
                                    <p className="text-base font-medium text-gray-900">{contract.min_weight} كجم</p>
                                </div>
                            )}
                            {contract.min_price && (
                                <div>
                                    <label className="text-sm text-gray-500">الحد الأدنى لسعر النقلة</label>
                                    <p className="text-base font-medium text-gray-900">{contract.min_price} ج.م</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* البنود المخصصة */}
            {contract.custom_clauses && (() => {
                try {
                    const clauses = typeof contract.custom_clauses === 'string' 
                        ? JSON.parse(contract.custom_clauses) 
                        : contract.custom_clauses;
                    
                    if (Array.isArray(clauses) && clauses.length > 0) {
                        return (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-brand-600" />
                                    البنود الإضافية المخصصة
                                </h2>
                                <div className="space-y-4">
                                    {clauses.map((clause, index) => (
                                        <div key={clause.id || index} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                            <h3 className="font-medium text-gray-900 mb-2">
                                                بند إضافي ({index + 1}): {clause.title}
                                            </h3>
                                            <p className="text-gray-700">{clause.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                } catch (e) {
                    return null;
                }
            })()}

            {/* الملاحظات */}
            {contract.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">ملاحظات</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
                </div>
            )}
        </div>
    );
};

export default ContractDetails;
