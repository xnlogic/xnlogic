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
        :name            => underscored_name,
        :namespaced_path => namespaced_path,
        :constant_name   => constant_name,
        :author          => git_user_name.empty? ? "TODO: Write your name" : git_user_name,
        :email           => git_user_email.empty? ? "TODO: Write your email address" : git_user_email,
      }

      templates = {
        "gitignore.tt" => ".gitignore",
        ".rspec.tt" => ".rspec",
        "Gemfile.tt" => "Gemfile",
        "Readme.md.tt" => "Readme.md",
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
        "spec/gemname/gemname_spec.rb.tt" => "spec/#{namespaced_path}/#{underscored_name}_spec.rb",
      }

      templates.each do |src, dst|
        thor.template("application/#{src}", target.join(dst), opts)
      end

      Xnlogic.ui.info "Initializing git repo in #{target}"
      Dir.chdir(target) { `git init`; `git add .` }
    end
  end
end

