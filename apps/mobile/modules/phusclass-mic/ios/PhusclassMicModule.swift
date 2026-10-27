import AVFoundation
import ExpoModulesCore

/// The microphone for JavaScript (modules/phusclass-mic/index.ts) while a task is said: 16 kHz mono
/// 16-bit PCM in base64 chunks of 100 ms (`onAudio`), how loud the voice is about 25 times a
/// second (`onLevel`, 0 to 1), and `onStop` when iOS took the microphone away (a call, Siri,
/// another app, a headset change). Nothing is written to disk or kept.
public class PhusclassMicModule: Module {
  private let engine = AVAudioEngine()
  private let lock = NSLock()
  private var pending = Data()
  private var loudest: Float = 0
  private var levelSentAt: CFTimeInterval = 0
  private var running = false
  private var observers: [NSObjectProtocol] = []

  /// What the transcriber takes: 16 kHz, mono, Int16.
  private static let sampleRate: Double = 16_000
  /// 100 ms of audio at 2 bytes a sample.
  private static let chunkBytes = 3_200
  /// The level goes out no more often than this, the loudest moment since the last one.
  private static let levelEvery: CFTimeInterval = 0.04
  /// The quiet end and the loud end of the level, in dBFS, on the raw (measurement) input.
  private static let quietDb: Float = -55
  private static let loudDb: Float = -18

  public func definition() -> ModuleDefinition {
    Name("PhusclassMic")

    Events("onAudio", "onLevel", "onStop")

    AsyncFunction("permission") { () -> String in
      switch AVAudioApplication.shared.recordPermission {
      case .granted: return "granted"
      case .denied: return "denied"
      default: return "undetermined"
      }
    }

    AsyncFunction("ask") { (promise: Promise) in
      AVAudioApplication.requestRecordPermission { granted in promise.resolve(granted) }
    }

    AsyncFunction("start") { [weak self] in
      try self?.begin()
    }.runOnQueue(.main)

    AsyncFunction("stop") { [weak self] in
      self?.end(reason: nil)
    }.runOnQueue(.main)

    OnDestroy { [weak self] in
      DispatchQueue.main.async { self?.end(reason: nil) }
    }
  }

  private func begin() throws {
    if running { return }
    let session = AVAudioSession.sharedInstance()
    // Recording only, with no processing in the way of the transcriber. A tap still feels like a
    // tap while the microphone is on.
    try session.setCategory(.record, mode: .measurement, options: [])
    try session.setAllowHapticsAndSystemSoundsDuringRecording(true)
    try session.setActive(true, options: .notifyOthersOnDeactivation)

    let input = engine.inputNode
    let inputFormat = input.outputFormat(forBus: 0)
    guard inputFormat.sampleRate > 0,
      let outputFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16, sampleRate: Self.sampleRate, channels: 1, interleaved: true),
      let converter = AVAudioConverter(from: inputFormat, to: outputFormat)
    else {
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
      throw MicUnavailable()
    }
    lock.withLock {
      pending = Data()
      loudest = 0
      levelSentAt = 0
    }

    input.installTap(onBus: 0, bufferSize: 1_024, format: inputFormat) { [weak self] buffer, _ in
      self?.take(buffer, with: converter, into: outputFormat)
    }
    engine.prepare()
    do {
      try engine.start()
    } catch {
      input.removeTap(onBus: 0)
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
      throw error
    }
    running = true
    watch(session)
  }

  /// Resamples one buffer from the microphone, measures it, and sends whole chunks on.
  private func take(
    _ buffer: AVAudioPCMBuffer, with converter: AVAudioConverter, into format: AVAudioFormat
  ) {
    let ratio = format.sampleRate / buffer.format.sampleRate
    let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 16
    guard let output = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return }
    var given = false
    var failure: NSError?
    converter.convert(to: output, error: &failure) { _, status in
      if given {
        status.pointee = .noDataNow
        return nil
      }
      given = true
      status.pointee = .haveData
      return buffer
    }
    guard failure == nil, let samples = output.int16ChannelData, output.frameLength > 0 else {
      return
    }
    let count = Int(output.frameLength)
    let level = Self.level(of: samples[0], count: count)
    let bytes = Data(bytes: samples[0], count: count * 2)
    let now = CACurrentMediaTime()
    var chunks: [Data] = []
    var sendLevel: Float? = nil
    lock.withLock {
      pending.append(bytes)
      while pending.count >= Self.chunkBytes {
        chunks.append(pending.prefix(Self.chunkBytes))
        pending.removeFirst(Self.chunkBytes)
      }
      loudest = max(loudest, level)
      if now - levelSentAt >= Self.levelEvery {
        sendLevel = loudest
        loudest = 0
        levelSentAt = now
      }
    }
    if let sendLevel { sendEvent("onLevel", ["level": sendLevel]) }
    for chunk in chunks {
      sendEvent("onAudio", ["chunk": chunk.base64EncodedString()])
    }
  }

  /// How loud a run of samples is, 0 to 1: its RMS in dBFS between the quiet and the loud end.
  private static func level(of samples: UnsafePointer<Int16>, count: Int) -> Float {
    var sum: Float = 0
    for index in 0..<count {
      let sample = Float(samples[index]) / 32_768
      sum += sample * sample
    }
    let rms = (sum / Float(max(count, 1))).squareRoot()
    let db = 20 * log10(max(rms, 0.000_01))
    return min(1, max(0, (db - quietDb) / (loudDb - quietDb)))
  }

  /// Stops the microphone, sends what is left, and hands the audio session back to other apps.
  private func end(reason: String?) {
    guard running else { return }
    running = false
    for observer in observers { NotificationCenter.default.removeObserver(observer) }
    observers = []
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    let rest = lock.withLock { () -> Data in
      let rest = pending
      pending = Data()
      return rest
    }
    if !rest.isEmpty { sendEvent("onAudio", ["chunk": rest.base64EncodedString()]) }
    sendEvent("onLevel", ["level": 0])
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    if let reason { sendEvent("onStop", ["reason": reason]) }
  }

  private func watch(_ session: AVAudioSession) {
    let center = NotificationCenter.default
    observers.append(
      center.addObserver(
        forName: AVAudioSession.interruptionNotification, object: session, queue: .main
      ) { [weak self] note in
        let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
        if raw == AVAudioSession.InterruptionType.began.rawValue {
          self?.end(reason: "interrupted")
        }
      })
    observers.append(
      center.addObserver(
        forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main
      ) { [weak self] _ in
        self?.end(reason: "interrupted")
      })
    observers.append(
      center.addObserver(
        forName: AVAudioSession.mediaServicesWereResetNotification, object: session, queue: .main
      ) { [weak self] _ in
        self?.end(reason: "interrupted")
      })
  }
}

/// The microphone has no usable input (none attached, or iOS gave it a format of 0 Hz).
struct MicUnavailable: Error, LocalizedError {
  var errorDescription: String? { "The microphone is not available" }
}
