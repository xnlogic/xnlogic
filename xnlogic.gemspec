# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'xnlogic/version'

Gem::Specification.new do |spec|
  spec.name          = "xnlogic"
  spec.version       = Xnlogic::VERSION
  spec.authors       = ["Darrick Wiebe"]
  spec.email         = ["dw@xnlogic.com"]
  spec.summary       = %q{XN Logic command-line tools}
  spec.description   = %q{Build graph applications with XN Logic.}
  spec.homepage      = "https://xnlogic.com"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_dependency 'thor'

  spec.add_development_dependency "bundler", "~> 1.7"
  spec.add_development_dependency "rake", "~> 10.0"
  spec.add_development_dependency 'ronn', '~> 0.7.3' if RUBY_ENGINE == 'ruby'
  spec.add_development_dependency 'xn_gem_release_tasks'
end
