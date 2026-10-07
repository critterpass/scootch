// The API's one door to the shared wire contracts. `@scootch/domain`'s entry point does not
// re-export its contracts folder, so they are reached by path here and nowhere else in the API.
export {
  languageSchema,
  wireErrorSchema,
  type Language,
  type WireError,
  type WireErrorCode,
} from '../../../packages/domain/src/contracts/common';
export {
  screenInputRequestSchema,
  screenInputResponseSchema,
  type ScreenInputResponse,
} from '../../../packages/domain/src/contracts/ai-labels';
export {
  memberNumberResponseSchema,
  type MemberNumberResponse,
} from '../../../packages/domain/src/contracts/member';
export {
  speechTokenResponseSchema,
  type SpeechTokenResponse,
} from '../../../packages/domain/src/contracts/speech';
export {
  hauntPageIdPattern,
  hauntPageSchema,
  hauntPageShooResponseSchema,
  sendHauntResponseSchema,
  tableInvitePageSchema,
  tableInviteResponseSchema,
  type HauntPage,
  type SendHauntResponse,
  type TableInvitePage,
  type TableInviteResponse,
} from '../../../packages/domain/src/contracts/public-pages';
export {
  classifyCodeResponseSchema,
  friendInvitePageSchema,
  friendsTablesResponseSchema,
  hauntMonsterWordsSchema,
  hauntsWaitingResponseSchema,
  joinTableResponseSchema,
  myTableResponseSchema,
  openTableResponseSchema,
  receivedHauntSchema,
  registerPushTokenRequestSchema,
  TABLE_FREE_SEATS,
  type ClassifyCodeResponse,
  type FriendInvitePage,
  type FriendsTablesResponse,
  type HauntMonsterWords,
  type JoinTableResponse,
  type MyTableResponse,
  type OpenTableResponse,
  type PastedCodeKind,
  type PushTokenKind,
  type ReceivedHaunt,
  type RegisterPushTokenRequest,
} from '../../../packages/domain/src/contracts/together';
