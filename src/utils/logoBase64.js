// Logo as base64 - import from logoData.js
import { LOGO_BASE64 } from './logoData';
import { supabase } from '../services/supabase';

// Convert image to base64 from URL
const imageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
};

// Get logo from Supabase Storage
const getLogoFromStorage = async () => {
    try {
        const { data: files, error } = await supabase.storage
            .from('medical-waste')
            .list('company-logo', {
                limit: 1,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (!error && files && files.length > 0) {
            const { data: { publicUrl } } = supabase.storage
                .from('medical-waste')
                .getPublicUrl(`company-logo/${files[0].name}`);
            
            // حفظ في localStorage للاستخدام offline
            localStorage.setItem('customLogo', publicUrl);
            return publicUrl;
        }
    } catch (error) {
        console.error('Error fetching logo from storage:', error);
    }
    return null;
};

export const getLogoBase64 = () => {
    // أولاً: جرب تجيب اللوجو المخصص من localStorage
    const customLogo = localStorage.getItem('customLogo');
    if (customLogo) {
        return customLogo;
    }
    
    // ثانياً: استخدم اللوجو الافتراضي
    return LOGO_BASE64;
};

// Cached logo base64
export const getCachedLogoBase64 = async () => {
    // أولاً: جرب تجيب اللوجو من Supabase Storage
    const storageLogo = await getLogoFromStorage();
    if (storageLogo) {
        return storageLogo;
    }
    
    // ثانياً: جرب localStorage
    const customLogo = localStorage.getItem('customLogo');
    if (customLogo) {
        return customLogo;
    }
    
    // ثالثاً: استخدم اللوجو الافتراضي
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) {
        return LOGO_BASE64;
    }
    
    // Fallback: convert from public/logo.png
    try {
        const base64 = await imageToBase64(`${window.location.origin}/logo.png`);
        return base64;
    } catch {
        return `${window.location.origin}/logo.png`;
    }
};

// Pre-load logo on app start
export const preloadLogo = () => {
    const customLogo = localStorage.getItem('customLogo');
    if (customLogo) {
        return customLogo;
    }
    return LOGO_BASE64;
};
