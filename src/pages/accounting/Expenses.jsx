import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import ExpenseList from '../../components/accounting/ExpenseList';
import ExpenseForm from '../../components/accounting/ExpenseForm';
import { Plus, Search, Loader2 } from 'lucide-react';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchExpenses = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (searchTerm) {
                query = query.ilike('description', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [searchTerm]);

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            if (editingExpense) {
                const { error } = await supabase
                    .from('expenses')
                    .update(data)
                    .eq('id', editingExpense.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert([data]);
                if (error) throw error;
            }
            await fetchExpenses();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            try {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
                setExpenses(expenses.filter(e => e.id !== id));
            } catch (error) {
                console.error('Error deleting expense:', error);
                alert('حدث خطأ أثناء الحذف');
            }
        }
    };

    // Calculate Total
    const totalAmount = expenses.reduce((sum, current) => sum + (parseFloat(current.amount) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المصاريف</h1>
                    <p className="text-sm text-gray-500 mt-1">تسجيل ومتابعة مصروفات التشغيل</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={() => handleEdit(null)}
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة مصروف</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <Search className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث في المصاريف..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-brand-50 rounded-xl p-4 border border-brand-100 flex items-center justify-between">
                    <span className="text-brand-800 font-medium">الإجمالي</span>
                    <span className="text-2xl font-bold text-brand-700">{totalAmount.toLocaleString()} <span className="text-sm">ج.م</span></span>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <ExpenseList
                    expenses={expenses}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <ExpenseForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingExpense}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Expenses;
