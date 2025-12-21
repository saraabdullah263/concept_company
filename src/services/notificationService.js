import { supabase } from './supabase';

export const notificationService = {
    // جلب جميع الإشعارات للمستخدم الحالي
    async getNotifications() {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data;
    },

    // جلب الإشعارات غير المقروءة فقط
    async getUnreadNotifications() {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('read', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // عدد الإشعارات غير المقروءة
    async getUnreadCount() {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('read', false);

        if (error) throw error;
        return count;
    },

    // تعليم إشعار كمقروء
    async markAsRead(notificationId) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    // تعليم جميع الإشعارات كمقروءة
    async markAllAsRead() {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('read', false);

        if (error) throw error;
    },

    // حذف إشعار
    async deleteNotification(notificationId) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
    },

    // الاشتراك في الإشعارات الجديدة (real-time)
    subscribeToNotifications(userId, callback) {
        const subscription = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return subscription;
    },

    // إلغاء الاشتراك
    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    },

    // إنشاء إشعار يدوي (للاختبار أو للحالات الخاصة)
    async createNotification(userId, title, message, type = 'general', referenceId = null) {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                reference_id: referenceId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
