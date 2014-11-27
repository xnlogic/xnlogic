require "bundler/gem_tasks"

require 'xn_gem_release_tasks'
XNGemReleaseTasks.setup PacerModel, 'lib/pacer-model/version.rb'

begin
  require 'ronn'

  namespace :man do
    directory "lib/xnlogic/man"

    Dir["man/*.ronn"].each do |ronn|
      basename = File.basename(ronn, ".ronn")
      roff = "lib/xnlogic/man/#{basename}"

      file roff => ["lib/xnlogic/man", ronn] do
        sh "#{Gem.ruby} -S ronn --roff --pipe #{ronn} > #{roff}"
      end

      file "#{roff}.txt" => roff do
        sh "groff -Wall -mtty-char -mandoc -Tascii #{roff} | col -b > #{roff}.txt"
      end

      task :build_all_pages => "#{roff}.txt"
    end

    desc "Build the man pages"
    task :build => "man:build_all_pages"

    desc "Clean up from the built man pages"
    task :clean do
      rm_rf "lib/xnlogic/man"
    end
  end

rescue LoadError
  namespace :man do
    task(:build) { warn "Install the ronn gem to be able to release!" }
    task(:clean) { warn "Install the ronn gem to be able to release!" }
  end
end
