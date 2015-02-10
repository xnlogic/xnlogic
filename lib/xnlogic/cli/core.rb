require 'pathname'
require 'yaml'

module Xnlogic
  class CLI::Core
    attr_reader :options, :thor, :app, :ignore_options

    def initialize(options, thor)
      @ignore_options ||= []
      @options = {}.merge options
      @thor = thor
      @app = Pathname.pwd
    end

    def in_existing_project
      if options_file.exist?
        previous_options = YAML.load_file(options_file.to_s)
        @options = previous_options.merge options
      else
        Xnlogic.ui.info "Not in an existing project. Please run the 'application' command first."
        exit 1
      end
      self
    end

    def write_options
      Dir.mkdir(app.join('config')) unless app.join('config').exist?
      opts = options.clone
      ignore_options.each do |x|
        opts.delete x
      end
      File.open(options_file.to_s, 'w') do |f|
        f.puts YAML.dump opts
      end
    end
  end
end


