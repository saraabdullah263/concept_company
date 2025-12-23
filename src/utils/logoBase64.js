// Logo as base64 - import from logoData.js
import { LOGO_BASE64 } from './logoData';

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

export const getLogoBase64 = () => {
    return LOGO_BASE64;
};

// Cached logo base64
export const getCachedLogoBase64 = async () => {
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
    return LOGO_BASE64;
};
