require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ScootchLiveActivity'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'UNLICENSED'
  s.author         = 'Scootch'
  s.homepage       = 'https://scootch.app'
  # The lowest system this code compiles for (it uses ActivityKit's 16.2 calls unguarded), not the
  # app's minimum version: that is IOS_DEPLOYMENT_TARGET in app.config.ts and may be higher.
  s.platforms      = { ios: '16.4' }
  s.swift_version  = '5.9'
  s.source         = { path: '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit'

  # SessionActivityAttributes.swift in this folder is a symbolic link to
  # targets/_shared/SessionActivityAttributes.swift, the file the widget extension compiles, so the
  # app side and the widget side can never describe two different activities.
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
  }
end
