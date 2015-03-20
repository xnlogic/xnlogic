require 'xnlogic/cli/core'

module Xnlogic
  class CLI::Application < CLI::Core
    attr_reader :app_name, :base_name, :name, :root

    def initialize(options, thor)
      super
      @ignore_options = ['up', 'provision']
    end

    def set_name(app_name)
      if File.exists?(options_filename)
        Xnlogic.ui.info "Can not create an application within an application."
        exit 1
      end
      @name = app_name.chomp("/").tr('-', '_') # remove trailing slash if present
      @root = options.fetch('root', @name)
      @app = Pathname.pwd.join(root)
      options['name'] = @name
      self
    end

    def options_filename
      'config/app_options.yaml'
    end

    def options_file
      app + options_filename
    end

    def in_existing_project
      @root = options.fetch('root', '.')
      @app = Pathname.pwd.join(root)
      super()
      @name ||= options['name']
      self
    end

    def show_source(source)
      case options['format']
      when 'bundler'
        Xnlogic.ui.info "source \"#{source}\""
      when 'rubygems'
        Xnlogic.ui.info "gem sources -a #{source}"
      else
        Xnlogic.ui.info source
      end
    end

    def require_key
      unless options['key']
        Xnlogic.ui.info 'You must specify a --key option to generate an application.'
        exit 1
      end
    end

    def application
      require_key
      generate_vm_config if options['vm_config']
      generate_application
      options['application_version'] = Xnlogic::VERSION
      write_options
      Xnlogic.ui.info "Initializing git repo in #{app}"
      Dir.chdir(app) { system 'git init' and system 'git add .' }

      install_vagrant_note
      if options['up']
        Dir.chdir(app) { system 'vagrant up' }
      else
        Xnlogic.ui.info ""
        Xnlogic.ui.info "To start your VM, run the following:"
        Xnlogic.ui.info ""
        Xnlogic.ui.info "cd #{root}"
        Xnlogic.ui.info "xnlogic up"
      end

      if options['provision']
        Dir.chdir(app) { system 'vagrant provision' }
      end

      Xnlogic.ui.info "To begin working with your VM, ssh into it with the following command:"
      Xnlogic.ui.info ""
      Xnlogic.ui.info "cd #{root}"
      Xnlogic.ui.info "xnlogic ssh"
      Xnlogic.ui.info ""
      Xnlogic.ui.info "Once logged in to the server, try the xn-console and xn-server commands"
    end

    def vm_config
      generate_vm_config
      options['vm_config_version'] = Xnlogic::VERSION
      write_options
      install_vagrant_note

      if options['provision'] or options['up']
        Dir.chdir(app) { system 'vagrant up' } if options['up']
        Dir.chdir(app) { system 'vagrant provision' } if options['provision']
      else
        Xnlogic.ui.info ""
        Xnlogic.ui.info "If you have an existing VM that you are updating, run 'xnlogic provision',"
        Xnlogic.ui.info "otherwise, run 'xnlogic up'"
        Xnlogic.ui.info ""
      end
      Xnlogic.ui.info "Once that is done, run 'xnlogic ssh' to log in to the VM."
    end

    def install_vagrant_note
      ver = `vagrant --version` rescue ''
      if ver == ''
        Xnlogic.ui.info ""
        Xnlogic.ui.info "Please ensure that the following dependencies are installed on your computer"
        Xnlogic.ui.info "to continue."
        Xnlogic.ui.info " - Vagrant:    https://www.vagrantup.com/"
        Xnlogic.ui.info " - VirtualBox: https://www.virtualbox.org/wiki/Downloads"
      end
    end


    def update_key(xn_key)
      # Set the option
      options['key'] = xn_key

      # Check that we are in an existing project folder
      in_existing_project

      # Gemerate the necessary templates
      templates = {
        "Gemfile.tt" => "Gemfile",
        "config/vagrant.provision.tt" => "config/vagrant.provision",
        "config/xnlogic.conf.tt" => "config/xnlogic.conf",
      }
      _generate_templates(templates, 'vagrant', template_options, 'Updating configuration')

      # Write the options YAML file
      write_options
    end


    def template_options
      namespaced_path = name
      constant_name = namespaced_path.split('_').map{|p| p[0..0].upcase + p[1..-1] }.join
      git_user_name = `git config user.name`.chomp
      git_user_email = `git config user.email`.chomp
      {
        :name            => name,
        :namespaced_path => namespaced_path,
        :constant_name   => constant_name,
        :author          => git_user_name.empty? ? "TODO: Write your name" : git_user_name,
        :email           => git_user_email.empty? ? "TODO: Write your email address" : git_user_email,
        :vm_cpus         => options['cpus'],
        :vm_memory       => options['memory'],
        :xn_key          => options['key'],
      }
    end


    def ui_alert(ui_message)
      if(not ui_message.nil?)
        Xnlogic.ui.info ""
        Xnlogic.ui.info ui_message
        Xnlogic.ui.info ""
      end
    end

    def _generate_templates(template_src_to_dst, template_folder, opts, ui_message=nil)
      ui_alert ui_message

      template_src_to_dst.each do |src, dst|
        thor.template("#{template_folder}/#{src}", app.join(dst), opts)
      end
    end

    def _copy_libs(libs_src_to_dst, template_folder, opts, ui_message=nil)
      ui_alert ui_message

      libs_src_to_dst.each do |src, dst|
        thor.copy_file("#{template_folder}/#{src}", app.join(dst), opts)
      end
    end


    def generate_vm_config
      base_templates = {
        "Vagrantfile.tt" => "Vagrantfile",
        "Gemfile.tt" => "Gemfile",
        "config/vagrant.provision.tt" => "config/vagrant.provision",
        "config/datomic.conf" => "config/datomic.conf",
        "config/start.sh" => "config/start.sh",
        "config/transactor.properties" => "config/transactor.properties",
        "config/xnlogic.conf.tt" => "config/xnlogic.conf",
      }

      _generate_templates(base_templates, 'vagrant', template_options, 'Creating Vagrant configuration')
    end


    def generate_application
      opts = template_options
      namespaced_path = opts[:namespaced_path]
      templates = {
        "gitignore.tt" => ".gitignore",
        ".rspec.tt" => ".rspec",
        "gemspec.tt" => "#{namespaced_path}.gemspec",
        "Rakefile.tt" => "Rakefile",
        "Readme.md.tt" => "Readme.md",
        "logback.xml.tt" => "logback.xml",
        "config.ru.tt" => "config.ru",
        "dev/console.rb.tt" => "dev/console.rb",
        "tasks/deploy.rb.tt" => "tasks/deploy.rb",
        "torquebox.yml.tt" => "torquebox.yml",
        "torquebox_init.rb.tt" => "torquebox_init.rb",
        "lib/gemname.rb.tt" => "lib/#{namespaced_path}.rb",
        "lib/gemname/version.rb.tt" => "lib/#{namespaced_path}/version.rb",
        "lib/gemname/initializers/inflections.rb.tt" => "lib/#{namespaced_path}/initializers/inflections.rb",
        "lib/gemname/parts/has_notes.rb.tt" => "lib/#{namespaced_path}/parts/has_notes.rb",
        "lib/gemname/parts/note.rb.tt" => "lib/#{namespaced_path}/parts/note.rb",
        "lib/gemname/type/url.rb.tt" => "lib/#{namespaced_path}/type/url.rb",
        "lib/gemname/fixtures.rb.tt" => "lib/#{namespaced_path}/fixtures.rb",
        "lib/gemname/models.rb.tt" => "lib/#{namespaced_path}/models.rb",
        "lib/gemname/permissions.rb.tt" => "lib/#{namespaced_path}/permissions.rb",
        "lib/gemname/type.rb.tt" => "lib/#{namespaced_path}/type.rb",
        "lib/fixtures/sample_fixtures.rb.tt" => "lib/fixtures/sample_fixtures.rb",
        "fe/index.html.tt" => "fe/index.html",
        "fe/Gemfile.tt" => "fe/Gemfile",

        "fe/script/generate_filter_groups.rb.tt" => "fe/script/generate_filter_groups.rb",
        "fe/script/generate_model_actions.rb.tt" => "fe/script/generate_model_actions.rb",
        "fe/script/generate_model_parts.rb.tt" => "fe/script/generate_model_parts.rb",
        "fe/script/generate_search_results.rb.tt" => "fe/script/generate_search_results.rb",

        "fe/assets/javascripts/strings.js.tt" => "fe/assets/javascripts/strings.js",

        "spec/spec_helper.rb.tt" => "spec/spec_helper.rb",
        "spec/gemname/gemname_spec.rb.tt" => "spec/#{namespaced_path}/#{name}_spec.rb",
      }

      libs = {
        "users/xn_infra_admin" => "users/xn_infra_admin",

        "fe/Capfile" => "fe/Capfile",
        "deploy.command" => "deploy.command",
        "fe/deploy.command" => "fe/deploy.command",
        "fe/config/deploy.rb" => "fe/config/deploy.rb",
        "fe/package.json" => "fe/package.json",
        "fe/script/build.sh" => "fe/script/build.sh",
        "fe/script/push_fe.sh" => "fe/script/push_fe.sh",
        "fe/script/server.sh" => "fe/script/server.sh",
        "fe/script/duster" => "fe/script/duster",
        "fe/lib/duster.js" => "fe/lib/duster.js",

        "fe/assets/images/xnlogic-logo-site.png" => "fe/assets/images/xnlogic-logo-site.png",
        "fe/assets/images/xnlogic-logo-site-x2.png" => "fe/assets/images/xnlogic-logo-site-x2.png",
        "fe/assets/javascripts/user_mgmt/index.coffee" => "fe/assets/javascripts/user_mgmt/index.coffee",
        "fe/assets/javascripts/user_mgmt/menu.coffee" => "fe/assets/javascripts/user_mgmt/menu.coffee",
        "fe/assets/templates/.gitkeep" => "fe/assets/templates/.gitkeep",

        "fe/views/layouts/_notifications.erb" => "fe/views/layouts/_notifications.erb",
        "fe/views/layouts/_top_bar.html.erb" => "fe/views/layouts/_top_bar.html.erb",
        "fe/views/layouts/_top_menu.html.erb" => "fe/views/layouts/_top_menu.html.erb",
        "fe/views/layouts/user_mgmt.html.erb" => "fe/views/layouts/user_mgmt.html.erb",
        "fe/views/layouts/application.html.erb" => "fe/views/layouts/application.html.erb",
      }

      _generate_templates(templates, 'application', opts, 'Creating application templates')
      _copy_libs(libs, 'application', opts, 'Copying application libs & binaries')
    end
  end
end

