"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
type LanguageCode = 'zh-HK' | 'zh-CN' | 'en-US';

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string, variables?: Record<string, string | number>) => string;
}

const defaultContext: LanguageContextType = {
    language: 'zh-HK',
    setLanguage: () => { },
    t: (key: string) => key,
};

export const LanguageContext = createContext<LanguageContextType>(defaultContext);

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<LanguageCode>('zh-HK');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        // 嘗試從 localStorage 讀取用戶之前的語系設定
        if (typeof window !== 'undefined') {
            const savedLang = localStorage.getItem('app_language') as LanguageCode;
            if (savedLang && ['zh-HK', 'zh-CN', 'en-US'].includes(savedLang)) {
                setLanguageState(savedLang);
            }
        }
    }, []);

    useEffect(() => {
        // 根據語系動態加載字典檔
        const loadTranslations = async () => {
            try {
                const dict = await import(`../i18n/${language}.json`);
                setTranslations(dict.default || dict);
            } catch (error) {
                console.error(`Failed to load translations for ${language}`, error);
            }
        };
        loadTranslations();
    }, [language]);

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('app_language', lang);
            // Optional: 如果有綁定到資料庫的需求，可以在這裡調用 API 更新 user profile
            // DB_SERVICE.updateUserLanguage(userId, lang);
        }
    };

    const t = (key: string, variables?: Record<string, string | number>): string => {
        let text = translations[key];

        // Fallback 到 key 本身如果找不到翻譯
        if (!text) {
            // 可以在開發環境下 console.warn 提示缺少的翻譯
            return key;
        }

        if (variables) {
            Object.keys(variables).forEach((varKey) => {
                text = text.replace(new RegExp(`{{${varKey}}}`, 'g'), String(variables[varKey]));
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
