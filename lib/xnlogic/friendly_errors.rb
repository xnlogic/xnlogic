require "thor"

# Create Thor classes if they don't exist already
module Thor
  class AmbiguousTaskError; end
  class UndefinedTaskError; end
  class Error; end
end

module Xnlogic
  def self.with_friendly_errors
    yield
  rescue Xnlogic::XnlogicError => e
    Xnlogic.ui.error e.message, :wrap => true
    Xnlogic.ui.trace e
    exit e.status_code
  rescue Thor::AmbiguousTaskError => e
    Xnlogic.ui.error e.message
    exit 15
  rescue Thor::UndefinedTaskError => e
    Xnlogic.ui.error e.message
    exit 15
  rescue Thor::Error => e
    Xnlogic.ui.error e.message
    exit 1
  rescue LoadError => e
    raise e unless e.message =~ /cannot load such file -- openssl|openssl.so|libcrypto.so/
    Xnlogic.ui.error "\nCould not load OpenSSL."
    Xnlogic.ui.warn <<-WARN, :wrap => true
      You must recompile Ruby with OpenSSL support or change the sources in your \
      Gemfile from 'https' to 'http'. Instructions for compiling with OpenSSL \
      using RVM are available at http://rvm.io/packages/openssl.
    WARN
    Xnlogic.ui.trace e
    exit 1
  rescue Interrupt => e
    Xnlogic.ui.error "\nQuitting..."
    Xnlogic.ui.trace e
    exit 1
  rescue SystemExit => e
    exit e.status
  rescue Exception => e
    Xnlogic.ui.error <<-ERR, :wrap => true
      Unfortunately, a fatal error has occurred. Please see the XN Logic \
      ZenDesk support pages: https://xnlogic.zendesk.com/hc/en-us
    ERR
    raise e
  end
end

