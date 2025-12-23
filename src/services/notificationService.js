import { supabase } from './supabase';

export const notificationService = {
    // جلب جميع الإشعارات للمستخدم الحالي
    async getNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        
        // تحويل is_read إلى read للتوافق مع الكود
        return (data || []).map(n => ({ ...n, read: n.is_read }));
    },

    // جلب الإشعارات غير المقروءة فقط
    async getUnreadNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(n => ({ ...n, read: n.is_read }));
    },

    // عدد الإشعارات غير المقروءة
    async getUnreadCount() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    },

    // تعليم إشعار كمقروء
    async markAsRead(notificationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    // تعليم جميع الإشعارات كمقروءة
    async markAllAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user logged in');
            return;
        }
        
        // أولاً نجيب الإشعارات غير المقروءة
        const { data: unreadNotifs, error: fetchError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_read', false);
            
        if (fetchError) {
            console.error('Error fetching unread notifications:', fetchError);
            throw fetchError;
        }
        
        if (!unreadNotifs || unreadNotifs.length === 0) {
            return true;
        }
        
        // نحدث كل واحد على حدة
        const ids = unreadNotifs.map(n => n.id);
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', ids);

        if (error) {
            console.error('markAllAsRead error:', error);
            throw error;
        }
        
        return true;
    },

    // حذف إشعار
    async deleteNotification(notificationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    // فحص وإنشاء إشعارات للرخص والعقود المنتهية
    async checkExpiringItems() {
        try {
            const { error } = await supabase.rpc('notify_expiring_licenses');
            if (error) {
                console.log('Note: notify_expiring_licenses function may not exist yet');
            }
        } catch (err) {
            console.log('Expiring items check skipped:', err.message);
        }
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
                    // تحويل is_read إلى read
                    const notification = { ...payload.new, read: payload.new.is_read };
                    callback(notification);
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

    // إنشاء إشعار يدوي
    async createNotification(userId, title, message, type = 'general', referenceId = null) {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                related_id: referenceId
            })
            .select()
            .single();

        if (error) throw error;
        return { ...data, read: data.is_read };
    }
};
