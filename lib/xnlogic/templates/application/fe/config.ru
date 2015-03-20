require 'rack/cors'
require 'sprockets'
require 'coffee-script' # Explicit requrie, to load coffee in a thread-safe way...
require 'sass' # Explicit requrie, to load sass in a thread-safe way...

use Rack::Cors do
  allow do
    origins '*'
    resource '*', :headers => :any, :methods => [:get, :options]
  end
end

map '/assets' do
  environment = Sprockets::Environment.new
  environment.append_path 'assets/javascripts'
  environment.append_path 'assets/templates'
  environment.append_path 'assets/stylesheets'
  environment.append_path 'assets/stylesheets/baseline'
  # NOTE: When we upgrade to compass-1.0.1 or newer, this is the require:
  # environment.append_path "#{Gem.loaded_specs['compass-core'].full_gem_path}/stylesheets"
  environment.append_path "#{Gem.loaded_specs['compass'].full_gem_path}/frameworks/compass/stylesheets"
  environment.append_path "#{Gem.loaded_specs['animation'].full_gem_path}/stylesheets"
  environment.append_path 'assets/images'
  environment.append_path 'assets/fonts'
  environment.append_path "#{Gem.loaded_specs['xnjs'].full_gem_path}/lib"
  run environment
end
