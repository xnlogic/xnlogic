# xnlogic

Bootstrap your [xnlogic.com](http://xnlogic.com) application with this easy to use executable gem.

![gem install xnlogic](https://raw.githubusercontent.com/wiki/xnlogic/xn-gem-template/gif/readme_header.gif)

## Installation

    $ gem install xnlogic

 
## Usage
 
    $ xnlogic application my_app --key xnuser:xnpassword
    $ cd my_app
    $ vagrant up
    $ vagrant ssh

From the Vagrant VM, you can then: 

    $ xn-server
    $ xn-console

## Development

To execute from your checked out development version, run it as follows:

    ruby -I ~/dev/xnlogic/lib ~/dev/xnlogic/bin/xnlogic vm_config

## Contributing

1. Fork it ( https://github.com/[my-github-username]/xnlogic/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request


## Releasing a new gem to rubygems:

CI is not set up yet, so once you're happy with the release, simply:

    $ rake local_release


