require 'thor'

module Xnlogic
  class CLI < Thor
    require 'xnlogic/cli/application'
    require 'xnlogic/cli/deploy'
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


    def self.vm_config_options
      method_option "key", type: :string, banner:
        "You must supply an XN key to be able to download the proprietary dependencies needed to boot your application"
      method_option "cpus", type: :numeric, banner:
        "Number of Virtual CPUs the Development VM should use (default 2)"
      method_option "memory", type: :numeric, banner:
        "Amount of RAM to allow the Development VM to use (default 2048, in MB)"
      method_option "root", type: :string, banner:
        "Optionally specify a different root directory name"
      method_option "provision", type: :boolean, banner:
        "Update the VM with the new provisioning settings"
      method_option "up", type: :boolean, banner:
        "Start the the VM (will provision automatically only on the first run)"
    end

    desc "application [NAME] [OPTIONS]", <<EOD
Creates a skeleton of an XN Logic application.

If rerunning within an existing project, do not specify a name."
EOD
    vm_config_options
    method_option "vm_config", type: :boolean, default: true, banner:
      "Generate VM configuration files"
    method_option "same", type: :boolean, default: false, banner:
      "Use previous config (implies --root .)"
    def application(name = nil)
      app = Application.new(options, self)
      if options['same'] or name.nil?
        app.in_existing_project
      else
        app.set_name(name)
      end
      app.application
    end

    desc "vm_config [OPTIONS]", "Adds Vagrant configuration to the current project"
    vm_config_options
    method_option "name", type: :string, banner:
      "Optionally specify a different project name"
    def vm_config
      Application.new(options, self).in_existing_project.vm_config
    end

    desc "gem_sources [OPTIONS]", "Show the gem source URLs as configured in the current application"
    method_option "key", type: :string, banner:
      "You must supply an XN key to be able to download the proprietary dependencies needed to boot your application"
    method_option "format", type: :string, banner:
      "Optionally specify either bundler or rubygems"
    def gem_sources
      app = Application.new(options, self).in_existing_project
      app.show_source "https://rubygems.org/"
      app.show_source "https://#{app.options['key']}@gems.xnlogic.com/"
    end

    desc "up", "Start the VM (and provision only on the first run)"
    def up
      system 'vagrant up'
    end

    desc "provision", "Update the VM with the current provisioning settings"
    def provision
      system 'vagrant provision'
    end

    desc "ssh", "ssh into the VM"
    def ssh
      exec 'vagrant ssh'
    end

    desc "key XN_KEY", "Set the key (i.e. xn_user:xn_password) for this application."
    def key(xn_key)
      app = Application.new({ 'key' => xn_key }, self)
      app.in_existing_project
      app.write_options
      puts("Updated key.")
    end

    desc "server_profile HOSTNAME [OPTIONS]",
      "Generate a new server profile"
    method_option "ssh_user", type: :string, default: 'deploy', banner:
      "Use a different user account on deploy server"
    method_option "ssh_key", type: :string, default: "#{ENV['HOME']}/.ssh/id_rsa",
      banner: "Use a specific ssh key when connecting to the deploy server"
    method_option "api_hostname", type: :string, banner:
      "Optional distinct API Hostname"
    def server_profile(hostname)
      app = Deploy.new(options, self)
      app.server_profile(hostname)
    end

    desc "version", "Print the version of this command-line tool."
    def version
      puts(Xnlogic::VERSION)
    end


    def self.source_root
      File.expand_path(File.join(File.dirname(__FILE__), 'templates'))
    end

  end
end
