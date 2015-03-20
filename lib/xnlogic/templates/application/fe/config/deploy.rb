# Load in server configuration as supplied by a server profile configuration file (see deployment/server_profiles)
if !ENV.key?('CONFIG_FILE')
  fail 'CONFIG_FILE environment variable required'
elsif !File.exists?(ENV['CONFIG_FILE'])
  fail "No configuration file found at #{ENV['CONFIG_FILE']}"
else
  load ENV['CONFIG_FILE']
end

require 'xnlogic/deploy'


# DeployConfig is defined in the xnlogic gem.
DeployConfig.apply_cap_config(binding)

# Specific RVM string for managing Puppet; may or may not match the RVM string for the application
set :rvm_type, :system
set :rvm_ruby_string, '2.1.5'

default_run_options[:pty] = true


desc 'Build and deploy these assets'
task :deploy_assets do
  system 'script/build.sh'
  # We tar up the static assets directory
  system 'cd pkg/ && tar -Lczf ../assets.tgz .' # Note the -L to deference symlinks
  upload 'assets.tgz', "/home/#{user}", via: :scp

  # Untar the assets directory
  run "(cd /var/www/xn-assets/ && rm -rf * && mkdir assets && tar -xzf /home/#{user}/assets.tgz -C ./assets/)"
end
