import AVFoundation
import CoreVideo
import ExpoModulesCore
import UIKit

/// The JavaScript side of the video writer (modules/scootch-video-writer/index.ts). The app draws
/// every frame itself and hands over the pictures; this only stitches them into one file.
public class ScootchVideoWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScootchVideoWriter")

    AsyncFunction("writeVideo") {
      (frameUris: [String], framesPerSecond: Double, outputUri: String) async throws -> String in
      try await FrameVideoWriter.write(
        frameUris: frameUris, framesPerSecond: framesPerSecond, outputUri: outputUri)
    }
  }
}

enum FrameVideoError: Error, LocalizedError {
  case noFrames
  case unreadableFrame(String)
  case badOutput(String)
  case cannotWrite(String)

  var errorDescription: String? {
    switch self {
    case .noFrames: return "There are no frames to write"
    case .unreadableFrame(let uri): return "A frame could not be read: \(uri)"
    case .badOutput(let uri): return "The output is not a file address: \(uri)"
    case .cannotWrite(let reason): return "The video could not be written: \(reason)"
    }
  }
}

enum FrameVideoWriter {
  /// Writes the frames, in order, as H.264 in an MP4 file. The size is the first frame's, rounded
  /// down to even numbers, which the encoder needs.
  static func write(frameUris: [String], framesPerSecond: Double, outputUri: String) async throws
    -> String
  {
    guard !frameUris.isEmpty else { throw FrameVideoError.noFrames }
    guard let output = URL(string: outputUri), output.isFileURL else {
      throw FrameVideoError.badOutput(outputUri)
    }
    guard let first = image(at: frameUris[0]) else {
      throw FrameVideoError.unreadableFrame(frameUris[0])
    }
    let width = first.width - first.width % 2
    let height = first.height - first.height % 2
    try? FileManager.default.removeItem(at: output)

    let writer: AVAssetWriter
    do {
      writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    } catch {
      throw FrameVideoError.cannotWrite(error.localizedDescription)
    }
    let input = AVAssetWriterInput(
      mediaType: .video,
      outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
      ])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: input,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
      ])
    guard writer.canAdd(input) else { throw FrameVideoError.cannotWrite("no video input") }
    writer.add(input)
    guard writer.startWriting() else {
      throw FrameVideoError.cannotWrite(writer.error?.localizedDescription ?? "did not start")
    }
    writer.startSession(atSourceTime: .zero)

    let timescale: Int32 = 600
    let frameDuration = CMTime(
      value: CMTimeValue((Double(timescale) / max(1, framesPerSecond)).rounded()),
      timescale: timescale)
    for (index, uri) in frameUris.enumerated() {
      guard let frame = index == 0 ? first : image(at: uri) else {
        writer.cancelWriting()
        throw FrameVideoError.unreadableFrame(uri)
      }
      guard let pool = adaptor.pixelBufferPool,
        let buffer = pixelBuffer(from: frame, width: width, height: height, pool: pool)
      else {
        writer.cancelWriting()
        throw FrameVideoError.cannotWrite("no pixel buffer")
      }
      while !input.isReadyForMoreMediaData {
        try await Task.sleep(nanoseconds: 5_000_000)
      }
      let time = CMTimeMultiply(frameDuration, multiplier: Int32(index))
      guard adaptor.append(buffer, withPresentationTime: time) else {
        writer.cancelWriting()
        throw FrameVideoError.cannotWrite(writer.error?.localizedDescription ?? "a frame was refused")
      }
    }
    input.markAsFinished()
    writer.endSession(
      atSourceTime: CMTimeMultiply(frameDuration, multiplier: Int32(frameUris.count)))
    await writer.finishWriting()
    guard writer.status == .completed else {
      throw FrameVideoError.cannotWrite(writer.error?.localizedDescription ?? "did not finish")
    }
    return output.absoluteString
  }

  private static func image(at uri: String) -> CGImage? {
    guard let url = URL(string: uri), url.isFileURL else { return nil }
    return UIImage(contentsOfFile: url.path)?.cgImage
  }

  /// The picture drawn into a buffer of the video's size, on white: a video has no transparency.
  private static func pixelBuffer(
    from image: CGImage, width: Int, height: Int, pool: CVPixelBufferPool
  ) -> CVPixelBuffer? {
    var made: CVPixelBuffer?
    guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &made) == kCVReturnSuccess,
      let buffer = made
    else { return nil }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard
      let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)
    else { return nil }
    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
  }
}
