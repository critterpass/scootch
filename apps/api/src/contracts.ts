// The API's one door to the shared wire contracts. `@phusclass/domain`'s entry point does not
// re-export its contracts folder, so they are reached by path here and nowhere else in the API.
export {
  languageSchema,
  wireErrorSchema,
  type Language,
  type WireError,
  type WireErrorCode,
} from '../../../packages/domain/src/contracts/common';
export {
  hearingTokenResponseSchema,
  type HearingTokenResponse,
} from '../../../packages/domain/src/contracts/hearing';
export {
  screenInputRequestSchema,
  screenInputResponseSchema,
  type ScreenInputResponse,
} from '../../../packages/domain/src/contracts/ai-labels';
export {
  plusCustomerResponseSchema as tuitionCustomerResponseSchema,
  type PlusCustomerResponse as TuitionCustomerResponse,
} from '../../../packages/domain/src/contracts/plus';
