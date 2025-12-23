import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Edit, Trash2, DollarSign, Tag, Calendar, FileText } from 'lucide-react';

const ExpenseList = ({ expenses, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">البند / الوصف</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">المبلغ</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">التصنيف</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900">التاريخ</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-left">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:bg-white group-hover:text-brand-600 transition-colors">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-900">{expense.description || 'بدون وصف'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1 font-bold text-gray-900">
                                    {expense.amount.toLocaleString()} <span className="text-xs text-gray-500 font-normal">ج.م</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    <Tag className="w-3 h-3" />
                                    {expense.category || 'عام'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                {expense.expense_date ? format(new Date(expense.expense_date), 'yyyy-MM-dd', { locale: ar }) : '-'}
                            </td>
                            <td className="px-6 py-4 text-left">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(expense)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(expense.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {expenses.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>لا توجد مصروفات مسجلة.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ExpenseList;
