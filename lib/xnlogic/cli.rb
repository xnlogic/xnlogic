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

    class_option "color", :type => :boolean, default: true, :banner => "Enable colorization in output"
    class_option "verbose",  :type => :boolean, :banner => "Enable verbose output mode"

    def help(cli = nil)
      case cli
      when nil       then command = "xnlogic"
      else                command = "xnlogic-#{cli}"
      end
      manpages = %w(xnlogic)
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

    desc "application NAME [OPTIONS]", "Creates a skeleton of an XN Logic application"
    method_option "key", type: :string, banner:
      "You must supply an XN key to be able to download the proprietary dependencies needed to boot your application"
    method_option "root", type: :string, banner:
      "Optionally specify a different root directory name"
    method_option "cpus", type: :numeric, default: 2, banner:
      "Number of Virtual CPUs the Development VM should use"
    method_option "memory", type: :numeric, default: 2048, banner:
      "Amount of RAM to allow the Development VM to use (in MB)"
    def application(name)
      require 'xnlogic/cli/application'
      Application.new(options, name, self).run
    end

    def self.source_root
      File.expand_path(File.join(File.dirname(__FILE__), 'templates'))
    end

  end
end
