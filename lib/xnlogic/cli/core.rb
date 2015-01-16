require 'pathname'
require 'yaml'

module Xnlogic
  class CLI::Core
    attr_reader :options, :thor, :app

    def initialize(options, thor)
      @options = {}.merge options
      @thor = thor
      @app = Pathname.pwd
    end

    def options_file
      app + 'config/deploy_options.yaml'
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
      File.open(options_file.to_s, 'w') do |f|
        f.puts YAML.dump options
      end
    end
  end
end


