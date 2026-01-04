import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Search, Loader2, User, Mail, Phone, Shield, Edit, Trash2, X, Calendar } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm] = useState('');

    // Minimal "Add User" Form State (inline for speed)
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone: '', role: 'representative', license_expiry_date: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            let query = supabase.from('users').select('*').order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.ilike('full_name', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [searchTerm]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!window.confirm('تنبيه: إضافة مستخدم جديد ستتطلب منك تسجيل الدخول مرة أخرى بحسابك الحالي (بسبب قيود الأمان). هل تريد المتابعة؟')) {
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Sign Up (Will sign out current user!)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: { full_name: formData.full_name }
                }
            });

            if (authError) throw authError;

            if (authData?.user) {
                // 2. Insert into public.users (If trigger doesn't handle it)
                // Check if trigger exists? Usually safe to upsert
                const { error: dbError } = await supabase.from('users').upsert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.full_name,
                    phone: formData.phone,
                    role: formData.role,
                    is_active: true
                });

                if (dbError) throw dbError;

                // 3. If role is representative, add to representatives table
                if (formData.role === 'representative') {
                    const { error: repError } = await supabase.from('representatives').insert({
                        user_id: authData.user.id,
                        is_available: true,
                        license_expiry_date: formData.license_expiry_date || null
                    });

                    if (repError) {
                        console.error('Error adding to representatives:', repError);
                        // Don't throw - user is created, just log the error
                    }
                }

                alert('تم إنشاء المستخدم بنجاح! سيتم توجيهك لصفحة الدخول الآن.');
                window.location.href = '/login';
            }

        } catch (error) {
            console.error('Error creating user:', error);
            alert('حدث خطأ: ' + error.message);
            setIsSubmitting(false); // Only if failed and didn't redirect
        }
    };

    const handleEditUser = async (user) => {
        setEditingUser(user);
        
        // جلب تاريخ انتهاء الرخصة لو المستخدم مندوب
        let licenseDate = '';
        if (user.role === 'representative') {
            const { data: repData } = await supabase
                .from('representatives')
                .select('license_expiry_date')
                .eq('user_id', user.id)
                .single();
            licenseDate = repData?.license_expiry_date || '';
        }
        
        setFormData({
            email: user.email,
            password: '',
            full_name: user.full_name || '',
            phone: user.phone || '',
            role: user.role || 'representative',
            license_expiry_date: licenseDate
        });
        setShowForm(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsSubmitting(true);
        try {
            const updateData = {
                full_name: formData.full_name,
                phone: formData.phone,
                role: formData.role
            };

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', editingUser.id);

            if (error) throw error;

            // تحديث جدول المندوبين لو الدور اتغير
            if (formData.role === 'representative') {
                // تأكد إنه موجود في جدول المندوبين
                const { data: existingRep } = await supabase
                    .from('representatives')
                    .select('id')
                    .eq('user_id', editingUser.id)
                    .single();

                if (!existingRep) {
                    await supabase.from('representatives').insert({
                        user_id: editingUser.id,
                        is_available: true,
                        license_expiry_date: formData.license_expiry_date || null
                    });
                } else {
                    // تحديث تاريخ انتهاء الرخصة
                    await supabase.from('representatives')
                        .update({ license_expiry_date: formData.license_expiry_date || null })
                        .eq('user_id', editingUser.id);
                }
            }

            alert('✅ تم تحديث بيانات المستخدم بنجاح');
            setShowForm(false);
            setEditingUser(null);
            setFormData({ email: '', password: '', full_name: '', phone: '', role: 'representative', license_expiry_date: '' });
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.full_name}"؟\n\nملاحظة: سيتم تعطيل الحساب فقط ولن يتم حذفه نهائياً.`)) {
            return;
        }

        try {
            // تعطيل المستخدم بدلاً من حذفه
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', user.id);

            if (error) throw error;

            // لو المستخدم مندوب، نعطله في جدول المندوبين كمان
            if (user.role === 'representative') {
                await supabase
                    .from('representatives')
                    .update({ is_available: false })
                    .eq('user_id', user.id);
            }

            alert('✅ تم تعطيل المستخدم بنجاح');
            fetchUsers();
        } catch (error) {
            console.error('Error deactivating user:', error);
            alert('حدث خطأ: ' + error.message);
        }
    };

    const handleActivateUser = async (user) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: true })
                .eq('id', user.id);

            if (error) throw error;

            // لو المستخدم مندوب، نفعله في جدول المندوبين كمان
            if (user.role === 'representative') {
                await supabase
                    .from('representatives')
                    .update({ is_available: true })
                    .eq('user_id', user.id);
            }

            alert('✅ تم تفعيل المستخدم بنجاح');
            fetchUsers();
        } catch (error) {
            console.error('Error activating user:', error);
            alert('حدث خطأ: ' + error.message);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingUser(null);
        setFormData({ email: '', password: '', full_name: '', phone: '', role: 'representative', license_expiry_date: '' });
    };

    const getRoleLabel = (role) => {
        const roles = {
            admin: 'مسؤول',
            logistics_manager: 'مدير تشغيل',
            accountant: 'محاسب',
            supervisor: 'مشرف',
            representative: 'مندوب'
        };
        return roles[role] || role;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المستخدمين</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة الموظفين والصلاحيات</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ email: '', password: '', full_name: '', phone: '', role: 'representative' });
                        setShowForm(!showForm);
                    }}
                >
                    <Plus className="w-5 h-5" />
                    <span>مستخدم جديد</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-100 mb-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">
                            {editingUser ? 'تعديل بيانات المستخدم' : 'بيانات المستخدم الجديد'}
                        </h3>
                        <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            required
                            placeholder="الاسم بالكامل"
                            className="p-2 border rounded"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                        <input
                            required={!editingUser}
                            type="email"
                            placeholder="البريد الإلكتروني"
                            className="p-2 border rounded text-right"
                            dir="ltr"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            disabled={!!editingUser}
                        />
                        {!editingUser && (
                            <input
                                required
                                type="password"
                                placeholder="كلمة المرور"
                                className="p-2 border rounded text-right"
                                dir="ltr"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        )}
                        <input
                            placeholder="رقم الهاتف"
                            className="p-2 border rounded text-right"
                            dir="ltr"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <select
                            className="p-2 border rounded"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value, license_expiry_date: e.target.value !== 'representative' ? '' : formData.license_expiry_date })}
                        >
                            <option value="representative">مندوب (Representative)</option>
                            <option value="logistics_manager">مدير تشغيل (Logistics)</option>
                            <option value="accountant">محاسب (Accountant)</option>
                            <option value="supervisor">مشرف (Supervisor)</option>
                            <option value="admin">مسؤول (Admin)</option>
                        </select>

                        {/* حقل تاريخ انتهاء الرخصة - يظهر فقط للمندوبين */}
                        {formData.role === 'representative' && (
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-600 mb-1">تاريخ انتهاء رخصة القيادة</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={formData.license_expiry_date}
                                    onChange={e => setFormData({ ...formData, license_expiry_date: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'جاري الحفظ...' : (editingUser ? 'حفظ التعديلات' : 'حفظ')}
                            </button>
                        </div>

                        {!editingUser && (
                            <p className="md:col-span-2 text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                                ملاحظة: عملية الإضافة ستتطلب إعادة تسجيل الدخول.
                            </p>
                        )}
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">المستخدم</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">الدور</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">التواصل</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">الحالة</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-900">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                                            {user.full_name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.full_name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {getRoleLabel(user.role)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm">
                                    {user.phone || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {user.is_active ? 'نشط' : 'معطل'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="تعديل"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {user.is_active ? (
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="تعطيل"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleActivateUser(user)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-xs font-medium"
                                                title="تفعيل"
                                            >
                                                تفعيل
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    لا يوجد مستخدمين.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
