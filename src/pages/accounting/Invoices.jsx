import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import InvoiceList from '../../components/accounting/InvoiceList';
import InvoiceForm from '../../components/accounting/InvoiceForm';
import { Plus, Search, Loader2 } from 'lucide-react';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchInvoices = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('invoices')
                .select(`
          *,
          hospitals (name)
        `)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            let filteredData = data || [];
            // Client-side search for simplicity with joins
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                filteredData = filteredData.filter(inv =>
                    inv.invoice_number?.toLowerCase().includes(lowerTerm) ||
                    inv.hospitals?.name?.toLowerCase().includes(lowerTerm)
                );
            }

            setInvoices(filteredData);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [searchTerm]);

    const handleEdit = (invoice) => {
        setEditingInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Clean data - remove joined fields
            const cleanData = {
                invoice_number: data.invoice_number,
                hospital_id: data.hospital_id,
                contract_id: data.contract_id || null,
                invoice_date: data.invoice_date || data.issue_date,
                from_date: data.from_date || null,
                to_date: data.to_date || null,
                total_weight: data.total_weight || null,
                price_per_kg: data.price_per_kg || null,
                subtotal: data.subtotal || null,
                tax: data.tax || null,
                total_amount: data.total_amount,
                status: data.status,
                due_date: data.due_date,
                paid_date: data.paid_date || null,
                payment_method: data.payment_method || null,
                notes: data.notes || null
            };

            if (editingInvoice) {
                const { error } = await supabase
                    .from('invoices')
                    .update(cleanData)
                    .eq('id', editingInvoice.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('invoices')
                    .insert([cleanData]);
                if (error) throw error;
            }
            await fetchInvoices();
            setIsModalOpen(false);
            alert('✅ تم حفظ الفاتورة بنجاح');
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
            try {
                const { error } = await supabase.from('invoices').delete().eq('id', id);
                if (error) throw error;
                setInvoices(invoices.filter(i => i.id !== id));
            } catch (error) {
                console.error('Error deleting invoice:', error);
                alert('حدث خطأ أثناء الحذف');
            }
        }
    };

    // Calculate Stats
    const totalDue = invoices.filter(i => i.status !== 'paid').reduce((sum, curr) => sum + (curr.total_amount || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, curr) => sum + (curr.total_amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الفواتير</h1>
                    <p className="text-sm text-gray-500 mt-1">متابعة المستحقات والتحصيلات</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={() => handleEdit(null)}
                >
                    <Plus className="w-5 h-5" />
                    <span>فاتورة جديدة</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                    <Search className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث برقم الفاتورة أو اسم المستشفى..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 overflow-x-auto text-sm">
                    <div className="flex-1 min-w-[100px] border-l pl-4">
                        <p className="text-gray-500 mb-1">المستحق (Pending)</p>
                        <p className="font-bold text-lg text-yellow-600">{totalDue.toLocaleString()} ج.م</p>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                        <p className="text-gray-500 mb-1">المدفوع (Paid)</p>
                        <p className="font-bold text-lg text-green-600">{totalPaid.toLocaleString()} ج.م</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <InvoiceList
                    invoices={invoices}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <InvoiceForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingInvoice}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Invoices;
