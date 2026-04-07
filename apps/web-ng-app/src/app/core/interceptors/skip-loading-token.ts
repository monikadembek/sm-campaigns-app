import { HttpContextToken } from '@angular/common/http';

export const SkipLoadingToken = new HttpContextToken(() => false);
