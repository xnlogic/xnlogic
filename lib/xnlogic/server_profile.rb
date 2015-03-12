# Captures Capistrano-relevant configuration from a server profile.
class DeployConfig
  class << self
    attr_reader :roles, :variables

    def configure(&config_block)
      @roles = {}
      @variables = {}
      instance_eval &config_block
    end

    # config_binding is the binding taken from the Capistrano configuration file
    def apply_cap_config(config_binding)
      roles.each do |role, user|
        config_binding.eval("role #{role.inspect}, #{user.inspect}")
      end
      variables.each do |name, val|
        config_binding.eval("set #{name.inspect}, #{val.inspect}")
      end
    end

    # Setters

    def hostname(hn)
      @roles[:web] = hn
    end

    def api_hostname(hn)
      @variables[:api_hostname] = hn
    end

    def user(u)
      @variables[:user] = u
    end

    def ssl_cert(cert_path)
      @variables[:ssl_cert] = cert
    end

    def nginx_conf(file_path)
      @variables[:nginx_conf] = cert
    end

    def method_missing(symbol, *args)
      # Swallow config settings we don't care about
    end
  end
end

if defined? TorqueBox
  # Monkey patching this to extend the configuration
  class TorqueBox::RemoteDeploy
    def api_hostname(hn)
      # Unused
    end

    def ssl_cert(cert_path)
      # Unused
    end

    def nginx_conf(file_path)
      # Unused
    end
  end

  def server_profile(&config_block)
    DeployConfig.configure(&config_block)
    TorqueBox::RemoteDeploy.configure(&config_block)
  end
else
  def server_profile(&config_block)
    DeployConfig.configure(&config_block)
  end
end

if defined?(Capistrano)
  # Captures Capistrano-relevant configuration from a server profile.
  class CapConfig
    class << self
      attr_reader :roles, :variables

      def configure(&config_block)
        @roles = {}
        @variables = {}
        instance_eval &config_block
      end

      # config_binding is the binding taken from the Capistrano configuration file
      def apply_cap_config(config_binding)
        roles.each do |role, user|
          config_binding.eval("role #{role.inspect}, #{user.inspect}")
        end
        variables.each do |name, val|
          config_binding.eval("set #{name.inspect}, #{val.inspect}")
        end
      end
      alias apply_config apply_cap_config

      # Setters

      def hostname(hn)
        @roles[:web] = hn
      end

      def api_hostname(hn)
        @variables[:api_hostname] = hn
      end

      def user(u)
        @variables[:user] = u
      end

      def method_missing(symbol, *args)
        # Swallow config settings we don't care about
      end
    end
  end

  def configure_server(&config_block)
    CapConfig.configure(&config_block)
  end
else # torquebox remote deployer
  # Monkey patching this to extend the configuration
  class TorqueBox::RemoteDeploy
    def api_hostname(hn)
      # Unused
    end
  end

  def configure_server(&config_block)
    TorqueBox::RemoteDeploy.configure(&config_block)
  end
end

