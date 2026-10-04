// Both dictionaries, for server code only (layouts, metadata, actions, receipts).
// Client components must use useT() from @/context/LanguageContext.
import ar from "./i18n/ar.js";
import en from "./i18n/en.js";

export const translations = { ar, en };

export const getTranslations = (lang) => translations[lang] || translations.en;

export { translateCategory } from "./i18n/translate-category.js";
