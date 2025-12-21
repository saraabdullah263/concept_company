import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Edit, Trash2, FileText, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const InvoiceList = ({ invoices, onEdit, onDelete }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'paid': return 'تم الدفع';
            case 'pending': return 'معلقة';
            case 'overdue': return 'متأخرة';
            case 'draft': return 'مسودة';
            default: return status;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">رقم الفاتورة</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">العميل (المستشفى)</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">المبلغ الإجمالي</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">تاريخ الاستحقاق</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">الحالة</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-left">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 font-mono text-sm text-brand-600 font-bold">
                                #{invoice.invoice_number || invoice.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-medium text-gray-900">{invoice.hospitals?.name || 'غير محدد'}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-gray-900">{invoice.total_amount?.toLocaleString() || 0}</span> <span className="text-xs text-gray-500">ج.م</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                {invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd', { locale: ar }) : '-'}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                                    {getStatusText(invoice.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-left">
                                <div className="flex items-center justify-end gap-2">
                                    <Link to={`/invoices/${invoice.id}`} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => onEdit(invoice)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(invoice.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {invoices.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>لا توجد فواتير.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default InvoiceList;
