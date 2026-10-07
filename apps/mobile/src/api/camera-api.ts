import {
  cameraDeskResponseSchema,
  cameraPaperResponseSchema,
  cameraRoomResponseSchema,
  cameraScreenResponseSchema,
  type CameraDeskRequest,
  type CameraDeskResponse,
  type CameraPaperRequest,
  type CameraPaperResponse,
  type CameraRoomRequest,
  type CameraRoomResponse,
  type CameraScreenRequest,
  type CameraScreenResponse,
} from '@scootch/domain';

import type { HttpClient } from './http-client';

/** A line about a ringed thing is a short reply; past this the phone says its own. */
export const CAMERA_LINE_TIMEOUT_MS = 8_000;
/** Reading a page is care-screened and then written about, so it may take a while. */
export const CAMERA_READ_TIMEOUT_MS = 25_000;

/** The camera's routes. None of them takes a photo: names and words only. */
export interface CameraApi {
  desk(request: CameraDeskRequest): Promise<CameraDeskResponse>;
  room(request: CameraRoomRequest): Promise<CameraRoomResponse>;
  paper(request: CameraPaperRequest): Promise<CameraPaperResponse>;
  screen(request: CameraScreenRequest): Promise<CameraScreenResponse>;
}

export function createCameraApi(http: HttpClient): CameraApi {
  return {
    desk: (request) =>
      http.post('/v1/camera/desk', request, (json) => cameraDeskResponseSchema.parse(json), {
        timeoutMs: CAMERA_LINE_TIMEOUT_MS,
      }),
    room: (request) =>
      http.post('/v1/camera/room', request, (json) => cameraRoomResponseSchema.parse(json), {
        timeoutMs: CAMERA_LINE_TIMEOUT_MS,
      }),
    paper: (request) =>
      http.post('/v1/camera/paper', request, (json) => cameraPaperResponseSchema.parse(json), {
        timeoutMs: CAMERA_READ_TIMEOUT_MS,
      }),
    screen: (request) =>
      http.post('/v1/camera/screen', request, (json) => cameraScreenResponseSchema.parse(json), {
        timeoutMs: CAMERA_READ_TIMEOUT_MS,
      }),
  };
}
