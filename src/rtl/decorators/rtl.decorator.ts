import { SetMetadata } from '@nestjs/common';

export const RTL_SUPPORT_KEY = 'rtl_support';
export const RTLSupport = (enabled: boolean = true) => SetMetadata(RTL_SUPPORT_KEY, enabled);
