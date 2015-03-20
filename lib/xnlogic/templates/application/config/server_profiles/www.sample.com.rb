require "xnlogic/server_profile"


server_profile do
  torquebox_home '/opt/torquebox/current'
  hostname 'www.sample.com'
  port '22'
  user 'deploy'
  key "#{ENV['HOME']}/.ssh/id_rsa"
end

