import { describe, expect, it } from '@jest/globals';

import { appSpeech } from './app-speech';
import type { CloudSpeech, CloudSpeechHandlers } from './cloud-speech';
import type { VoiceStatus } from './composer-machine';
import type { SpeechHandlers, SpeechPort } from './speech';
import { TOKEN_KEEP_MS, speechTokens } from './speech-tokens';

function setUp(options: { online?: boolean; permission?: VoiceStatus } = {}) {
  const { online = true, permission = 'ready' } = options;
  const log: string[] = [];
  const state = { online, permission };
  let cloudHandlers: CloudSpeechHandlers | null = null;
  let phoneHandlers: SpeechHandlers | null = null;
  const cloud: CloudSpeech = {
    warm: () => log.push('cloud.warm'),
    start: (handlers) => {
      log.push('cloud.start');
      cloudHandlers = handlers;
    },
    stop: () => log.push('cloud.stop'),
    abort: () => log.push('cloud.abort'),
  };
  const onDevice: SpeechPort = {
    status: () => Promise.resolve('unavailable'),
    ask: () => Promise.resolve('unavailable'),
    start: (language, handlers) => {
      log.push(`phone.start:${language}`);
      phoneHandlers = handlers;
    },
    stop: () => log.push('phone.stop'),
    abort: () => log.push('phone.abort'),
  };
  const speech = appSpeech({
    cloud,
    onDevice,
    permission: () => Promise.resolve(state.permission),
    online: () => state.online,
  });
  const heard: string[] = [];
  const handlers: SpeechHandlers = {
    onHeard: (transcript) => heard.push(`heard:${transcript}`),
    onLevel: () => undefined,
    onEnd: (transcript) => heard.push(`end:${transcript}`),
    onFail: (reason) => heard.push(`fail:${reason}`),
  };
  return {
    log,
    state,
    speech,
    heard,
    handlers,
    cloud: () => cloudHandlers as unknown as CloudSpeechHandlers,
    phone: () => phoneHandlers as unknown as SpeechHandlers,
  };
}

describe('where the app sends a recording', () => {
  it('uses ElevenLabs while the phone is online', () => {
    const app = setUp();

    app.speech.start('vi', app.handlers);
    app.cloud().onHeard('call the dentist');
    app.speech.stop();
    app.cloud().onEnd('Call the dentist.');

    expect(app.log).toEqual(['cloud.start', 'cloud.stop']);
    expect(app.heard).toEqual(['heard:call the dentist', 'end:Call the dentist.']);
  });

  it('uses the phone itself while it is offline, in the app language', () => {
    const app = setUp({ online: false });

    app.speech.start('vi', app.handlers);
    app.phone().onHeard('gọi nha sĩ');
    app.speech.stop();

    expect(app.log).toEqual(['phone.start:vi', 'phone.stop']);
    expect(app.heard).toEqual(['heard:gọi nha sĩ']);
  });

  it('hands over to the phone when ElevenLabs cannot be reached while the person is talking', () => {
    const app = setUp();

    app.speech.start('en', app.handlers);
    app.cloud().onFail();
    app.phone().onEnd('pay rent');
    app.speech.abort();

    expect(app.log).toEqual(['cloud.start', 'phone.start:en', 'phone.abort']);
    expect(app.heard).toEqual(['end:pay rent']);
  });

  it('says nothing was heard, and starts nothing, when ElevenLabs fails after the person let go', () => {
    const app = setUp();

    app.speech.start('en', app.handlers);
    app.speech.stop();
    app.cloud().onFail();

    expect(app.log).toEqual(['cloud.start', 'cloud.stop']);
    expect(app.heard).toEqual(['fail:nothing']);
  });

  it('starts nothing and reports nothing once a recording has been thrown away', () => {
    const app = setUp();

    app.speech.start('en', app.handlers);
    app.speech.abort();
    app.cloud().onFail();
    app.cloud().onEnd('too late');

    expect(app.log).toEqual(['cloud.start', 'cloud.abort']);
    expect(app.heard).toEqual([]);
  });

  it('keeps the microphone on when the phone is offline and cannot transcribe by itself', async () => {
    const app = setUp({ online: false });

    // The phone's own recognition has no say in whether the composer can listen.
    expect(await app.speech.status('vi')).toBe('ready');
    app.speech.start('vi', app.handlers);
    app.phone().onFail('unavailable');

    expect(app.heard).toEqual(['fail:nothing']);
  });

  it('reports a refusal as a refusal, online or not', async () => {
    const app = setUp({ permission: 'refused' });

    expect(await app.speech.status('en')).toBe('refused');
    app.state.online = false;
    app.speech.start('en', app.handlers);
    app.phone().onFail('refused');

    expect(app.heard).toEqual(['fail:refused']);
    expect(app.log).not.toContain('cloud.warm');
  });

  it('gets a pass ahead of time only when it may listen and is online', async () => {
    const app = setUp();
    await app.speech.status('en');
    expect(app.log).toEqual(['cloud.warm']);

    const offline = setUp({ online: false });
    await offline.speech.status('en');
    expect(offline.log).toEqual([]);
  });
});

describe('the passes a recording is opened with', () => {
  function passes() {
    let issued = 0;
    const clock = { now: 0 };
    const tokens = speechTokens(
      () => {
        issued += 1;
        return Promise.resolve(`pass-${issued}`);
      },
      () => clock.now,
    );
    return { tokens, clock, issued: () => issued };
  }

  it('are each used for one recording only', async () => {
    const { tokens, issued } = passes();

    tokens.warm();
    tokens.warm();
    expect(issued()).toBe(1);
    expect(await tokens.take()).toBe('pass-1');
    expect(await tokens.take()).toBe('pass-2');
  });

  it('are not used once they have been held too long', async () => {
    const { tokens, clock } = passes();

    tokens.warm();
    clock.now = TOKEN_KEEP_MS + 1;

    expect(await tokens.take()).toBe('pass-2');
  });

  it('are fetched again when the one fetched ahead failed', async () => {
    let calls = 0;
    const tokens = speechTokens(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve('pass-2');
    });

    tokens.warm();

    expect(await tokens.take()).toBe('pass-2');
  });
});
