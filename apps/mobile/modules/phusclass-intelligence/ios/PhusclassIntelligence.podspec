require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PhusclassIntelligence'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'UNLICENSED'
  s.author         = "Phu's Class"
  s.homepage       = 'https://phusclass.com'
  # The lowest system this code compiles for, not the app's minimum version: that is
  # IOS_DEPLOYMENT_TARGET in app.config.ts. The model itself is used only from iOS 26.
  s.platforms      = { ios: '16.4' }
  s.swift_version  = '5.9'
  s.source         = { path: '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # FoundationModels does not exist before iOS 26, so it is linked weakly and never autolinked
  # strongly: the app still launches on iOS 17 and the module answers that it is not there.
  s.weak_frameworks = 'FoundationModels'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xfrontend -disable-autolink-framework -Xfrontend FoundationModels',
  }
end
