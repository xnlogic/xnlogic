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
      def apply_config(config_binding)
        roles.each { |role, user| config_binding.eval("role #{role.inspect}, #{user.inspect}") }
        variables.each { |name, val| config_binding.eval("set #{name.inspect}, #{val.inspect}") }
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

      def method_missing(symbol, *args)
        # Swallow config settings we don't care about
      end
    end
  end

  def server_profile(&config_block)
    CapConfig.configure(&config_block)
  end
else # torquebox remote deployer
  # Monkey patching this to extend the configuration
  class TorqueBox::RemoteDeploy
    def api_hostname(hn)
      # Unused
    end
  end

  def server_profile(&config_block)
    TorqueBox::RemoteDeploy.configure(&config_block)
  end
end
