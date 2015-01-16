require 'xnlogic/cli/core'

module Xnlogic
  class CLI::Application < CLI::Core
    attr_reader :app_name, :base_name, :name, :root

    def set_name(app_name)
      @name = app_name.chomp("/").tr('-', '_') # remove trailing slash if present
      @root = options.fetch('root', @name)
      @app = Pathname.pwd.join(root)
      options['name'] = @name
      self
    end

    def options_file
      app + 'config/app_options.yaml'
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

    def application
      generate_vm_config if options['vm_config']
      generate_application
      write_options
      Xnlogic.ui.info "Initializing git repo in #{app}"
      Dir.chdir(app) { `git init`; `git add .` }

      install_vagrant_note
      Xnlogic.ui.info ""
      Xnlogic.ui.info "To start your VM, run the following:"
      Xnlogic.ui.info ""
      Xnlogic.ui.info "cd #{root}"
      Xnlogic.ui.info "vagrant up"
      Xnlogic.ui.info "vagrant ssh"
      Xnlogic.ui.info ""
      Xnlogic.ui.info "Once logged in to the server, try the xn-console and xn-server commands"
    end

    def vm_config
      generate_vm_config
      write_options
      install_vagrant_note
      Xnlogic.ui.info ""
      Xnlogic.ui.info "If you have an existing VM that you are updating, run 'vagrant provision',"
      Xnlogic.ui.info "otherwise, run 'vagrant up'"
      Xnlogic.ui.info ""
      Xnlogic.ui.info "Once that is done, run 'vagrant ssh' to log in to the VM."
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

    def generate_vm_config
      opts = template_options
      base_templates = {
        "Vagrantfile.tt" => "Vagrantfile",
        "config/vagrant.provision.tt" => "config/vagrant.provision",
        "config/datomic.conf" => "config/datomic.conf",
        "config/transactor.properties" => "config/transactor.properties",
      }

      Xnlogic.ui.info ""
      Xnlogic.ui.info "Creating Vagrant configuration"
      Xnlogic.ui.info ""
      base_templates.each do |src, dst|
        thor.template("vagrant/#{src}", app.join(dst), opts)
      end
    end

    def generate_application
      opts = template_options
      namespaced_path = opts[:namespaced_path]
      templates = {
        "gitignore.tt" => ".gitignore",
        ".rspec.tt" => ".rspec",
        "gemspec.tt" => "#{namespaced_path}.gemspec",
        "Gemfile.tt" => "Gemfile",
        "Rakefile.tt" => "Rakefile",
        "Readme.md.tt" => "Readme.md",
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

        "spec/spec_helper.rb.tt" => "spec/spec_helper.rb",
        "spec/gemname/gemname_spec.rb.tt" => "spec/#{namespaced_path}/#{name}_spec.rb",
      }

      Xnlogic.ui.info ""
      Xnlogic.ui.info "Creating application templates"
      Xnlogic.ui.info ""
      templates.each do |src, dst|
        thor.template("application/#{src}", app.join(dst), opts)
      end
    end
  end
end

