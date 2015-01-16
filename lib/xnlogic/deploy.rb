# xnlogic gem does not require these dependencies itself, they are used by the
# generated app which does require them.
require 'torquebox-rake-support'
require 'torquebox-remote-deployer'

# Monkey patches deploy utils to modify the environment to allow bundler to run successfully.
module TorqueBox
  module DeployUtils
    def self.run_command(cmd)
      puts cmd

      # RUBYOPT has to be unset from the environment so bundler doesn't lose its shit
      env_vars = { 'RUBYOPT' => nil }

      system(env_vars, "#{cmd} 2>&1")
    end

    def self.precompile_assets(app_dir)
      Dir.chdir( app_dir ) do
        jruby_command( "-S bundle exec rake assets:precompile" )
      end
    end
  end
end

# Exposes remote ssh functionality to the world
module TorqueBox
  module RemoteDeployUtils
    def self.exec_cmd(archive_name, cmd, pwd = :staged_app)
      with_config(archive_name) do |config, app_name|
        unless config.local
          puts cmd
          dir =
            case pwd
            when :deployments
              "#{config.torquebox_home}/jboss/standalone/deployments"
            else
              pwd
            end
          ssh_exec(config, "cd #{dir}", "#{cmd}")
        end
      end
    end

    # TorqueboxDeployUtils#do_deploy uploads the knob.yml file with 0600 permissions, which prevents the torquebox user from
    # reading it. This function will change permissions on the file, and then touch the .dodeploy to trigger a deploy.
    def self.change_yml_permissions(archive_name)
      with_config(archive_name) do |config, app_name|
        exec_cmd(archive_name, "chmod g+r #{app_name}-knob.yml", :deployments)
        exec_cmd(archive_name, "touch #{app_name}-knob.yml.dodeploy", :deployments)
      end
    end
  end
end

module Xn
  module DeployUtils
    class << self
      def deploy(options = {}, &post_stage_proc)
        if !ENV.key?('CONFIG_FILE')
          fail 'CONFIG_FILE environment variable required'
        elsif !File.exists?(ENV['CONFIG_FILE'])
          fail "No configuration file found at #{ENV['CONFIG_FILE']}"
        end

        puts "Creating application knob with options #{ options.inspect }"
        path = TorqueBox::DeployUtils.create_archive options
        puts "Archive created: #{path} size: #{File.size(path)}"
        archive_name = TorqueBox::DeployUtils.archive_name
        puts 'Deploying to staging area...'
        puts "  #{ archive_name }"
        TorqueBox::RemoteDeployUtils.stage(archive_name)

        # Give calling Rake task an opportunity to do whatever extra work is required.
        post_stage_proc.call archive_name if post_stage_proc

        puts "Application has been uploaded to /opt/torquebox/current/stage/#{archive_name}"
        puts 'Deployment paused to give you the opportunity to log in and run any necessary rake tasks'
        puts 'Press enter to continue...'
        STDIN.gets

        TorqueBox::RemoteDeployUtils.deploy_from_stage(archive_name)
        TorqueBox::RemoteDeployUtils.change_yml_permissions(archive_name)

        puts 'Deployed!'
      end

    end
  end
end
