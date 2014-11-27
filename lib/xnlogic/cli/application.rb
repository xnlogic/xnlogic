require 'pathname'

module Xnlogic
  class CLI::Application
    attr_reader :options, :app_name, :thor, :name, :target

    def initialize(options, app_name, thor)
      @options = options
      @app_name = app_name
      @thor = thor

      @name = app_name.chomp("/") # remove trailing slash if present
      @target = Pathname.pwd.join(name)
    end

    def run
      underscored_name = name.tr('-', '_')
      namespaced_path = name.tr('-', '_')
      constant_name = namespaced_path.split('_').map{|p| p[0..0].upcase + p[1..-1] }.join
      git_user_name = `git config user.name`.chomp
      git_user_email = `git config user.email`.chomp

      opts = {
        :name             => name,
        :underscored_name => underscored_name,
        :namespaced_path  => namespaced_path,
        :constant_name    => constant_name,
        :author           => git_user_name.empty? ? "TODO: Write your name" : git_user_name,
        :email            => git_user_email.empty? ? "TODO: Write your email address" : git_user_email,
      }

      templates = {
        "gitignore.tt" => ".gitignore",
        #"Gemfile.tt" => "Gemfile",
        #"lib/newgem.rb.tt" => "lib/#{namespaced_path}.rb",
        #"lib/newgem/version.rb.tt" => "lib/#{namespaced_path}/version.rb",
        #"LICENSE.txt.tt" => "LICENSE.txt",
        #"newgem.gemspec.tt" => "#{name}.gemspec",
        #"consolerc.tt" => ".consolerc",
        #"Rakefile.tt" => "Rakefile",
        #"README.md.tt" => "README.md",
        #".travis.yml.tt" => ".travis.yml",
        #"rspec.tt" => ".rspec",
        #"spec/spec_helper.rb.tt" => "spec/spec_helper.rb",
        #"spec/newgem_spec.rb.tt" => "spec/#{namespaced_path}_spec.rb"
      }

      templates.each do |src, dst|
        thor.template("application/#{src}", target.join(dst), opts)
      end

      Xnlogic.ui.info "Initializing git repo in #{target}"
      Dir.chdir(target) { `git init`; `git add .` }
    end
  end
end

