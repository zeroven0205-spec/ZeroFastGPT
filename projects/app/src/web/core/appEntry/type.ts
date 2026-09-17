export type AppEntryFeatures = {
  showHistory: boolean;
  allowFileUpload: boolean;
  allowVoiceInput: boolean;
  showCitation: boolean;
  showFeedback: boolean;
  allowRegister: boolean;
};

export type AppEntryBrandConfig = {
  name: string;
  description: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  supportUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
};

export type AppEntryConfig = {
  appKey: string;
  appId: string;
  enabled: boolean;
  brand: AppEntryBrandConfig;
  features: AppEntryFeatures;
};

export type AppEntryPublicConfig = Omit<AppEntryConfig, 'appId'>;
