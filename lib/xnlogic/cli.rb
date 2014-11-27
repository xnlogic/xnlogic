require 'thor'

module Xnlogic
  class CLI < Thor
    include Thor::Actions

    def self.start(*)
      super
    rescue Exception => e
      Xnlogic.ui = UI::Shell.new
      raise e
    end

    def initialize(*args)
      super
    rescue UnknownArgumentError => e
      raise InvalidOption, e.message
    ensure
      self.options ||= {}
      Xnlogic.ui = UI::Shell.new(options)
      Xnlogic.ui.level = "debug" if options["verbose"]
    end

    check_unknown_options!(:except => [:config, :exec])

    # Stop parsing of options as soon as an unknown option or a regular argument is encountered. All remaining arguments are passed to the task. This
    # is useful if you have a task that can receive arbitrary additional options, and where those additional options should not be handled by Thor.
    stop_on_unknown_option! :exec

    class_option "no-color", :type => :boolean, :banner => "Disable colorization in output"

    class_option "verbose",  :type => :boolean, :banner => "Enable verbose output mode", :aliases => "-V"

    def help(cli = nil)
      case cli
      when nil       then command = "xnlogic"
      else                command = "xnlogic-#{cli}"
      end

      manpages = %w(
          xnlogic)

      if manpages.include?(command)
        root = File.expand_path("../man", __FILE__)

        if Xnlogic.which("man") && root !~ %r{^file:/.+!/META-INF/jruby.home/.+}
          Kernel.exec "man #{root}/#{command}"
        else
          puts File.read("#{root}/#{command}.txt")
        end
      else
        super
      end
    end

    def self.handle_no_command_error(command, has_namespace = $thor_runner)
      return super unless command_path = Xnlogic.which("xnlogic-#{command}")

      Kernel.exec(command_path, *ARGV[1..-1])
    end

    desc "application NAME [OPTIONS]", "Creates a skeleton for creating an XN Logic application"
    def application(name)
      require 'xnlogic/cli/application'
      Application.new(options, name, self).run
    end
  end
end
