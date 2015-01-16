require 'xnlogic/cli/core'

module Xnlogic
  class CLI::Deploy
    attr_reader :options, :thor, :app

    def initialize(options, thor)
      @options = {}.merge options
      @thor = thor
      @app = Pathname.pwd
    end

    def options_file
      app + 'config/deploy_options.yaml'
    end

    def server_profile(hostname)
      opts = {
        hostname: hostname,
        api_hostname: options.fetch('api_hostname', hostname),
        ssh_user: options['ssh_user'],
        ssh_key:  options['ssh_key']
      }
      base_templates = {
        "server_profiles/profile.rb.tt" => "server_profiles/#{hostname.gsub('.', '_')}.rb",
      }
      Xnlogic.ui.info ""
      Xnlogic.ui.info "Creating server profile for #{ hostname }"
      Xnlogic.ui.info ""
      base_templates.each do |src, dst|
        thor.template("deploy/#{src}", app.join(dst), opts)
      end
    end

  end
end

