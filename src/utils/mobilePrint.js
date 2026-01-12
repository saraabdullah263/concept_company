// حل محسّن للطباعة على الموبايل
export const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const printOnMobile = (htmlContent, filename = 'document.html') => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
        // للموبايل: استخدام iframe مخفي
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.style.opacity = '0';
            
            document.body.appendChild(iframe);
            
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();
            
            // انتظر تحميل المحتوى
            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        
                        // حذف الـ iframe بعد الطباعة
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                            resolve(true);
                        }, 1000);
                    } catch (e) {
                        console.error('Print error:', e);
                        // في حالة الفشل، افتح في نافذة جديدة
                        fallbackPrint(htmlContent);
                        document.body.removeChild(iframe);
                        reject(e);
                    }
                }, 500);
            };
        });
    } else {
        // للكمبيوتر: استخدام النافذة الجديدة
        return fallbackPrint(htmlContent);
    }
};

const fallbackPrint = (htmlContent) => {
    return new Promise((resolve, reject) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            
            setTimeout(() => {
                printWindow.print();
                resolve(true);
            }, 300);
        } else {
            reject(new Error('Failed to open print window'));
        }
    });
};

// دالة لتحويل HTML إلى Blob للتحميل
export const downloadAsHTML = (htmlContent, filename = 'document.html') => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
