require 'xnlogic/version'
require 'fileutils'
require 'pathname'

module Xnlogic
  class XnlogicError < StandardError
    def self.status_code(code)
      define_method(:status_code) { code }
    end
  end

  class InvalidOption         < XnlogicError; status_code(15) ; end

  class << self
    def which(executable)
      if File.file?(executable) && File.executable?(executable)
        executable
      elsif ENV['PATH']
        path = ENV['PATH'].split(File::PATH_SEPARATOR).find do |p|
          File.executable?(File.join(p, executable))
        end
        path && File.expand_path(executable, path)
      end
    end
  end
end
