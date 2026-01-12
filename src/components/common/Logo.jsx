import { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import { supabase } from '../../services/supabase';

const Logo = ({ className = "h-10 w-auto" }) => {
    const [logoSrc, setLogoSrc] = useState(logo);

    useEffect(() => {
        loadLogo();

        // الاستماع لتغييرات localStorage
        const handleStorageChange = (e) => {
            if (e.key === 'customLogo') {
                setLogoSrc(e.newValue || logo);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const loadLogo = async () => {
        try {
            // جرب localStorage الأول (أسرع)
            const cachedLogo = localStorage.getItem('customLogo');
            if (cachedLogo) {
                setLogoSrc(cachedLogo);
                return;
            }

            // جلب من Supabase Storage
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
                
                setLogoSrc(publicUrl);
                localStorage.setItem('customLogo', publicUrl);
            }
        } catch (error) {
            console.error('Error loading logo:', error);
        }
    };

    return (
        <img src={logoSrc} alt="Concept Eco Care" className={className} />
    );
};

export default Logo;
